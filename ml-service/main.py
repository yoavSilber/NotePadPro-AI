"""
FastAPI server for the summarization microservice.

KEY CONCEPTS:
- FastAPI is a modern Python web framework (like Express.js but for Python).
- Pydantic models define the shape of request/response data (like TypeScript interfaces).
- The model loads ONCE when the server starts and stays in memory for all requests.
  This avoids reloading the ~1.6GB model on every request.

Run with: uvicorn main:app --port 8000 --reload
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from summarizer import Summarizer
from embedder import Embedder

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

# Both models load once at startup and stay in memory for all requests.
summarizer = Summarizer()
embedder = Embedder()


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
        raise HTTPException(status_code=400, detail="Text is too short to summarize")

    summary = summarizer.summarize(req.text, req.max_length, req.min_length)
    return SummarizeResponse(summary=summary)


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    vector = embedder.embed(req.text)
    return EmbedResponse(embedding=vector)


@app.get("/health")
def health():
    return {"status": "ok"}
