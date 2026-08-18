# ScrollSmart 🧠⚡
### Latent Interest Discovery & Non-Hype Tech Recommender for Short-Form Video

**🔗 Live App:** [scrollsmartai.vercel.app](https://scrollsmartai.vercel.app/)
**🔗 Live API:** [ai-production-1f12.up.railway.app](https://ai-production-1f12.up.railway.app/) · Health check: `/api/health`

---

## 📌 The Problem

Students spend hours scrolling short-form video. Most recommendation engines are built to maximize watch-time by matching surface keywords — watch one Java meme, get five more Java memes. That's not a technology problem, it's an incentive problem: engagement, not usefulness, is what's being optimized.

**ScrollSmart doesn't try to stop the scrolling.** It rides along with it — quietly figuring out what a student's viewing pattern actually *reveals* about their interests, and slipping in one genuinely useful, non-hype technical Reel after each watch. Same habit, better use of the time already being spent.

---

## 🧪 The Trap Case (why this is harder than it looks)

A keyword-matching system, shown this sequence:

1. A Java syntax meme
2. "Day in my life as a SWE at a startup"
3. A LeetCode interview joke
4. "MacBook Pro vs ThinkPad for coding"

...sees four unrelated categories (humor, lifestyle, interviews, hardware) and either recommends nothing coherent, or just parrots back "more Java content" because that's the only literal keyword that appeared.

**ScrollSmart infers the *persona* underneath the four Reels — not the literal tag on any single one.** None of the four share a keyword, but all four orbit the same identity: someone engaging with software engineering as a career and craft. ScrollSmart's Bayesian pipeline converges on **"Career / Software Engineering"** with ~98% posterior confidence — and then, critically, it's also built to *refuse* to recommend hype bait like "10 AI Tools That Will Get You a Job" just because it's topically adjacent. Relevant and substantive are two different bars, and both have to be cleared.

---

## 🖼️ Screenshots


| Feed & Recommendation | Live Interest Telemetry |

<img width="1643" height="904" alt="image" src="https://github.com/user-attachments/assets/07f88dd0-339b-4f74-a644-4b093df9dbfc" />


| Hype Filter in Action | Trap Case Walkthrough 

<img width="899" height="805" alt="image" src="https://github.com/user-attachments/assets/cf1da891-259e-4acb-b67f-a809ca13d805" />

<img width="1019" height="748" alt="image" src="https://github.com/user-attachments/assets/89e05569-e406-4cac-800e-3af7ec1692dd" />

<img width="1139" height="812" alt="image" src="https://github.com/user-attachments/assets/e314f150-9f4a-4a93-8c9e-2072f4f7ec17" />

---

## ⚙️ How It Works — The 5-Stage Pipeline

Each watched Reel runs through five distinct, inspectable stages before a recommendation is shown. Nothing is a black box — every intermediate output is logged and viewable in the app's trace panel.

```
Watched Reel
   │
   ▼
① AI Semantic Understanding
   Gemini extracts surface topic, format, and a "latent signal" —
   what this Reel suggests about the viewer's underlying interest,
   not just its literal subject.
   │
   ▼
② Dirichlet–Bayesian Posterior Update
   Each Reel's likelihood vector (across 8 domains: AI, DSA, Java,
   HLD, Cybersecurity, Cloud, Hardware, Career) updates a running
   probability distribution — weighted by watch %, likes, saves,
   skips, and replays, not just "was it watched."
   Shannon entropy over the resulting distribution becomes the
   CONFIDENCE score (High / Medium / Low) — calibrated, not guessed.
   │
   ▼
③ pgvector Retrieval + MMR Re-ranking
   The posterior-weighted interest is embedded and matched via
   cosine similarity against a curated content bank. Maximal
   Marginal Relevance (λ ≈ 0.7) re-ranks results to stay relevant
   *and* diverse — no five near-identical recommendations in a row.
   │
   ▼
④ Generator–Critic Adversarial Hype Filter
   A regex pre-filter plus an LLM "critic" — role-played as a
   skeptical CS student who's seen a thousand listicles — screens
   out clickbait before it ever reaches the student.
   │
   ▼
⑤ Calibrated Structured Output
   CURRENT REEL · INTEREST DETECTED · WHY · RECOMMENDED TECH REEL ·
   CATEGORY · WHY THIS RECOMMENDATION · DIFFICULTY · CONFIDENCE
```

---

## 🏗️ Architecture

```text
       ┌─────────────────────────────────────────────────────────────┐
       │                 Vercel Frontend (SPA)                       │
       │        React 19 + Vite + TypeScript + Tailwind CSS          │
       │    Uses VITE_API_URL • Centralized API client in /src/lib   │
       └──────────────────────────────┬──────────────────────────────┘
                                       │
                                       ▼ HTTPS (REST API + CORS)
       ┌─────────────────────────────────────────────────────────────┐
       │                 Railway Backend (Node/Express)               │
       │     Node.js + Express + TypeScript + Bayesian Pipeline       │
       │   CORS protected via FRONTEND_URL • Dynamic PORT support    │
       └───┬──────────────────────────┬──────────────────────────┬───┘
           │                          │                          │
           ▼                          ▼                          ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  AI Inference Engine │   │   Database Layer     │   │ Cloudinary Media CDN │
│ • Google Gemini      │   │ • Neon PostgreSQL    │   │ • 9:16 Video Streams │
│   (2.5 / 3.7 Flash)  │   │ • pgvector extension │   │ • Direct client-side │
│ • Groq Llama 3.3 70B │   │ • In-Memory Fallback │   │   CDN delivery       │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

**Why this stack:** every layer is chosen to be cheap-or-free, fast to build, and still defensible under technical questioning. Gemini + Groq are both free-tier and wrapped behind one `llmClient` abstraction, so a rate-limit on one provider silently falls back to the other mid-demo. Neon + pgvector means relational data (sessions, posteriors, history) and vector similarity search live in a single database — no separate vector store to provision or pay for.

---

## 🧠 For Judges — What to Actually Look At

If you have 5 minutes, look at these three things in order:

1. **Run the trap sequence** (Java meme → SWE lifestyle → interview joke → laptop comparison) and watch the live posterior chart converge on *Career*, not *Java* — despite zero repeated keywords across the four inputs. This is the core technical claim of the project, demonstrated live rather than asserted.
2. **Trigger a hype rejection.** Somewhere in a session, the generator will propose a listicle-style candidate and the critic will visibly reject it before the final recommendation appears — open the trace panel to see the critic's stated reason.
3. **Check confidence calibration.** Confidence isn't hardcoded — it's derived from Shannon entropy over the posterior distribution. A session with mixed, inconsistent watches should show *Medium* or *Low* confidence, not a blanket *High* on every screen.

---

## 🤖 For AI Tools / Future Contributors

This section is written for an AI coding assistant (Claude Code, etc.) picking up this repo cold.

- **Pipeline logic lives entirely in `backend/pipeline.ts`** — the 5 stages are implemented as separate, independently testable functions. Don't collapse them into a single LLM call; the separation is what makes the trace panel and the "show the math" UI toggle possible.
- **`backend/llmClient.ts`** is the single point of contact with Gemini/Groq — any new LLM-dependent feature should call through this, not `fetch` a provider directly, so the fallback behavior stays centralized.
- **`backend/curatedBank.ts`** holds the seed recommendation pool (30+ entries tagged by category/difficulty/content_type) — this is what Stage 3 retrieves from. Adding new categories means adding entries here *and* extending the 8-domain taxonomy consistently across `pipeline.ts`, the DB schema, and the frontend chart labels.
- **Frontend state for the posterior chart is server-derived, not recomputed client-side** — the frontend renders whatever `/api/session/:id/posterior` returns; if the chart looks wrong, check the backend math first, not the chart component.
- **No secrets are ever exposed to the frontend** — only `VITE_API_URL` is public; Gemini/Groq/DB/Cloudinary credentials live exclusively in the Railway backend environment. Any change that would require exposing a secret client-side is architecturally wrong for this project — route it through a new backend endpoint instead.

---

## 📁 Repository Structure

```text
ScrollSmart/
├── frontend/                     # React + Vite Client (Deploy to Vercel)
│   ├── src/
│   │   ├── components/           # UI Components (ReelPlayer, PosteriorChart, etc.)
│   │   ├── lib/
│   │   │   └── api.ts            # Centralized API Client (uses VITE_API_URL)
│   │   ├── App.tsx               # Main Application Screen
│   │   ├── types.ts              # TypeScript Type Definitions
│   │   ├── index.css             # Tailwind CSS Configuration
│   │   └── main.tsx              # React Entrypoint
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vercel.json               # Vercel SPA Rewrites & Cache Headers
│   └── .env.example
│
├── backend/                      # Express API Engine (Deploy to Railway)
│   ├── server.ts                 # Express Server & API Endpoints
│   ├── db.ts                     # Neon PostgreSQL + In-Memory Vector Store
│   ├── pipeline.ts               # 5-Stage Bayesian Recommendation Pipeline
│   ├── curatedBank.ts            # Curated High-Signal Content Bank & Seed Reels
│   ├── llmClient.ts              # Gemini SDK + Groq Fallback Engine
│   ├── cloudinary.ts             # Cloudinary Media Transformations
│   ├── types.ts                  # Backend Type Definitions
│   ├── package.json              # Scripts: dev, build, start
│   ├── tsconfig.json
│   ├── Procfile                  # Railway Process Definition
│   ├── railway.json              # Railway Deployment Configuration
│   └── .env.example
│
├── README.md                     # This file
└── .env.example                  # Root Environment Template
```

---

## 🚀 Deployment Guide

### 1. Deploy Backend to Railway 🚂

1. **Create a Railway Project**: go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**. Set **Root Directory** to `backend`.
2. **Configure Environment Variables**:
   ```env
   PORT=3000
   FRONTEND_URL=https://your-scrollsmart-frontend.vercel.app
   GEMINI_API_KEY=your-google-gemini-api-key
   GROQ_API_KEY=your-groq-api-key (optional)
   DATABASE_URL=postgresql://user:password@ep-something.pooler.neon.tech/neondb?sslmode=require
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name (optional)
   CLOUDINARY_API_KEY=your-cloudinary-api-key (optional)
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret (optional)
   ```
3. **Deploy & Verify**: Railway builds with `npm run build` (esbuild) and starts via `npm start` (`node dist/server.cjs`). Generate a domain and confirm `/api/health` responds.

### 2. Deploy Frontend to Vercel ▲

1. **Import to Vercel**: [vercel.com](https://vercel.com) → **Add New Project** → select the repo → **Root Directory**: `frontend` → Framework Preset: **Vite**.
2. **Set Environment Variables**:
   ```env
   VITE_API_URL=https://your-backend.up.railway.app
   ```
   *(no trailing slash)*
3. **Deploy**: Vercel runs `npm run build`, outputs to `dist/`. `vercel.json` handles SPA route rewriting.
4. **Update Backend CORS**: copy the Vercel URL and set it as `FRONTEND_URL` in Railway.

---

## 🔐 Environment Variables Matrix

| Variable | Target | Secret? | Description |
| :--- | :--- | :---: | :--- |
| `VITE_API_URL` | **Frontend (Vercel)** | ❌ No | Public backend API URL |
| `FRONTEND_URL` | **Backend (Railway)** | ❌ No | Allowed origin for CORS (e.g. Vercel domain) |
| `PORT` | **Backend (Railway)** | ❌ No | Port for Express server (defaults to `3000`) |
| `GEMINI_API_KEY` | **Backend (Railway)** | 🔒 Yes | Google Gemini 2.5 / 3.7 Flash API key |
| `GROQ_API_KEY` | **Backend (Railway)** | 🔒 Yes | Optional fallback LLM key (Llama 3.3 70B) |
| `DATABASE_URL` | **Backend (Railway)** | 🔒 Yes | Neon PostgreSQL connection string with `pgvector` |
| `CLOUDINARY_CLOUD_NAME` | **Backend (Railway)** | 🔒 Yes | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | **Backend (Railway)** | 🔒 Yes | Cloudinary API access key |
| `CLOUDINARY_API_SECRET` | **Backend (Railway)** | 🔒 Yes | Cloudinary secret |

> **Zero Frontend Leakage**: Only `VITE_API_URL` is exposed to the browser. All Gemini keys, Groq credentials, database strings, and Cloudinary secrets remain strictly inside the Railway backend container.

---

## 🛠️ Local Development

```bash
# Backend
cd backend
npm install
npm run dev
# → http://localhost:3000

# Frontend (separate terminal)
cd frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev
# → http://localhost:5173
```

---

## 🗺️ v2 Roadmap (Not Yet Built — Documented for Depth)

These are deliberate scope cuts for hackathon timeboxing, not blind spots:

- **Identity vs. curiosity vector separation** — a slow-moving "who you are becoming" signal blended with a fast-decaying "what just caught your eye" signal, rather than one flat interest state.
- **ZPD-based difficulty sequencing** — inferring a student's skill ceiling from *bounce rate per difficulty tier*, not just static tag matching, and recommending just above that ceiling.
- **Thompson-sampling bandit allocation** — treating each content category as an arm and adaptively reallocating recommendation weight based on real engagement over many sessions, rather than single-shot retrieval.

---

## 🏆 Built For

A hackathon submission demonstrating that a recommendation system can be simultaneously **explainable** (every decision traceable through 5 inspectable stages), **mathematically calibrated** (confidence derived from real posterior entropy, not a guess), and **quality-conscious** (an adversarial filter that actively refuses engagement-maximizing hype) — without asking anyone to change their scrolling habits.
