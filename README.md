# NotePadPro AI

[![CI](https://github.com/yoavSilber/NotePadPro-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/yoavSilber/NotePadPro-AI/actions/workflows/ci.yml)

**[Live Demo →](https://note-pad-pro-ai.vercel.app)**

A full-stack, production-deployed note-taking app with two AI features: **abstractive summarization** powered by the Claude API (Anthropic) and **semantic search** using sentence-transformer embeddings. The ML logic runs as an isolated Python microservice; the main backend is Node.js/Express with JWT auth and MongoDB; the frontend is React 19 with TypeScript.

---

## Architecture

```
┌──────────────────────────────┐
│       React 19 Frontend      │  Vite · TypeScript · deployed on Vercel
│  - Summarize button per note │
│  - Debounced semantic search │
│  - JWT-based session state   │
└──────────────┬───────────────┘
               │ HTTPS · Bearer JWT
               ▼
┌──────────────────────────────┐
│     Express / Node.js API    │  TypeScript · deployed on Railway
│  - JWT auth + bcrypt         │
│  - Ownership enforcement     │
│  - Content-hash caching      │
│  - Cosine similarity ranking │
└──────┬───────────────────────┘
       │ internal HTTP
       ├──────────────────────────────────────┐
       ▼                                      ▼
┌─────────────────────┐           ┌───────────────────────┐
│   FastAPI ML svc    │           │        MongoDB         │
│   Python 3.13       │           │  notes · users         │
│                     │           │  summary cache         │
│  /summarize         │           │  384-dim embeddings    │
│   → Claude Haiku    │           └───────────────────────┘
│  /embed             │
│   → MiniLM-L6-v2   │
└─────────────────────┘
```

---

## Features

### ✨ AI Abstractive Summarization
Click **Summarize** on any note — the content is sent to the Python microservice, which calls **Claude Haiku** (Anthropic's fastest model) with a carefully crafted system prompt. The result is a genuine 1–2 sentence paraphrase, not a copy of the original text.

- **Smart caching:** the summary and a SHA-256 hash of the note content are stored in MongoDB. Re-clicking Summarize is instant. If you edit the note, the hash no longer matches and the summary regenerates automatically.
- **Warm-up handling:** the backend detects 503/504 responses from the ML service, auto-retries after a short delay, and surfaces a friendly "warming up" message to the user rather than a raw error.
- **Swappable backends:** a single environment variable (`USE_CLAUDE_API` / `USE_HF_INFERENCE_API`) switches the summarizer between Claude API, Hugging Face Inference API, or a locally loaded BART model — no code change needed.

### 🔍 Semantic Search
Type in the search bar and the backend finds notes by *meaning*, not just exact keywords. Searching "cooking" can surface a note titled "pasta recipe" even if the word "cooking" never appears.

- Notes are **automatically embedded** in the background whenever they are created or updated (fire-and-forget, non-blocking).
- At query time the backend embeds the search query, loads all of the logged-in user's note vectors, and ranks them by **cosine similarity**.
- Results are strictly scoped to the current user — you can never see another user's notes.

### 📝 Markdown Preview
Each note has a toggle that switches between plain-text editing and a rendered markdown view — headings, bold, lists, and code blocks all render correctly. XSS prevention is handled by ReactMarkdown's sanitizer + URL allowlisting.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework with concurrent features |
| **TypeScript** | End-to-end type safety |
| **Vite** | Fast dev server and production bundler |
| **React Router v6** | Client-side routing (SPA) |
| **Axios** | HTTP client with configurable timeouts and interceptors |
| **react-markdown** | Safe markdown rendering with XSS protection |
| **CSS custom properties** | Design-token system: one source of truth for color, spacing, typography, dark mode |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **TypeScript** | Fully typed controllers, services, and models |
| **Mongoose** | MongoDB ODM — schema validation, typed queries |
| **JSON Web Tokens (JWT)** | Stateless authentication — tokens signed with `HS256` |
| **bcrypt** | Password hashing with salt rounds before storage |
| **SHA-256 content hashing** | Cache-invalidation key for AI summaries |
| **Axios (outbound)** | HTTP client for ML service calls with timeout + typed error boundaries |
| **In-memory cosine similarity** | Vector ranking for semantic search (no external vector DB needed at this scale) |

### ML Service
| Technology | Purpose |
|---|---|
| **Python 3.13 + FastAPI** | High-performance async API with auto-generated OpenAPI docs |
| **Pydantic** | Request/response validation (like TypeScript interfaces for Python) |
| **Anthropic SDK** | Claude Haiku API calls for production summarization |
| **sentence-transformers** | `all-MiniLM-L6-v2` — 384-dim embeddings in <50ms |
| **Hugging Face Transformers** | Local BART model (dev/offline fallback) |
| **uvicorn** | ASGI server for production use |

### Database
| Technology | Purpose |
|---|---|
| **MongoDB** | Document store for notes, users, embeddings, and summary cache |
| **MongoDB Atlas** | Production hosted cluster (free tier M0) |

### DevOps & Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | One-command local dev (`docker compose up`) |
| **Multi-stage Docker builds** | Separate builder / runtime stages — keeps images lean |
| **GitHub Actions CI** | Runs backend (Jest), frontend (Playwright), and ML service (pytest) on every push |
| **Railway** | Backend + ML service hosting |
| **Vercel** | Frontend hosting with automatic deploy on push |

---

## Authentication & Security

- **Registration:** password hashed with bcrypt (10 salt rounds) before being stored — plaintext never touches the database.
- **Login:** credentials verified against the hash; on success the server issues a signed JWT (24h expiry).
- **Protected routes:** every mutating endpoint (`POST /notes`, `PUT`, `DELETE`, summarize) is gated by a `userExtractor` middleware that validates the JWT and attaches the decoded user to the request.
- **Ownership enforcement:** update, delete, and summarize operations compare the note's `user` field against the authenticated user — a 403 is returned if they don't match.
- **Search scoping:** the semantic search query only loads embeddings for notes owned by the current user, so cross-user data leakage is impossible at the query level.

---

## Smart Caching

Two layers of caching prevent redundant AI inference:

1. **Summary cache (MongoDB):** when a note is summarized, the response and a SHA-256 hash of the note content are stored alongside the note document. On a subsequent summarize request, the backend compares the current content hash to the stored one — if they match, it returns the cached summary immediately without calling the ML service.

2. **Embedding cache (MongoDB):** same pattern for vector embeddings. Each note stores its 384-dim embedding and an `embeddingHash`. The embedding is only regenerated when the content actually changes.

This means:
- Re-clicking **Summarize** on an unchanged note: **0ms** (DB read only).
- Editing a note then summarizing: fresh inference, new cache entry.

---

## Getting Started

### Option A — Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/yoavSilber/NotePadPro-AI.git
cd NotePadPro-AI
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| ML service | http://localhost:8000 |

> **First build:** downloads MiniLM (~80MB) and optionally BART (~1.6GB) into the image. Every build after that is fast thanks to Docker layer caching.

### Option B — Manual (three terminals)

**Prerequisites:** Node.js 20+, Python 3.13, MongoDB running locally.

```bash
# Terminal 1 — ML service
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload

# Terminal 2 — Backend
cd backend
cp .env.example .env   # fill in values below
npm install
npm run dev

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev
```

#### Backend `.env`
```env
MONGODB_URI=mongodb://localhost:27017/notepadpro
JWT_SECRET=your-secret-here
PORT=3001
ML_SERVICE_URL=http://localhost:8000
```

#### ML service env (optional — use Claude API instead of local BART)
```env
USE_CLAUDE_API=true
ANTHROPIC_API_KEY=sk-ant-...
```

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/users` | — | Register new user |
| `POST` | `/login` | — | Login, returns signed JWT |

### Notes
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/notes` | — | Paginated note list |
| `GET` | `/notes/:id` | — | Single note |
| `POST` | `/notes` | ✓ | Create note (auto-embeds async) |
| `PUT` | `/notes/:id` | ✓ owner | Update note (re-embeds async) |
| `DELETE` | `/notes/:id` | ✓ owner | Delete note |
| `POST` | `/notes/:id/summarize` | ✓ owner | Claude summary (cached by content hash) |

### Search
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/search?q=...` | ✓ | Semantic search over own notes |

### ML service (internal)
| Method | Path | Description |
|---|---|---|
| `POST` | `/summarize` | Abstractive summary (Claude / BART) |
| `POST` | `/embed` | 384-dim MiniLM embedding |
| `GET` | `/health` | Liveness check |

---

## Running Tests

```bash
# Backend — Jest + Supertest (ML service is mocked)
cd backend && npm test

# Frontend — Playwright end-to-end
cd frontend && npm test

# ML service — pytest (both models mocked, no download needed)
cd ml-service && pytest tests/ -v
```

---

## Project Structure

```
NotePadPro-AI/
├── frontend/                        # React 19 + TypeScript (Vite)
│   └── src/
│       ├── components/
│       │   ├── Note.tsx             # Summarize button · markdown toggle
│       │   ├── SearchBar.tsx        # Debounced semantic search input
│       │   └── Pagination.tsx       # Page controls
│       ├── pages/
│       │   ├── HomePage.tsx         # Main note list + add form
│       │   ├── LoginPage.tsx        # JWT login
│       │   └── CreateUserPage.tsx   # Register + auto-login
│       ├── services/
│       │   ├── notesService.ts      # CRUD + summarize API calls
│       │   ├── searchService.ts     # Semantic search API call
│       │   ├── cacheService.ts      # Client-side cache helpers
│       │   └── errorService.ts      # Friendly error message mapping
│       ├── contexts/                # Auth context (JWT state)
│       └── index.css                # Design token system (CSS custom properties)
│
├── backend/                         # Express + TypeScript
│   ├── controllers/
│   │   ├── noteController.ts        # CRUD + summarize handlers
│   │   ├── searchController.ts      # Search handler
│   │   └── userController.ts        # Register + login handlers
│   ├── services/
│   │   ├── mlService.ts             # HTTP client → Python ML service
│   │   ├── noteService.ts           # Business logic · summary cache · embed-on-write
│   │   └── searchService.ts         # Cosine similarity ranking
│   ├── models/
│   │   ├── noteModel.ts             # Mongoose schema (content, summary, embedding, hashes)
│   │   └── userModel.ts             # Mongoose schema (username, bcrypt hash)
│   ├── middlewares/
│   │   ├── auth.ts                  # JWT extraction + validation
│   │   ├── errorHandler.ts          # Typed error → HTTP status mapping
│   │   └── logger.ts                # Request logging
│   └── tests/                       # Jest: auth, CRUD, summarize cache, search scoping
│
├── ml-service/                      # FastAPI + Python 3.13
│   ├── main.py                      # /summarize · /embed endpoints
│   ├── claude_summarizer.py         # Claude Haiku wrapper (production)
│   ├── hf_summarizer.py             # HF Inference API wrapper (alternative)
│   ├── summarizer.py                # Local BART wrapper (dev fallback)
│   ├── embedder.py                  # MiniLM-L6-v2 wrapper
│   ├── evaluate.py                  # ROUGE evaluation script
│   ├── sample_texts.csv             # Reference summaries for eval
│   └── tests/                       # pytest: summarizer + embedder unit tests
│
├── docker-compose.yml               # 4-service local dev stack
├── scripts/                         # Utility scripts (e.g. backfill embeddings)
└── .github/workflows/ci.yml         # CI: runs all 3 test suites on push
```

---

## What I Learned

- **Polyglot microservices** — designing clean HTTP boundaries between a Node.js API and a Python ML service, with typed error classes on each side
- **LLM API integration** — system prompt engineering, cost-aware model selection (Claude Haiku at ~$0.003/1M tokens), and graceful degradation when the API is unavailable
- **ML inference trade-offs** — why instruction-following LLMs produce better short-form summaries than seq2seq models like BART; how to cache inference results to eliminate redundant API calls
- **Vector search from scratch** — embedding documents at write time, storing 384-dim float arrays in MongoDB, and ranking at query time with cosine similarity — no external vector DB required at this scale
- **Production-aware Dockerization** — multi-stage builds, healthcheck-gated startup order, volume-mounted model weight caching
- **Security in depth** — bcrypt password hashing, JWT validation middleware, per-resource ownership checks, XSS-safe markdown rendering

---

## Related Project

[NotePadPro](https://github.com/yoavSilber/NotePadPro) — the original version this project extends, without the AI layer.
