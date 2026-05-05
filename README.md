# NotePadPro AI

[![CI](https://github.com/yoavSilber/NotePadPro-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/yoavSilber/NotePadPro-AI/actions/workflows/ci.yml)

A full-stack note-taking app with two AI features built in: **abstractive summarization** (Meta's BART) and **semantic search** (sentence-transformer embeddings). The ML logic runs as a separate Python microservice; the main backend is Node.js/Express; the frontend is React 19.

---

## Architecture

```
┌──────────────────────┐
│    React Frontend    │  Vite · TypeScript · port 3000
│  Summarize button    │
│  Semantic search bar │
└──────────┬───────────┘
           │ JWT-authenticated REST
           ▼
┌──────────────────────┐
│   Express Backend    │  Node.js · TypeScript · port 3001
│  Auth · CRUD · Cache │
│  Cosine similarity   │
└────────┬─────────────┘
         │ internal HTTP
         ├──────────────────────────────┐
         ▼                              ▼
┌─────────────────┐          ┌──────────────────┐
│  FastAPI ML svc │          │    MongoDB        │
│  /summarize     │          │  notes · users    │
│    BART-large   │          │  embeddings       │
│  /embed         │          └──────────────────┘
│    MiniLM-L6    │
└─────────────────┘
```

---

## AI Features

### Abstractive Summarization
Logged-in users can click **Summarize** on any of their notes. The note content is sent to the Python service, which runs it through **facebook/bart-large-cnn** — a model trained by Meta on CNN/DailyMail news articles. The generated summary is cached in MongoDB (keyed by a SHA-256 hash of the content), so re-clicking is instant unless the note was edited.

### Semantic Search
A search bar appears above the note list when logged in. Typing queries the `/search` endpoint, which:
1. Embeds the query using **all-MiniLM-L6-v2** (~80MB, <50ms)
2. Loads the user's notes that have stored embeddings
3. Ranks them by cosine similarity and returns the top results

Notes are automatically embedded in the background whenever they are created or updated — no manual indexing step.

### ROUGE Evaluation (summarizer)

Run `python evaluate.py` inside `ml-service/` to measure summarization quality against human reference summaries:

| Metric  | Score |
|---------|-------|
| ROUGE-1 | —     |
| ROUGE-2 | —     |
| ROUGE-L | —     |

> Run `python evaluate.py` once to fill in the scores above.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Axios, react-markdown |
| Backend | Node.js, Express, TypeScript, Mongoose |
| ML service | Python 3.13, FastAPI, Hugging Face Transformers, sentence-transformers |
| Database | MongoDB |
| Auth | JWT + bcrypt |
| Testing | Jest + Supertest, Playwright, pytest |
| DevOps | Docker, Docker Compose, GitHub Actions CI |

---

## Getting Started

### Option A — Docker (recommended, one command)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/yoavSilber/NotePadPro-AI.git
cd NotePadPro-AI
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- ML service: http://localhost:8000

> **First build takes 10–20 minutes** — it downloads and bakes the BART model (~1.6GB) and MiniLM (~80MB) into the image. Every build after that is fast thanks to Docker layer caching.

### Option B — Manual (three terminals)

**Prerequisites:** Node.js 20+, Python 3.13, MongoDB running locally.

```bash
# Terminal 1 — ML service
cd ml-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000

# Terminal 2 — Backend
cd backend
cp .env.example .env   # fill in MONGODB_URI and JWT_SECRET
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

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/users` | — | Register |
| POST | `/login` | — | Login, returns JWT |

### Notes
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notes` | — | Paginated list |
| GET | `/notes/:id` | — | Single note |
| POST | `/notes` | ✓ | Create note (auto-embeds) |
| PUT | `/notes/:id` | ✓ owner | Update note (re-embeds) |
| DELETE | `/notes/:id` | ✓ owner | Delete note |
| POST | `/notes/:id/summarize` | ✓ owner | BART summary (cached) |

### Search
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search?q=...` | ✓ | Semantic search over own notes |

### ML service (internal)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/summarize` | Abstractive summary via BART |
| POST | `/embed` | 384-dim embedding via MiniLM |
| GET | `/health` | Health check |

---

## Running Tests

```bash
# Backend (Jest + Supertest) — mocks the ML service
cd backend && npm test

# Frontend (Playwright E2E) — requires running servers
cd frontend && npm test

# ML service (pytest) — mocks both models, no download needed
cd ml-service && pytest tests/ -v

# ROUGE evaluation — runs the real BART model
cd ml-service && python evaluate.py
```

---

## Project Structure

```
NotePadPro-AI/
├── frontend/                  # React 19 + TypeScript (Vite)
│   └── src/
│       ├── components/
│       │   ├── Note.tsx       # Summarize button · markdown preview
│       │   └── SearchBar.tsx  # Debounced semantic search
│       ├── services/
│       │   ├── notesService.ts
│       │   └── searchService.ts
│       └── pages/HomePage.tsx
├── backend/                   # Express + TypeScript
│   ├── controllers/
│   ├── services/
│   │   ├── mlService.ts       # HTTP wrapper → Python service
│   │   ├── noteService.ts     # Summarize cache · embed on write
│   │   └── searchService.ts   # Cosine similarity ranking
│   ├── routes/
│   └── tests/                 # Jest: 9 tests
├── ml-service/                # FastAPI + Python
│   ├── main.py                # /summarize · /embed endpoints
│   ├── summarizer.py          # BART wrapper
│   ├── embedder.py            # MiniLM wrapper
│   ├── evaluate.py            # ROUGE evaluation script
│   └── tests/                 # pytest: 8 tests (mocked)
├── docker-compose.yml
└── .github/workflows/ci.yml   # Runs all 3 test suites on push
```

---

## What I Learned

- Designing a **polyglot microservices system** — Node.js calling Python over HTTP, with typed error boundaries between them
- **ML inference trade-offs** — BART is accurate but slow (2–3s CPU); MiniLM is fast enough for real-time search (<50ms); content-hash caching eliminates redundant inference
- **Vector search fundamentals** — embedding notes at write time, storing 384-dim vectors in MongoDB, cosine similarity ranking at query time
- **Production-aware Dockerization** — multi-stage builds, pre-baking model weights into images, healthcheck-gated service startup order
- **Security in AI features** — XSS prevention in markdown rendering, URL sanitisation in ReactMarkdown, user-scoped search results

---

## Related Project

[NotePadPro](https://github.com/yoavSilber/NotePadPro) — the original version this project extends, without the AI layer.
