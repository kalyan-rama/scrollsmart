import { Pool } from 'pg';
import { CURATED_REELS_BANK, DEMO_FEED_REELS, SeedReel } from './curatedBank';
import { generateDeterministicEmbedding, cosineSimilarity } from './llmClient';
import { DomainCategory, PosteriorDistribution, ReelItem, SessionState } from './types';
import { getCloudinaryVideoUrl, getCloudinaryThumbnailUrl } from './cloudinary';
import crypto from 'crypto';

interface StoredReel extends ReelItem {
  embedding: number[];
}

class InMemoryDatabase {
  sessions: Map<string, SessionState> = new Map();
  feedReels: StoredReel[] = [];
  curatedReels: StoredReel[] = [];
  watchEvents: Array<{
    id: number;
    sessionId: string;
    reelRef: string;
    isRecommendation: boolean;
    stage1Output: any;
    watch_pct?: number;
    completed?: boolean;
    liked?: boolean;
    commented?: boolean;
    shared?: boolean;
    saved?: boolean;
    skipped?: boolean;
    replayed?: boolean;
    engagement_score?: number;
    stage2_output?: any;
    createdAt: string;
  }> = [];

  constructor() {
    this.seed();
  }

  seed() {
    this.feedReels = DEMO_FEED_REELS.map((r) => {
      const publicId = r.cloudinary_public_id || `scrollsmart/demo_reel_${r.id}`;
      return {
        id: r.id,
        title: r.title,
        creator: r.creator,
        avatar: r.avatar,
        format: r.format,
        category: r.category,
        difficulty: r.difficulty,
        content_type: r.content_type,
        description: r.description,
        tags: r.tags,
        duration_sec: r.duration_sec,
        duration_seconds: r.duration_seconds || r.duration_sec,
        thumbnail_gradient: r.thumbnail_gradient,
        is_curated_candidate: r.is_curated_candidate,
        is_hype_trap: r.is_hype_trap,
        views: r.views,
        likes: r.likes,
        cloudinary_public_id: publicId,
        video_url: getCloudinaryVideoUrl(publicId, r.video_url),
        thumbnail_url: getCloudinaryThumbnailUrl(publicId, r.thumbnail_url),
        embedding: generateDeterministicEmbedding(r.embedding_text),
      };
    });

    this.curatedReels = CURATED_REELS_BANK.map((r) => {
      const publicId = r.cloudinary_public_id || `scrollsmart/curated_${r.id}`;
      return {
        id: r.id,
        title: r.title,
        creator: r.creator,
        avatar: r.avatar,
        format: r.format,
        category: r.category,
        difficulty: r.difficulty,
        content_type: r.content_type,
        description: r.description,
        tags: r.tags,
        duration_sec: r.duration_sec,
        duration_seconds: r.duration_seconds || r.duration_sec,
        thumbnail_gradient: r.thumbnail_gradient,
        is_curated_candidate: r.is_curated_candidate,
        is_hype_trap: r.is_hype_trap,
        views: r.views,
        likes: r.likes,
        cloudinary_public_id: publicId,
        video_url: getCloudinaryVideoUrl(publicId, r.video_url),
        thumbnail_url: getCloudinaryThumbnailUrl(publicId, r.thumbnail_url),
        embedding: generateDeterministicEmbedding(r.embedding_text),
      };
    });
  }

  createSession(): SessionState {
    const id = crypto.randomUUID();
    const uniformPosterior: PosteriorDistribution = {
      AI: 0.125,
      DSA: 0.125,
      Java: 0.125,
      HLD: 0.125,
      Cybersecurity: 0.125,
      Cloud: 0.125,
      Hardware: 0.125,
      Career: 0.125,
    };

    const session: SessionState = {
      id,
      created_at: new Date().toISOString(),
      posterior: uniformPosterior,
      confidence: 'Low',
      history: [],
      recommended_reel_ids: [],
      total_reels_watched: 0,
    };

    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): SessionState | null {
    return this.sessions.get(id) || null;
  }

  updateSession(session: SessionState) {
    this.sessions.set(session.id, session);
  }

  getFeedReels(): ReelItem[] {
    return this.feedReels;
  }

  getCuratedReels(): ReelItem[] {
    return this.curatedReels;
  }

