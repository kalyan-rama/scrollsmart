import {
  DomainCategory,
  DOMAIN_CATEGORIES,
  DomainLikelihoods,
  PosteriorDistribution,
  ReelItem,
  Stage1Output,
  Stage2Output,
  Stage3Output,
  Stage4Output,
  Stage5StructuredOutput,
  PipelineTrace,
  SessionState,
  ConfidenceLevel,
  MMRCandidate,
  CriticReview,
  EngagementSignals,
} from './types';
import { generateJSON, getEmbedding, cosineSimilarity } from './llmClient';
import { vectorSearch, getCuratedReels } from './db';

// Stage 1 Prompt Generator
export async function runStage1AIUnderstanding(reel: ReelItem): Promise<Stage1Output> {
  const prompt = `Analyze this watched Reel from a student's social feed and extract their latent underlying technical/career signal.
Reason carefully about viewer psychology, subconscious career intent, and identity, rather than just matching surface keywords.

Watched Reel:
- Title: "${reel.title}"
- Format: "${reel.format}"
- Category: "${reel.category}"
- Description: "${reel.description}"
- Tags: ${JSON.stringify(reel.tags)}

Return a JSON object with this exact schema:
{
  "surface_topic": "concise description of visible topic",
  "format": "${reel.format}",
  "underlying_signal": "1-2 sentences on what watching this suggests about the viewer's implicit interest, anxiety, career stage, or technical identity",
  "domain_likelihoods": {
    "AI": 0.0,
    "DSA": 0.0,
    "Java": 0.0,
    "HLD": 0.0,
    "Cybersecurity": 0.0,
    "Cloud": 0.0,
    "Hardware": 0.0,
    "Career": 0.0
  }
}

CRITICAL RULES:
- The 8 values in "domain_likelihoods" MUST be non-negative and sum to 1.0 (or ~1.0).
- Example: A Java compiler joke or LeetCode interview meme is often a strong signal of general "Career" / "Software Engineering culture", "Java", or "DSA", not purely a surface keyword.
- CONTROL / ENTERTAINMENT ITEMS: If the reel is purely sports, celebrity, or non-technical lifestyle entertainment (e.g. Cristiano Ronaldo football highlights), it provides minimal or zero technical signal. In such cases, output a flat, near-uniform distribution (~0.125 for all domains) so that the student's Bayesian interest posterior remains stable without false tech assumptions.`;

  const fallbackHeuristic = (): Stage1Output => {
    const likelihoods: DomainLikelihoods = {
      AI: 0.05,
      DSA: 0.05,
      Java: 0.05,
      HLD: 0.05,
      Cybersecurity: 0.05,
      Cloud: 0.05,
      Hardware: 0.05,
      Career: 0.05,
    };

    const titleLower = reel.title.toLowerCase();
    const descLower = reel.description.toLowerCase();

    if (titleLower.includes('fast shipping') || titleLower.includes('moving fast') || titleLower.includes('shipping')) {
      likelihoods.Career = 0.60;
      likelihoods.Cloud = 0.15;
      likelihoods.HLD = 0.15;
      likelihoods.DSA = 0.05;
    } else if (titleLower.includes('static typed') || titleLower.includes('java')) {
      likelihoods.Java = 0.45;
      likelihoods.Career = 0.30;
      likelihoods.DSA = 0.10;
    } else if (titleLower.includes('day in my life') || titleLower.includes('startup') || titleLower.includes('swe')) {
      likelihoods.Career = 0.65;
      likelihoods.Cloud = 0.10;
      likelihoods.HLD = 0.10;
    } else if (titleLower.includes('interviewer') || titleLower.includes('linked list') || titleLower.includes('leetcode')) {
      likelihoods.DSA = 0.55;
      likelihoods.Career = 0.30;
      likelihoods.Java = 0.05;
    } else if (titleLower.includes('macbook') || titleLower.includes('thinkpad') || titleLower.includes('coding')) {
      likelihoods.Hardware = 0.40;
      likelihoods.Career = 0.35;
      likelihoods.Cloud = 0.10;
    } else if (titleLower.includes('ronaldo') || titleLower.includes('goals')) {
      // Entertainment control item: uniform / flat distribution
      return {
        surface_topic: 'Football sports highlights',
        format: 'lifestyle',
        underlying_signal: 'Casual leisure consumption; weak technical signal, preserving existing session priors.',
        domain_likelihoods: {
          AI: 0.125,
          DSA: 0.125,
          Java: 0.125,
          HLD: 0.125,
          Cybersecurity: 0.125,
          Cloud: 0.125,
          Hardware: 0.125,
          Career: 0.125,
        },
      };
    } else if (titleLower.includes('iphone') || titleLower.includes('leak')) {
      likelihoods.Hardware = 0.45;
      likelihoods.Cybersecurity = 0.15;
      likelihoods.AI = 0.15;
    } else if (titleLower.includes('postgres')) {
      likelihoods.Cloud = 0.45;
      likelihoods.HLD = 0.30;
      likelihoods.AI = 0.10;
    } else if (titleLower.includes('kubernetes')) {
      likelihoods.Cloud = 0.55;
      likelihoods.HLD = 0.25;
    } else {
      likelihoods.Career = 0.35;
      likelihoods.AI = 0.25;
    }

    // Normalize
    const sum = Object.values(likelihoods).reduce((a, b) => a + b, 0);
    for (const key of DOMAIN_CATEGORIES) {
      likelihoods[key] = Number((likelihoods[key] / sum).toFixed(4));
    }

    return {
      surface_topic: reel.title,
      format: reel.format,
      underlying_signal: `Viewer engagement with ${reel.title} reveals implicit orientation towards ${reel.category} and software engineering career progression.`,
      domain_likelihoods: likelihoods,
    };
  };

  try {
    const res = await generateJSON<Stage1Output>(
      prompt,
      {
        systemInstruction:
          'You are a senior behavioral data scientist specializing in short-form content recommendation engines and latent user interest discovery.',
        temperature: 0.2,
      },
      fallbackHeuristic
    );

    const raw = res.data;
    const likelihoods: DomainLikelihoods = {
      AI: Math.max(0.01, Number(raw.domain_likelihoods?.AI || 0.01)),
      DSA: Math.max(0.01, Number(raw.domain_likelihoods?.DSA || 0.01)),
      Java: Math.max(0.01, Number(raw.domain_likelihoods?.Java || 0.01)),
      HLD: Math.max(0.01, Number(raw.domain_likelihoods?.HLD || 0.01)),
      Cybersecurity: Math.max(0.01, Number(raw.domain_likelihoods?.Cybersecurity || 0.01)),
      Cloud: Math.max(0.01, Number(raw.domain_likelihoods?.Cloud || 0.01)),
      Hardware: Math.max(0.01, Number(raw.domain_likelihoods?.Hardware || 0.01)),
      Career: Math.max(0.01, Number(raw.domain_likelihoods?.Career || 0.01)),
    };

    const sum = Object.values(likelihoods).reduce((a, b) => a + b, 0);
    for (const key of DOMAIN_CATEGORIES) {
      likelihoods[key] = Number((likelihoods[key] / sum).toFixed(4));
    }

    return {
      surface_topic: raw.surface_topic || reel.title,
      format: raw.format || reel.format,
      underlying_signal:
        raw.underlying_signal ||
        `Viewer exhibits latent interest in software engineering craft and technical foundations.`,
      domain_likelihoods: likelihoods,
    };
  } catch (err) {
    return fallbackHeuristic();
  }
}

