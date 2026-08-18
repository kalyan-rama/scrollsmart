import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;
let geminiRateLimitUntil = 0;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export interface LLMRequestOptions {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  model?: string;
}

export interface LLMResponse<T = any> {
  data: T;
  provider: 'gemini' | 'groq' | 'local_fallback';
  modelUsed: string;
  rawText: string;
}

// Clean JSON strings wrapped in Markdown codeblocks
export function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
}

/**
 * Call Groq API as an OpenAI-compatible fallback with multiple model options
 */
async function callGroq<T = any>(
  prompt: string,
  options?: LLMRequestOptions
): Promise<LLMResponse<T> | null> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey || groqApiKey.trim() === '' || groqApiKey === 'MY_GROQ_API_KEY') return null;

  const candidateModels = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama3-70b-8192'];

  for (const model of candidateModels) {
    try {
      const messages = [];
      if (options?.systemInstruction) {
        messages.push({ role: 'system', content: options.systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.2,
          response_format: { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        continue;
      }

      const payload = (await res.json()) as any;
      const rawText = payload?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(cleanJsonText(rawText));

      return {
        data: parsed as T,
        provider: 'groq',
        modelUsed: model,
        rawText,
      };
    } catch (err) {
      // try next model
    }
  }

  return null;
}

/**
 * Unified JSON generation method: tries Gemini first, falls back to Groq,
 * and falls back to deterministic heuristic if both are unavailable or rate-limited.
 */
export async function generateJSON<T = any>(
  prompt: string,
  options?: LLMRequestOptions,
  heuristicFallback?: () => T
): Promise<LLMResponse<T>> {
  const now = Date.now();
  const gemini = getGeminiClient();

  // If Gemini is not currently in rate-limit cooldown
  if (gemini && now > geminiRateLimitUntil) {
    try {
      const model = options?.model || 'gemini-3.7-flash';
      const config: any = {
        temperature: options?.temperature ?? 0.2,
      };
      if (options?.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      config.responseMimeType = 'application/json';

      const response = await gemini.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(cleanJsonText(rawText));

      return {
        data: parsed as T,
        provider: 'gemini',
        modelUsed: model,
        rawText,
      };
    } catch (geminiError: any) {
      const errStr = String(geminiError?.message || geminiError);
      if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota')) {
        // Set cooldown for 20 seconds to prevent hammering the rate limit
        geminiRateLimitUntil = Date.now() + 20000;
        console.warn('[Gemini Rate Limit Hit] Enabling 20s cooldown and engaging fast heuristic fallback.');
      } else {
        console.warn('[Gemini API Notice]', errStr.slice(0, 100));
      }
    }
  }

  // Try Groq fallback
  const groqResult = await callGroq<T>(prompt, options);
  if (groqResult) {
    return groqResult;
  }

  // Deterministic local fallback
  if (heuristicFallback) {
    try {
      const fallbackData = heuristicFallback();
      return {
        data: fallbackData,
        provider: 'local_fallback',
        modelUsed: 'deterministic_heuristic_v1',
        rawText: JSON.stringify(fallbackData),
      };
    } catch (err) {
      console.error('[Heuristic Fallback Error]', err);
    }
  }

  throw new Error('All LLM providers (Gemini & Groq) and local fallbacks failed');
}

/**
 * Compute cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Vector generator: calls text-embedding-004 on Gemini if key is present,
 * otherwise computes a normalized 768-dim semantic hash vector.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const gemini = getGeminiClient();

  if (gemini) {
    try {
      const result = await gemini.models.embedContent({
        model: 'text-embedding-004',
        contents: text,
      });

      const anyRes = result as any;
      const values = anyRes?.embedding?.values || anyRes?.embeddings?.[0]?.values;
      if (values && values.length > 0) {
        return values;
      }
    } catch (e) {
      // fallback to deterministic semantic vector
    }
  }

  // Fallback high-dimensional 768 semantic feature vector
  return generateDeterministicEmbedding(text, 768);
}

/**
 * High-quality 768-dim semantic vectorizer for local / offline speed
 */
export function generateDeterministicEmbedding(text: string, dimensions = 768): number[] {
  const vec = new Array(dimensions).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = normalized.split(/\s+/).filter(Boolean);

  const DOMAIN_KEYWORDS: Record<string, string[]> = {
    AI: ['ai', 'llm', 'transformer', 'attention', 'rag', 'embedding', 'prompt', 'cuda', 'gpu', 'sram', 'model', 'neural', 'machine', 'learning', 'deep'],
    DSA: ['dsa', 'leetcode', 'tree', 'graph', 'algorithm', 'complexity', 'lru', 'cache', 'hash', 'map', 'linked', 'list', 'bfs', 'dfs', 'sorting', 'dp'],
    Java: ['java', 'jvm', 'concurrency', 'thread', 'loom', 'spring', 'compiler', 'bytecode', 'static', 'typed', 'gc', 'garbage', 'collection'],
    HLD: ['system', 'design', 'distributed', 'scale', 'microservice', 'load', 'balancer', 'kafka', 'redis', 'cassandra', 'sharding', 'rate', 'limiting'],
    Cybersecurity: ['security', 'cyber', 'exploit', 'sql', 'injection', 'buffer', 'overflow', 'firewall', 'zero', 'trust', 'mtls', 'vulnerability', 'hacker'],
    Cloud: ['cloud', 'aws', 'kubernetes', 'docker', 'dynamodb', 'serverless', 'lambda', 'devops', 'container', 'infrastructure', 'etcd', 'postgres'],
    Hardware: ['hardware', 'cpu', 'cache', 'memory', 'branch', 'predictor', 'macbook', 'thinkpad', 'chip', 'ram', 'intel', 'arm', 'gpu', 'workstation'],
    Career: ['career', 'swe', 'startup', 'standup', 'resume', 'interview', 'lifestyle', 'senior', 'staff', 'engineer', 'salary', 'code', 'review', 'rfc']
  };

  // 1. Keyword semantic bins
  let domainIdx = 0;
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const baseOffset = domainIdx * 48;
    for (const word of words) {
      if (keywords.includes(word)) {
        for (let k = 0; k < 48; k++) {
          vec[baseOffset + k] += Math.sin((k + 1) * 1.5) * 1.8 + 1.2;
        }
      }
    }
    domainIdx++;
  }

  // 2. Word character n-gram hashing
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash * 31 + word.charCodeAt(c)) & 0xffffffff;
    }
    const idx = Math.abs(hash) % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vec[idx] += sign * (1.0 / Math.sqrt(i + 1));

    // Adjacent n-gram spread
    const idx2 = (idx * 7 + 13) % dimensions;
    vec[idx2] += sign * 0.5;
  }

  // 3. L2 Normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}
