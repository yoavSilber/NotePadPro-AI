"""
FastAPI server for the summarization microservice.

KEY CONCEPTS:
- FastAPI is a modern Python web framework (like Express.js but for Python).
- Pydantic models define the shape of request/response data (like TypeScript interfaces).
- The model loads ONCE when the server starts and stays in memory for all requests.
  This avoids reloading the ~1.6GB model on every request.

Run with: uvicorn main:app --port 8000 --reload
"""

import math
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from embedder import Embedder

# Summarizer selection (checked in priority order):
#
#   USE_CLAUDE_API=true   → Claude Haiku via Anthropic SDK (best quality,
#                           near-zero cost, requires ANTHROPIC_API_KEY)
#   USE_HF_INFERENCE_API=true → BART-large-xsum via HF Inference API
#                           (free but lower quality, requires HF_API_TOKEN)
#   (default)             → BART-large-xsum loaded locally (no API key,
#                           ~1.6 GB download on first run — dev only)
if os.environ.get("USE_CLAUDE_API", "").lower() == "true":
    from claude_summarizer import ClaudeSummarizer
    summarizer = ClaudeSummarizer()
elif os.environ.get("USE_HF_INFERENCE_API", "").lower() == "true":
    from hf_summarizer import HFSummarizer
    summarizer = HFSummarizer()
else:
    from summarizer import Summarizer
    summarizer = Summarizer()

embedder = Embedder()

app = FastAPI(
    title="NotePad Pro AI Service",
    description="AI-powered summarization (BART) and semantic embeddings (MiniLM)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SummarizeRequest(BaseModel):
    """
    Request body for /summarize.
    Pydantic validates the incoming JSON automatically — if 'text' is missing,
    FastAPI returns a 422 error without you writing any validation code.
    """
    text: str
    max_length: int = 130
    min_length: int = 30


class SummarizeResponse(BaseModel):
    summary: str


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


@app.post("/summarize", response_model=SummarizeResponse)
def summarize(req: SummarizeRequest):
    if len(req.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Text is too short to summarize (need at least 50 non-whitespace characters)")

    try:
        summary = summarizer.summarize(req.text, req.max_length, req.min_length)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return SummarizeResponse(summary=summary)


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        vector = embedder.embed(req.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Guard against NaN/Inf values that would silently corrupt downstream
    # cosine-similarity calculations (e.g. if the model produces degenerate output).
    if any(not math.isfinite(v) for v in vector):
        raise HTTPException(
            status_code=500,
            detail="Embedding contains non-finite values (NaN/Inf) — this is a model bug",
        )

    return EmbedResponse(embedding=vector)


@app.get("/health")
def health():
    return {"status": "ok", "embedder_available": embedder._available}