export interface RawEngagementInput {
  watch_pct?: number;
  watchPct?: number;
  completed?: boolean;
  liked?: boolean;
  commented?: boolean;
  shared?: boolean;
  saved?: boolean;
  skipped?: boolean;
  replayed?: boolean;
  watch_duration?: number;
  watchDuration?: number;
}

// Compute normalized engagement signals between -1.0 and +1.0
export function computeEngagementSignals(input?: RawEngagementInput): EngagementSignals {
  const watchPct = Math.max(
    0,
    Math.min(1.0, Number(input?.watch_pct !== undefined ? input.watch_pct : input?.watchPct !== undefined ? input.watchPct : 1.0))
  );
  const completed = Boolean(input?.completed || watchPct >= 0.95);
  const liked = Boolean(input?.liked);
  const commented = Boolean(input?.commented);
  const shared = Boolean(input?.shared);
  const saved = Boolean(input?.saved);
  const replayed = Boolean(input?.replayed);
  const isSkipExplicit = Boolean(input?.skipped);
  const isIntentional = liked || commented || shared || saved;
  const skipped = isSkipExplicit || (!completed && !isIntentional && watchPct < 0.50);

  let raw = 0;

  // Watch completion vs partial watch
  if (completed) {
    raw += 0.30;
  } else if (watchPct >= 0.75) {
    raw += 0.15;
  } else if (watchPct >= 0.45) {
    raw += 0.10;
  } else if (watchPct >= 0.20) {
    raw += 0.05;
  }

  // Active intentional interactions
  if (liked) raw += 0.15;
  if (commented) raw += 0.15;
  if (shared) raw += 0.20;
  if (saved) raw += 0.20;
  if (replayed) raw += 0.20;

  // Skip / negative signal penalty
  if (skipped) {
    if (watchPct < 0.15) {
      raw -= 0.30; // Not interested / fast bounce
    } else if (watchPct < 0.40) {
      raw -= 0.20; // Fast skip
    } else {
      raw -= 0.10; // Partial skip
    }
  }

  // Normalized engagement score bounded strictly between -1.0 and +1.0
  const engagement_score = Math.max(-1.0, Math.min(1.0, Number(raw.toFixed(3))));

  // Human readable summary
  const actions: string[] = [`${Math.round(watchPct * 100)}% watched`];
  if (liked) actions.push('Liked');
  if (saved) actions.push('Saved');
  if (shared) actions.push('Shared');
  if (commented) actions.push('Commented');
  if (replayed) actions.push('Replayed');
  if (skipped && !isIntentional) actions.push('Skipped');

  let intensity = 'Moderate engagement';
  if (engagement_score >= 0.50) intensity = 'Strong interest detected';
  else if (engagement_score >= 0.20) intensity = 'Positive engagement';
  else if (engagement_score >= 0.0) intensity = 'Mild engagement';
  else if (engagement_score <= -0.15) intensity = 'Low engagement';

  const human_summary = `${intensity}: ${actions.join(' · ')}`;
  const engagement_multiplier = Number((1.0 + engagement_score * 1.2).toFixed(3));

  return {
    watch_pct: watchPct,
    completed,
    liked,
    commented,
    shared,
    saved,
    skipped,
    replayed,
    engagement_score,
    watch_duration: input?.watch_duration || input?.watchDuration || 0,
    human_summary,
    engagement_multiplier,
  };
}