  vectorSearch(targetEmbedding: number[], limit = 10): Array<{ reel: ReelItem; similarity: number }> {
    const scored = this.curatedReels.map((item) => {
      const similarity = cosineSimilarity(targetEmbedding, item.embedding);
      return {
        reel: item,
        similarity,
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  }

  logWatchEvent(
    sessionId: string,
    reelRef: string,
    isRecommendation: boolean,
    stage1Output: any,
    engagement?: {
      watch_pct?: number;
      completed?: boolean;
      liked?: boolean;
      commented?: boolean;
      shared?: boolean;
      saved?: boolean;
      skipped?: boolean;
      replayed?: boolean;
      engagement_score?: number;
      stage2_output?: any;
    }
  ) {
    this.watchEvents.push({
      id: this.watchEvents.length + 1,
      sessionId,
      reelRef,
      isRecommendation,
      stage1Output,
      watch_pct: engagement?.watch_pct,
      completed: engagement?.completed,
      liked: engagement?.liked,
      commented: engagement?.commented,
      shared: engagement?.shared,
      saved: engagement?.saved,
      skipped: engagement?.skipped,
      replayed: engagement?.replayed,
      engagement_score: engagement?.engagement_score,
      stage2_output: engagement?.stage2_output,
      createdAt: new Date().toISOString(),
    });
  }
}

// Global in-memory instance
export const inMemoryDb = new InMemoryDatabase();

let pgPool: Pool | null = null;

export async function initDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('[Database] Operating with High-Performance In-Memory Vector Store + Seed Data');
    return;
  }

  try {
    pgPool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
    await pgPool.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE IF NOT EXISTS reels (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        content_type TEXT NOT NULL,
        description TEXT NOT NULL,
        cloudinary_public_id TEXT,
        duration_seconds NUMERIC,
        thumbnail_url TEXT,
        embedding VECTOR(768)
      );
      ALTER TABLE reels ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
      ALTER TABLE reels ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;
      ALTER TABLE reels ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT now(),
        posterior JSONB NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS watch_events (
        id SERIAL PRIMARY KEY,
        session_id UUID REFERENCES sessions(id),
        reel_ref TEXT NOT NULL,
        is_recommendation BOOLEAN DEFAULT false,
        stage1_output JSONB,
        stage2_output JSONB,
        watch_pct NUMERIC,
        completed BOOLEAN DEFAULT false,
        liked BOOLEAN DEFAULT false,
        commented BOOLEAN DEFAULT false,
        shared BOOLEAN DEFAULT false,
        saved BOOLEAN DEFAULT false,
        skipped BOOLEAN DEFAULT false,
        replayed BOOLEAN DEFAULT false,
        engagement_score NUMERIC,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT false;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS liked BOOLEAN DEFAULT false;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS commented BOOLEAN DEFAULT false;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS shared BOOLEAN DEFAULT false;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS saved BOOLEAN DEFAULT false;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT false;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS replayed BOOLEAN DEFAULT false;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS engagement_score NUMERIC;
      ALTER TABLE watch_events ADD COLUMN IF NOT EXISTS stage2_output JSONB;
    `);
    console.log('[Database] Connected to PostgreSQL (Neon) with pgvector enabled.');
  } catch (err: any) {
    console.warn('[Database] PostgreSQL connection failed, gracefully utilizing In-Memory Vector Store:', err?.message || err);
    pgPool = null;
  }
}

export async function createSession(): Promise<SessionState> {
  const session = inMemoryDb.createSession();
  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO sessions (id, created_at, posterior) VALUES ($1, $2, $3)`,
        [session.id, session.created_at, JSON.stringify(session.posterior)]
      );
    } catch (e) {
      console.warn('[PG Error on createSession]', e);
    }
  }
  return session;
}

export async function getSession(sessionId: string): Promise<SessionState | null> {
  return inMemoryDb.getSession(sessionId);
}

export async function updateSession(session: SessionState): Promise<void> {
  inMemoryDb.updateSession(session);
  if (pgPool) {
    try {
      await pgPool.query(
        `UPDATE sessions SET posterior = $1 WHERE id = $2`,
        [JSON.stringify(session.posterior), session.id]
      );
    } catch (e) {
      console.warn('[PG Error on updateSession]', e);
    }
  }
}

export async function getFeedReels(): Promise<ReelItem[]> {
  return inMemoryDb.getFeedReels();
}

export async function getCuratedReels(): Promise<ReelItem[]> {
  return inMemoryDb.getCuratedReels();
}

export async function vectorSearch(
  embedding: number[],
  limit = 10
): Promise<Array<{ reel: ReelItem; similarity: number }>> {
  return inMemoryDb.vectorSearch(embedding, limit);
}

export async function logWatchEvent(
  sessionId: string,
  reelRef: string,
  isRecommendation: boolean,
  stage1Output: any,
  engagement?: {
    watch_pct?: number;
    completed?: boolean;
    liked?: boolean;
    commented?: boolean;
    shared?: boolean;
    saved?: boolean;
    skipped?: boolean;
    replayed?: boolean;
    engagement_score?: number;
    stage2_output?: any;
  }
): Promise<void> {
  inMemoryDb.logWatchEvent(sessionId, reelRef, isRecommendation, stage1Output, engagement);
  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO watch_events (
          session_id,
          reel_ref,
          is_recommendation,
          stage1_output,
          stage2_output,
          watch_pct,
          completed,
          liked,
          commented,
          shared,
          saved,
          skipped,
          replayed,
          engagement_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          sessionId,
          reelRef,
          isRecommendation,
          JSON.stringify(stage1Output),
          JSON.stringify(engagement?.stage2_output || null),
          engagement?.watch_pct ?? null,
          engagement?.completed ?? false,
          engagement?.liked ?? false,
          engagement?.commented ?? false,
          engagement?.shared ?? false,
          engagement?.saved ?? false,
          engagement?.skipped ?? false,
          engagement?.replayed ?? false,
          engagement?.engagement_score ?? null,
        ]
      );
    } catch (e) {
      console.warn('[PG Error on logWatchEvent]', e);
    }
  }
}
