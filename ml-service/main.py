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

app = FastAPI(
    title="NotePad Pro Summarizer",
    description="AI-powered text summarization using BART",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup — this takes a few seconds on first run
model = Summarizer()


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


@app.post("/summarize", response_model=SummarizeResponse)
def summarize(req: SummarizeRequest):
    """
    Takes a text and returns its summary.
    The heavy lifting is done by the Summarizer class (which uses PyTorch + BART).
    """
    if len(req.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Text is too short to summarize")

    summary = model.summarize(req.text, req.max_length, req.min_length)
    return SummarizeResponse(summary=summary)


@app.get("/health")
def health():
    return {"status": "ok"}
