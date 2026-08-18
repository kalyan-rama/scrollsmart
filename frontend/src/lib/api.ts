import {
  SessionState,
  ReelItem,
  PipelineTrace,
  DomainCategory,
  Stage5StructuredOutput,
} from '../types';

// Centralized base URL from environment (VITE_API_URL for Vercel/production, fallback to empty string for same-origin proxy)
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!BASE_URL) return cleanPath;
  return `${BASE_URL}${cleanPath}`;
}

export interface WatchReelPayload {
  reelId?: number | string;
  reel?: ReelItem;
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

export interface WatchResponse {
  success: boolean;
  trace: PipelineTrace;
  session: SessionState;
  recommendation: Stage5StructuredOutput;
}

export const api = {
  getApiUrl,

  async checkHealth(): Promise<{ status: string; app: string; timestamp: string }> {
    const res = await fetch(getApiUrl('/api/health'));
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return res.json();
  },

  async createSession(): Promise<SessionState> {
    const res = await fetch(getApiUrl('/api/session'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create session (${res.status}): ${err.slice(0, 100)}`);
    }
    const data = await res.json();
    return data.session;
  },

  async getSession(id: string): Promise<SessionState> {
    const res = await fetch(getApiUrl(`/api/session/${encodeURIComponent(id)}`));
    if (!res.ok) throw new Error(`Failed to fetch session (${res.status})`);
    const data = await res.json();
    return data.session;
  },

  async resetSession(id: string): Promise<SessionState> {
    const res = await fetch(getApiUrl(`/api/session/${encodeURIComponent(id)}/reset`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Failed to reset session (${res.status})`);
    const data = await res.json();
    return data.session;
  },

  async fetchFeedReels(): Promise<ReelItem[]> {
    const res = await fetch(getApiUrl('/api/reels/feed'));
    if (!res.ok) throw new Error(`Failed to fetch feed reels (${res.status})`);
    const data = await res.json();
    return data.reels || [];
  },

  async fetchCuratedBank(): Promise<ReelItem[]> {
    const res = await fetch(getApiUrl('/api/reels/bank'));
    if (!res.ok) throw new Error(`Failed to fetch curated bank (${res.status})`);
    const data = await res.json();
    return data.bank || [];
  },

  async watchReel(sessionId: string, payload: WatchReelPayload): Promise<WatchResponse> {
    const res = await fetch(getApiUrl(`/api/session/${encodeURIComponent(sessionId)}/watch`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Pipeline failed (${res.status}): ${errText.slice(0, 100)}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Server returned non-JSON response');
    }

    return res.json();
  },

  async sendFeedback(
    sessionId: string,
    category: DomainCategory,
    action: 'like' | 'save' | 'skip' | 'watch_complete',
    watchPct: number = 1.0
  ): Promise<{ success: boolean; session?: SessionState; posterior?: any }> {
    const res = await fetch(getApiUrl(`/api/session/${encodeURIComponent(sessionId)}/feedback`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, action, watchPct }),
    });
    if (!res.ok) throw new Error(`Feedback failed (${res.status})`);
    return res.json();
  },
};
