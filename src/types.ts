export type DomainCategory =
  | 'AI'
  | 'DSA'
  | 'Java'
  | 'HLD'
  | 'Cybersecurity'
  | 'Cloud'
  | 'Hardware'
  | 'Career';

export const DOMAIN_CATEGORIES: DomainCategory[] = [
  'AI',
  'DSA',
  'Java',
  'HLD',
  'Cybersecurity',
  'Cloud',
  'Hardware',
  'Career',
];

export type ReelFormat =
  | 'meme'
  | 'tutorial'
  | 'lifestyle'
  | 'news'
  | 'interview_humor'
  | 'explainer'
  | 'deep-dive'
  | 'case-study'
  | 'listicle';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface DomainLikelihoods {
  AI: number;
  DSA: number;
  Java: number;
  HLD: number;
  Cybersecurity: number;
  Cloud: number;
  Hardware: number;
  Career: number;
}

export type PosteriorDistribution = DomainLikelihoods;

export interface ReelItem {
  id: number | string;
  title: string;
  creator: string;
  avatar: string;
  format: ReelFormat;
  category: DomainCategory | 'General' | 'Entertainment' | 'Tech News';
  difficulty?: DifficultyLevel;
  content_type?: string;
  description: string;
  tags: string[];
  duration_sec: number;
  thumbnail_gradient: string;
  is_curated_candidate?: boolean;
  is_hype_trap?: boolean;
  views?: string;
  likes?: string;
  cloudinary_public_id?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
}

export interface EngagementSignals {
  watch_pct: number;
  completed: boolean;
  liked: boolean;
  commented: boolean;
  shared: boolean;
  saved: boolean;
  skipped: boolean;
  replayed: boolean;
  engagement_score: number; // Normalized score between -1.0 and +1.0
  watch_duration?: number;
  human_summary?: string; // e.g. "Strong interest detected: 95% watched · Liked · Saved"
  engagement_multiplier?: number;
}

export interface Stage1Output {
  surface_topic: string;
  format: ReelFormat;
  underlying_signal: string;
  domain_likelihoods: DomainLikelihoods;
  reasoning_notes?: string;
}

export interface Stage2Output {
  prior: PosteriorDistribution;
  likelihood: DomainLikelihoods;
  adjusted_likelihood?: DomainLikelihoods;
  posterior: PosteriorDistribution;
  entropy: number;
  max_domain: DomainCategory;
  max_probability: number;
  confidence: ConfidenceLevel;
  dominant_domains: DomainCategory[];
  engagement?: EngagementSignals;
  human_summary?: string;
  signals?: EngagementSignals;
  engagement_score?: number;
}

export interface MMRCandidate {
  reel: ReelItem;
  similarity_score: number;
  diversity_penalty: number;
  mmr_score: number;
}

export interface Stage3Output {
  query_summary: string;
  top_candidates: MMRCandidate[];
  selected_candidate: ReelItem;
  lambda_used: number;
}

export interface CriticReview {
  candidate_id: string | number;
  candidate_title: string;
  approved: boolean;
  reason: string;
  rejection_type?: 'regex_bait' | 'critic_rejection' | 'approved';
  attempt_number: number;
}

export interface Stage4Output {
  approved_reel: ReelItem;
  reviews: CriticReview[];
  rejected_count: number;
  hype_filter_bypassed: boolean;
  final_reason: string;
}

export interface Stage5StructuredOutput {
  current_reel: string;
  interest_detected: string;
  why: string;
  recommended_tech_reel: string;
  category: DomainCategory | 'Other';
  why_this_recommendation: string;
  difficulty: DifficultyLevel;
  confidence: ConfidenceLevel;
  raw_reel_data: ReelItem;
}

export interface PipelineTrace {
  timestamp: string;
  reel_id: string | number;
  reel_title: string;
  stage1: Stage1Output;
  stage2: Stage2Output;
  stage3: Stage3Output;
  stage4: Stage4Output;
  stage5: Stage5StructuredOutput;
  engagement?: EngagementSignals;
  provider_info?: { model: string };
  execution_time_ms?: number;
}

export interface SessionState {
  id: string;
  created_at: string;
  posterior: PosteriorDistribution;
  confidence: ConfidenceLevel;
  history: PipelineTrace[];
  recommended_reel_ids: Array<string | number>;
  total_reels_watched: number;
}
