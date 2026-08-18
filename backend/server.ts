import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {
  initDatabase,
  createSession,
  getSession,
  updateSession,
  getFeedReels,
  getCuratedReels,
  logWatchEvent,
} from './db';
import { executeFullPipeline } from './pipeline';
import { DOMAIN_CATEGORIES, DomainCategory, ReelItem } from './types';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL;
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (!frontendUrl || frontendUrl === '*' || frontendUrl.trim() === '') {
          return callback(null, true);
        }
        const allowedOrigins = frontendUrl.split(',').map((o) => o.trim());
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          return callback(null, true);
        }
        // Allow localhost and local IP origins for local development
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    })
  );

  app.use(express.json());

  // Initialize DB (Postgres or In-Memory)
  await initDatabase();

  // --- API Endpoints ---

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'ScrollSmart Backend',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      models: {
        primary: 'Gemini 2.5/3.7 Flash',
        embeddings: 'text-embedding-004',
        fallback: process.env.GROQ_API_KEY ? 'Groq (Llama 3.3 70B)' : 'Heuristic Engine',
      },
      database: process.env.DATABASE_URL ? 'PostgreSQL (Neon with pgvector)' : 'In-Memory Vector Store',
      cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME) ? 'Configured' : 'Direct CDN URLs',
    });
  });

  // Root status endpoint for Railway health probes
  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ScrollSmart API Engine',
      docs: '/api/health',
    });
  });

  // 1. Create session
  app.post('/api/session', async (req, res) => {
    try {
      const session = await createSession();
      res.json({ session });
    } catch (err: any) {
      console.error('[API Error] POST /api/session:', err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // 2. Get session state
  app.get('/api/session/:id', async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json({ session });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  // 3. Reset session
  app.post('/api/session/:id/reset', async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.posterior = {
        AI: 0.125,
        DSA: 0.125,
        Java: 0.125,
        HLD: 0.125,
        Cybersecurity: 0.125,
        Cloud: 0.125,
        Hardware: 0.125,
        Career: 0.125,
      };
      session.confidence = 'Low';
      session.history = [];
      session.recommended_reel_ids = [];
      session.total_reels_watched = 0;

      await updateSession(session);
      res.json({ session });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reset session' });
    }
  });

  // 4. Log watch event & run full 5-stage pipeline
  app.post('/api/session/:id/watch', async (req, res) => {
    try {
      const sessionId = req.params.id;
      let session = await getSession(sessionId);

      if (!session) {
        session = await createSession();
      }

      const {
        reelId,
        reel,
        watch_pct,
        watchPct,
        completed = false,
        liked = false,
        commented = false,
        shared = false,
        saved = false,
        skipped = false,
        replayed = false,
        watch_duration,
        watchDuration = 0,
      } = req.body;
      const feedReels = await getFeedReels();

      let targetReel: ReelItem | undefined = reel;
      if (!targetReel && reelId) {
        targetReel = feedReels.find((r) => r.id === Number(reelId) || r.id === reelId);
      }

      if (!targetReel) {
        return res.status(400).json({ error: 'Valid reel or reelId required' });
      }

      const parsedWatchPct = Number(watch_pct !== undefined ? watch_pct : watchPct !== undefined ? watchPct : 1.0);

      // Execute the full 5-stage pipeline with all engagement signals
      const { trace, updatedSession } = await executeFullPipeline(targetReel, session, {
        watch_pct: parsedWatchPct,
        completed: Boolean(completed),
        liked: Boolean(liked),
        commented: Boolean(commented),
        shared: Boolean(shared),
        saved: Boolean(saved),
        skipped: Boolean(skipped),
        replayed: Boolean(replayed),
        watch_duration: Number(watch_duration || watchDuration || 0),
      });

      // Persist session update
      await updateSession(updatedSession);

      // Log watch event in relational DB / history
      await logWatchEvent(
        sessionId,
        targetReel.title,
        false,
        trace.stage1,
        {
          watch_pct: parsedWatchPct,
          completed: Boolean(completed),
          liked: Boolean(liked),
          commented: Boolean(commented),
          shared: Boolean(shared),
          saved: Boolean(saved),
          skipped: Boolean(skipped),
          replayed: Boolean(replayed),
          engagement_score: trace.stage2.engagement?.engagement_score,
          stage2_output: trace.stage2,
        }
      );

      res.json({
        success: true,
        trace,
        session: updatedSession,
        recommendation: trace.stage5,
      });
    } catch (err: any) {
      console.error('[API Error] POST /api/session/:id/watch:', err);
      res.status(500).json({ error: err.message || 'Pipeline execution failed' });
    }
  });

  // 5. Get live posterior for charts
  app.get('/api/session/:id/posterior', async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const posterior = session.posterior;
      let entropy = 0;
      for (const cat of DOMAIN_CATEGORIES) {
        const p = posterior[cat];
        if (p > 0) entropy -= p * Math.log2(p);
      }

      res.json({
        posterior: session.posterior,
        confidence: session.confidence,
        entropy: Number(entropy.toFixed(3)),
        totalWatched: session.total_reels_watched,
        latestTrace: session.history[0] || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch posterior' });
    }
  });

  // 6. Feedback loop (watch completed, saved, or skipped)
  app.post('/api/session/:id/feedback', async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { category, action, watchPct = 1.0 } = req.body;
      const targetCategory = category as DomainCategory;

      if (targetCategory && DOMAIN_CATEGORIES.includes(targetCategory)) {
        // Nudge factor
        const nudge = action === 'skip' || watchPct < 0.3 ? -0.04 : 0.06;
        const currentVal = session.posterior[targetCategory] || 0.125;
        session.posterior[targetCategory] = Math.max(0.02, currentVal + nudge);

        // Normalize
        const sum = Object.values(session.posterior).reduce((a, b) => a + b, 0);
        for (const cat of DOMAIN_CATEGORIES) {
          session.posterior[cat] = Number((session.posterior[cat] / sum).toFixed(4));
        }

        await updateSession(session);
      }

      res.json({ success: true, posterior: session.posterior });
    } catch (err: any) {
      res.status(500).json({ error: 'Feedback update failed' });
    }
  });

  // 7. Get feed reels
  app.get('/api/reels/feed', async (req, res) => {
    try {
      const reels = await getFeedReels();
      res.json({ reels });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch feed reels' });
    }
  });

  // 8. Get curated bank
  app.get('/api/reels/bank', async (req, res) => {
    try {
      const bank = await getCuratedReels();
      res.json({ bank });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch curated bank' });
    }
  });

  // 9. Get signed/transformed Cloudinary delivery URL for reel
  const handleReelVideoDelivery = async (req: any, res: any) => {
    try {
      const reelId = req.params.id;
      const allReels = [...(await getFeedReels()), ...(await getCuratedReels())];
      const reel = allReels.find((r) => String(r.id) === String(reelId));

      if (!reel) {
        return res.status(404).json({ error: 'Reel not found' });
      }

      res.json({
        id: reel.id,
        title: reel.title,
        cloudinary_public_id: reel.cloudinary_public_id,
        video_url: reel.video_url,
        thumbnail_url: reel.thumbnail_url,
        duration_seconds: reel.duration_seconds || reel.duration_sec,
        aspect_ratio: '9:16',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch video delivery data' });
    }
  };

  app.get('/api/reels/:id/video', handleReelVideoDelivery);
  app.get('/reels/:id/video', handleReelVideoDelivery);

  // 404 handler for API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
  });

  // Global 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ScrollSmart Backend API] Running on port ${PORT}`);
  });
}

startServer();
