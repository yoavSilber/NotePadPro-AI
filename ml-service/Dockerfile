FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.hf-cache \
    TRANSFORMERS_OFFLINE=0

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download MiniLM (~80MB) for embeddings — always needed.
# BART is only pre-baked for local dev; in production we use the HF Inference
# API instead (USE_HF_INFERENCE_API=true), so we skip the 1.6GB download.
ARG PREBAKE_BART=false
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
RUN if [ "$PREBAKE_BART" = "true" ]; then \
      python -c "from transformers import pipeline; pipeline('summarization', model='facebook/bart-large-cnn')"; \
    fi

COPY . .

EXPOSE 8000

# start-period gives the container time to load MiniLM before health probes
# start firing.  MiniLM takes ~5-10s on CPU; 60s matches railway.toml's
# healthcheckTimeout and gives headroom for slower cold starts.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
