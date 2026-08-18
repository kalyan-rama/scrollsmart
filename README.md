# ScrollSmart 🧠⚡
### Latent Interest Discovery & Non-Hype Tech Recommender for Short-Form Video Sessions

> **Hackathon Pitch Statement**: While typical social recommendation engines optimize for dopamine and loop-retention by tracking surface keywords, **ScrollSmart** is an AI agent that monitors a student's short-form Reel session, infers their *latent underlying career & technical intent* using Bayesian posterior updates, and recommends one high-signal, non-hype technical deep dive after each watch — backed by full explainability, adversarial hype filtering, and calibrated confidence scoring.

---

## 🏗️ Production Architecture

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
├── README.md                     # Deployment & Architecture Guide
└── .env.example                  # Root Environment Template
```

---

## 🚀 Deployment Guide

### 1. Deploy Backend to Railway 🚂

1. **Create a Railway Project**:
   - Go to [railway.app](https://railway.app) and create a **New Project**.
   - Select **Deploy from GitHub repo** and point it to your repository.
   - In project settings, set the **Root Directory** to `backend`.

2. **Configure Environment Variables** in Railway Dashboard:
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

3. **Deploy & Get Backend URL**:
   - Railway will build with `npm run build` (`esbuild`) and start via `npm start` (`node dist/server.cjs`).
   - Generate a domain (e.g., `https://scrollsmart-backend-production.up.railway.app`).
   - Verify health at `https://your-backend.up.railway.app/api/health`.

---

### 2. Deploy Frontend to Vercel ▲

1. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **Add New Project**.
   - Select your GitHub repository.
   - Set **Root Directory** to `frontend`.
   - Framework Preset: **Vite**.

2. **Set Environment Variables** in Vercel:
   ```env
   VITE_API_URL=https://your-backend.up.railway.app
   ```
   *(Ensure no trailing slash)*

3. **Deploy**:
   - Vercel automatically runs `npm run build` and outputs to `dist/`.
   - `frontend/vercel.json` provides automatic SPA route rewriting to `/index.html`.

4. **Update Backend CORS**:
   - Copy your Vercel URL (e.g. `https://scrollsmart.vercel.app`) and update `FRONTEND_URL` in your Railway backend variables.

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

> [!IMPORTANT]
> **Zero Frontend Leakage**: Only `VITE_API_URL` is exposed to the browser. All Gemini keys, Groq credentials, Database strings, and Cloudinary secrets remain strictly inside the Railway backend container.

---

## ⚡ Core 5-Stage Recommendation Pipeline

1. **Stage 1: AI Semantic Understanding**: Extracts surface format and underlying psychology vectors.
2. **Stage 2: Dirichlet-Bayesian Update**: Multiplies Prior by Semantic Likelihood, weighted by multi-signal engagement metrics (watch %, likes, comments, shares, saves, skips, replays).
3. **Stage 3: pgvector Cosine Retrieval & MMR**: Maximal Marginal Relevance ($\lambda \approx 0.7$) avoids redundant recommendations.
4. **Stage 4: Adversarial Generator–Critic Hype Filter**: Dual regex + LLM critic rejects sensationalist clickbait and listicles.
5. **Stage 5: Calibrated Output**: Emits structured explainability payload with Shannon entropy confidence ratings.

---

## 🛠️ Local Development

### Run Backend
```bash
cd backend
npm install
npm run dev
# Server runs on http://localhost:3000
```

### Run Frontend
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:3000 npm run dev
# Client runs on http://localhost:5173
```