// Stage 2: Bayesian Posterior Update with Semantic Likelihood & Viewer Engagement
export function runStage2BayesianUpdate(
  prior: PosteriorDistribution,
  semanticLikelihood: DomainLikelihoods,
  engagementInput?: RawEngagementInput | EngagementSignals
): Stage2Output {
  const signals: EngagementSignals =
    engagementInput && 'human_summary' in engagementInput
      ? (engagementInput as EngagementSignals)
      : computeEngagementSignals(engagementInput);

  const engagementScore = signals.engagement_score;
  const uniformVal = 0.125;

  // 1. Separate Content meaning from Viewer behavior:
  // Calculate adjusted_likelihood = semantic_likelihood * engagement_multiplier
  const adjustedLikelihood: DomainLikelihoods = {} as any;

  if (engagementScore > 0) {
    // Positive engagement: Sharpen and amplify the evidence from the Reel
    const exponent = 1.0 + engagementScore * 1.4;
    let sumExp = 0;
    const unnorm: Record<DomainCategory, number> = {} as any;

    for (const domain of DOMAIN_CATEGORIES) {
      const sem = Math.max(0.005, semanticLikelihood[domain] || uniformVal);
      const val = Math.pow(sem, exponent);
      unnorm[domain] = val;
      sumExp += val;
    }

    for (const domain of DOMAIN_CATEGORIES) {
      adjustedLikelihood[domain] = Number((unnorm[domain] / sumExp).toFixed(4));
    }
  } else if (engagementScore < 0) {
    // Weak engagement or Fast skip: Attenuate toward uniform prior so disinterest doesn't reinforce the topic
    const attenuation = Math.max(0.05, 1.0 - Math.abs(engagementScore) * 2.0);
    let sumAtt = 0;
    const unnorm: Record<DomainCategory, number> = {} as any;

    for (const domain of DOMAIN_CATEGORIES) {
      const sem = semanticLikelihood[domain] || uniformVal;
      const val = sem * attenuation + uniformVal * (1.0 - attenuation);
      unnorm[domain] = val;
      sumAtt += val;
    }

    for (const domain of DOMAIN_CATEGORIES) {
      adjustedLikelihood[domain] = Number((unnorm[domain] / sumAtt).toFixed(4));
    }
  } else {
    // Neutral engagement: use semantic likelihood directly
    for (const domain of DOMAIN_CATEGORIES) {
      adjustedLikelihood[domain] = Number((semanticLikelihood[domain] || uniformVal).toFixed(4));
    }
  }

  // 2. Perform Bayesian posterior update: posterior_new[d] = posterior_old[d] * adjusted_likelihood[d]
  const epsilon = 0.005;
  const unnormalized: Record<DomainCategory, number> = {} as any;
  let totalMass = 0;

  for (const domain of DOMAIN_CATEGORIES) {
    const priorVal = Math.max(epsilon, prior[domain] || uniformVal);
    const likeVal = Math.max(epsilon, adjustedLikelihood[domain] || uniformVal);
    const prod = priorVal * likeVal;
    unnormalized[domain] = prod;
    totalMass += prod;
  }

  // Normalize across all 8 domains
  const posterior: PosteriorDistribution = {} as any;
  for (const domain of DOMAIN_CATEGORIES) {
    posterior[domain] = Number((unnormalized[domain] / totalMass).toFixed(4));
  }

  // Calculate Shannon Entropy: H = - sum(p * log2(p))
  let entropy = 0;
  for (const domain of DOMAIN_CATEGORIES) {
    const p = posterior[domain];
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  // Sort domains by probability
  const sorted = [...DOMAIN_CATEGORIES].sort((a, b) => posterior[b] - posterior[a]);
  const maxDomain = sorted[0];
  const maxProbability = posterior[maxDomain];
  const secondDomain = sorted[1];
  const secondProb = posterior[secondDomain];

  // Determine Confidence based on entropy / mass concentration
  let confidence: ConfidenceLevel = 'Low';
  if (maxProbability >= 0.45 || entropy < 2.1) {
    confidence = 'High';
  } else if (maxProbability >= 0.28 || (maxProbability >= 0.22 && maxProbability - secondProb > 0.08)) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  const dominantDomains: DomainCategory[] = [maxDomain];
  if (secondProb >= 0.20 || maxProbability - secondProb < 0.10) {
    dominantDomains.push(secondDomain);
  }

  return {
    prior,
    likelihood: semanticLikelihood,
    adjusted_likelihood: adjustedLikelihood,
    posterior,
    entropy: Number(entropy.toFixed(3)),
    max_domain: maxDomain,
    max_probability: maxProbability,
    confidence,
    dominant_domains: dominantDomains,
    engagement: signals,
  };
}

// Stage 3: Recommendation Retrieval & MMR
export async function runStage3RecommendationMMR(
  stage2: Stage2Output,
  session: SessionState
): Promise<Stage3Output> {
  const topDomains = stage2.dominant_domains;
  const topDomain = stage2.max_domain;

  // Build interest summary string for vector embedding
  const querySummary = `High-signal technical explainer in ${topDomains.join(' and ')} software engineering concepts, deep-dive architecture, and best practices.`;
  const queryEmbedding = await getEmbedding(querySummary);

  // Retrieve top candidates via vector cosine similarity
  const rawMatches = await vectorSearch(queryEmbedding, 15);

  const curatedBank = await getCuratedReels();
  const alreadyRecommended = session.recommended_reel_ids || [];

  // MMR parameters
  const lambda = 0.7; // Balance relevance vs diversity

  const mmrCandidates: MMRCandidate[] = rawMatches.map((match) => {
    const candidate = match.reel;

    // Calculate maximum similarity to already recommended items
    let maxSimToHistory = 0;
    for (const recId of alreadyRecommended) {
      const pastItem = curatedBank.find((r) => r.id === recId);
      if (pastItem && (pastItem as any).embedding && (candidate as any).embedding) {
        const sim = cosineSimilarity((candidate as any).embedding, (pastItem as any).embedding);
        if (sim > maxSimToHistory) {
          maxSimToHistory = sim;
        }
      } else if (pastItem?.category === candidate.category) {
        maxSimToHistory = Math.max(maxSimToHistory, 0.65);
      }
    }

    const mmrScore = lambda * match.similarity - (1 - lambda) * maxSimToHistory;

    return {
      reel: candidate,
      similarity_score: Number(match.similarity.toFixed(4)),
      diversity_penalty: Number(maxSimToHistory.toFixed(4)),
      mmr_score: Number(mmrScore.toFixed(4)),
    };
  });

  // Sort by MMR score descending
  mmrCandidates.sort((a, b) => b.mmr_score - a.mmr_score);

  return {
    query_summary: querySummary,
    top_candidates: mmrCandidates,
    selected_candidate: mmrCandidates[0]?.reel || curatedBank[0],
    lambda_used: lambda,
  };
}

// Stage 4: Hype Filter (Generator-Critic Adversarial Loop)
export async function runStage4HypeFilter(stage3: Stage3Output): Promise<Stage4Output> {
  const reviews: CriticReview[] = [];
  const candidates = stage3.top_candidates;

  // Regex patterns for obvious bait
  const BAIT_PATTERNS = [
    /\d+\s*(tools|hacks|tips|secrets|buzzwords|cheats|tricks)\s*(that|to|will)/i,
    /you won't believe/i,
    /make\s*\$?\d+k\s*\/?\s*(month|day|passively|while you sleep)/i,
    /get hired.*(overnight|tomorrow|instantly|in 5 minutes|in 10 minutes)/i,
    /become (a )?(master|enterprise|senior).*in (5|10) minutes/i,
    /hack any|cheat every/i,
    /free secret tool/i,
    /passive income/i,
    /fool any interview/i,
  ];

  let approvedReel: ReelItem | null = null;
  let attempt = 0;

  for (const item of candidates) {
    attempt++;
    const candidate = item.reel;

    // 1. Cheap regex pre-filter
    const titleAndDesc = `${candidate.title} ${candidate.description}`;
    const regexBaitMatch = BAIT_PATTERNS.some((p) => p.test(titleAndDesc)) || candidate.is_hype_trap;

    if (regexBaitMatch) {
      reviews.push({
        candidate_id: candidate.id,
        candidate_title: candidate.title,
        approved: false,
        reason: 'Regex Pre-Filter: Detected sensationalist buzzwords, get-rich-quick framing, or low-density listicle structure.',
        rejection_type: 'regex_bait',
        attempt_number: attempt,
      });

      if (attempt >= 3) break;
      continue;
    }

    // 2. LLM Adversarial Critic
    const criticPrompt = `You are a skeptical, elite CS student & Staff Engineer reviewing short-form video recommendations.
Your mission is to rigorously filter out shallow hype, clickbait, sensationalism, and superficial listicles, while approving high-signal, substantive, technically defensible engineering content (deep-dives, algorithms, systems design, actual trade-offs).

Candidate Tech Reel:
- Title: "${candidate.title}"
- Category: "${candidate.category}"
- Difficulty: "${candidate.difficulty || 'Intermediate'}"
- Content Type: "${candidate.content_type || 'explainer'}"
- Description: "${candidate.description}"

Evaluate whether this reel provides real technical depth or is shallow hype.
Return JSON:
{
  "approved": true or false,
  "reason": "1-sentence specific evaluation justifying approval or rejection"
}`;

    const fallbackCritic = () => {
      const isListicle = candidate.content_type === 'listicle' || candidate.title.toLowerCase().includes('top 10') || candidate.title.toLowerCase().includes('tricks');
      if (isListicle) {
        return {
          approved: false,
          reason: 'Lacks technical depth; relies on shallow listicle format without exploring underlying engineering trade-offs.',
        };
      }
      return {
        approved: true,
        reason: 'Substantive technical breakdown exploring concrete mechanism, architectural nuances, and trade-offs.',
      };
    };

    try {
      const criticRes = await generateJSON<{ approved: boolean; reason: string }>(
        criticPrompt,
        {
          systemInstruction:
            'You are an adversarial AI Critic reviewing recommendations for technical depth and intellectual rigor.',
          temperature: 0.1,
        },
        fallbackCritic
      );

      const decision = criticRes.data;

      reviews.push({
        candidate_id: candidate.id,
        candidate_title: candidate.title,
        approved: decision.approved,
        reason: decision.reason || (decision.approved ? 'Substantive technical content.' : 'Superficial hype detected.'),
        rejection_type: decision.approved ? 'approved' : 'critic_rejection',
        attempt_number: attempt,
      });

      if (decision.approved) {
        approvedReel = candidate;
        break;
      }
    } catch (e) {
      const fallback = fallbackCritic();
      reviews.push({
        candidate_id: candidate.id,
        candidate_title: candidate.title,
        approved: fallback.approved,
        reason: fallback.reason,
        rejection_type: fallback.approved ? 'approved' : 'critic_rejection',
        attempt_number: attempt,
      });

      if (fallback.approved) {
        approvedReel = candidate;
        break;
      }
    }

    if (attempt >= 3) {
      break;
    }
  }

  // If all 3 attempts were rejected, fall back to highest MMR candidate with bypass flag
  let hypeFilterBypassed = false;
  if (!approvedReel) {
    approvedReel = candidates[0].reel;
    hypeFilterBypassed = true;
  }

  const finalReason = reviews.find((r) => r.candidate_id === approvedReel?.id)?.reason || 'Passed technical density and non-hype validation.';

  return {
    approved_reel: approvedReel,
    reviews,
    rejected_count: reviews.filter((r) => !r.approved).length,
    hype_filter_bypassed: hypeFilterBypassed,
    final_reason: finalReason,
  };
}

// Stage 5: Structured Output Schema (Required exact fields)
export async function runStage5StructuredOutput(
  watchedReel: ReelItem,
  stage1: Stage1Output,
  stage2: Stage2Output,
  stage3: Stage3Output,
  stage4: Stage4Output
): Promise<Stage5StructuredOutput> {
  const topDomain = stage2.dominant_domains.join(' / ');
  const recReel = stage4.approved_reel;

  const prompt = `Format the final recommendation output strictly following this exact structure.

Context:
- Watched Reel: "${watchedReel.title}" (Format: ${watchedReel.format})
- Underlying Signal Detected: "${stage1.underlying_signal}"
- Top Bayesian Domains: ${topDomain} (Confidence: ${stage2.confidence}, Posterior Mass: ${(stage2.max_probability * 100).toFixed(1)}%)
- Recommended Reel: "${recReel.title}"
- Recommended Reel Category: "${recReel.category}"
- Recommended Reel Difficulty: "${recReel.difficulty || 'Intermediate'}"
- Recommended Reel Description: "${recReel.description}"
- Critic Hype Filter Status: ${stage4.hype_filter_bypassed ? 'Bypassed after 3 retries' : 'Approved by Adversarial Critic'}

Return a JSON object with EXACTLY these field names:
{
  "CURRENT REEL": "${watchedReel.title}",
  "INTEREST DETECTED": "${topDomain}",
  "WHY": "Concise evidence citing the specific underlying signals from the watched reel(s) that converged",
  "RECOMMENDED TECH REEL": "${recReel.title}",
  "CATEGORY": "${recReel.category}",
  "WHY THIS RECOMMENDATION": "Clear explanation connecting the detected latent interest to this specific recommendation, noting that superficial hype was screened out",
  "DIFFICULTY": "${recReel.difficulty || 'Intermediate'}",
  "CONFIDENCE": "${stage2.confidence}"
}`;

  const fallbackOutput = (): Stage5StructuredOutput => {
    return {
      current_reel: watchedReel.title,
      interest_detected: topDomain,
      why: `Observed signals from '${watchedReel.title}' (${stage1.surface_topic}) converged toward ${topDomain} foundations with ${(stage2.max_probability * 100).toFixed(0)}% posterior mass concentration.`,
      recommended_tech_reel: recReel.title,
      category: recReel.category as DomainCategory,
      why_this_recommendation: `Directly reinforces ${recReel.category} depth with a substantive ${recReel.content_type || 'explainer'}; verified non-hype through adversarial critique.`,
      difficulty: recReel.difficulty || 'Intermediate',
      confidence: stage2.confidence,
      raw_reel_data: recReel,
    };
  };

  try {
    const res = await generateJSON<any>(
      prompt,
      {
        systemInstruction: 'You are the structured output synthesizer for the ScrollSmart AI recommendation pipeline.',
        temperature: 0.1,
      },
      () => ({
        'CURRENT REEL': watchedReel.title,
        'INTEREST DETECTED': topDomain,
        WHY: `Observed signals from '${watchedReel.title}' converged toward ${topDomain} foundations with ${(stage2.max_probability * 100).toFixed(0)}% posterior mass concentration.`,
        'RECOMMENDED TECH REEL': recReel.title,
        CATEGORY: recReel.category,
        'WHY THIS RECOMMENDATION': `Directly reinforces ${recReel.category} depth with a substantive ${recReel.content_type || 'explainer'}; verified non-hype through adversarial critique.`,
        DIFFICULTY: recReel.difficulty || 'Intermediate',
        CONFIDENCE: stage2.confidence,
      })
    );

    const raw = res.data;

    return {
      current_reel: raw['CURRENT REEL'] || raw.current_reel || watchedReel.title,
      interest_detected: raw['INTEREST DETECTED'] || raw.interest_detected || topDomain,
      why: raw['WHY'] || raw.why || stage1.underlying_signal,
      recommended_tech_reel: raw['RECOMMENDED TECH REEL'] || raw.recommended_tech_reel || recReel.title,
      category: (raw['CATEGORY'] || raw.category || recReel.category) as DomainCategory,
      why_this_recommendation: raw['WHY THIS RECOMMENDATION'] || raw.why_this_recommendation || stage4.final_reason,
      difficulty: (raw['DIFFICULTY'] || raw.difficulty || recReel.difficulty || 'Intermediate') as any,
      confidence: (raw['CONFIDENCE'] || raw.confidence || stage2.confidence) as ConfidenceLevel,
      raw_reel_data: recReel,
    };
  } catch (err) {
    return fallbackOutput();
  }
}

// Master Pipeline Orchestrator
export async function executeFullPipeline(
  watchedReel: ReelItem,
  session: SessionState,
  engagement?: RawEngagementInput | EngagementSignals
): Promise<{ trace: PipelineTrace; updatedSession: SessionState }> {
  // Stage 1: AI Understanding (Semantic Content Meaning)
  const stage1 = await runStage1AIUnderstanding(watchedReel);

  // Stage 2: Bayesian Update with Viewer Engagement
  const stage2 = runStage2BayesianUpdate(session.posterior, stage1.domain_likelihoods, engagement);

  // Stage 3: Retrieval + MMR
  const stage3 = await runStage3RecommendationMMR(stage2, session);

  // Stage 4: Hype Filter (Generator-Critic loop)
  const stage4 = await runStage4HypeFilter(stage3);

  // Stage 5: Structured Output Schema
  const stage5 = await runStage5StructuredOutput(watchedReel, stage1, stage2, stage3, stage4);

  // Create pipeline trace
  const trace: PipelineTrace = {
    timestamp: new Date().toISOString(),
    reel_id: watchedReel.id,
    reel_title: watchedReel.title,
    stage1,
    stage2,
    stage3,
    stage4,
    stage5,
    engagement: stage2.engagement,
  };

  // Update session state
  const updatedSession: SessionState = {
    ...session,
    posterior: stage2.posterior,
    confidence: stage2.confidence,
    history: [trace, ...session.history],
    recommended_reel_ids: [stage4.approved_reel.id, ...session.recommended_reel_ids],
    total_reels_watched: session.total_reels_watched + 1,
  };

  return { trace, updatedSession };
}
