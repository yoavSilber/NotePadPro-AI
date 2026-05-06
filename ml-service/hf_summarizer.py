"""
Production summarizer — calls the Hugging Face Inference API instead of
running BART locally. Same model (facebook/bart-large-cnn), same output,
but zero memory cost on the server.

Used when USE_HF_INFERENCE_API=true is set in the environment.
"""

import os
import random

import requests


class HFSummarizer:
    API_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn"

    def __init__(self):
        token = os.environ.get("HF_API_TOKEN")
        if not token:
            raise RuntimeError("HF_API_TOKEN environment variable is not set")
        self.headers = {"Authorization": f"Bearer {token}"}

    def summarize(self, text: str, max_length: int = 130, min_length: int = 30) -> str:
        # Adapt the length budget to the input.  BART-large-CNN was trained on
        # long news articles, so given a short paragraph it just copies whole
        # sentences (extractive) rather than rewriting them (abstractive).
        # Targeting ~35-40% of the input length forces real compression.
        word_count = len(text.split())
        target_max = max(30, min(max_length, int(word_count * 0.4)))
        target_min = max(12, min(min_length, int(word_count * 0.15)))

        # Jitter max_length so each request payload is unique — HF Inference API
        # caches identical payloads, so even with do_sample=True we'd get the
        # same cached response back without this.
        jittered_max = target_max + random.randint(-8, 8)
        jittered_max = max(target_min + 5, jittered_max)

        payload = {
            "inputs": text,
            "parameters": {
                "max_length": jittered_max,
                "min_length": target_min,
                "do_sample": True,
                "temperature": 0.9,
                "top_p": 0.95,
                # length_penalty < 1.0 actively discourages keeping long
                # verbatim chunks of the input — pushes the model towards
                # rephrasing instead of copying.
                "length_penalty": 0.7,
                # Prevent reusing 3-grams from the source verbatim — the
                # model has to find different phrasings.
                "no_repeat_ngram_size": 3,
                "truncation": True,
            },
        }

        try:
            response = requests.post(
                self.API_URL, headers=self.headers, json=payload, timeout=60
            )
        except requests.Timeout:
            raise RuntimeError(
                "HF Inference API timed out after 60 s — the model may be under heavy load"
            )
        except requests.ConnectionError as exc:
            raise RuntimeError(f"Could not reach HF Inference API: {exc}") from exc

        if response.status_code == 503:
            # Model is loading on HF side — happens on cold start.
            # estimated_time is sometimes included in the JSON body.
            try:
                wait = response.json().get("estimated_time")
            except Exception:
                wait = None
            hint = f" (estimated wait: {wait:.0f}s)" if isinstance(wait, (int, float)) else ""
            raise RuntimeError(
                f"HF model is warming up{hint} — please retry in a moment"
            )

        if response.status_code == 429:
            raise RuntimeError(
                "HF Inference API rate limit exceeded — too many requests, please try again later"
            )

        if response.status_code in (401, 403):
            raise RuntimeError(
                "HF API authentication failed — check that HF_API_TOKEN is valid and not expired"
            )

        if not response.ok:
            # Truncate body to 200 chars to avoid leaking large HTML error pages into logs.
            body_preview = response.text[:200]
            raise RuntimeError(
                f"HF API error {response.status_code}: {body_preview}"
            )

        try:
            result = response.json()
        except Exception as exc:
            raise RuntimeError(
                f"HF API returned non-JSON response: {response.text[:200]}"
            ) from exc

        # HF returns a list: [{"summary_text": "..."}]
        if isinstance(result, list) and result:
            summary = result[0].get("summary_text") if isinstance(result[0], dict) else None
            if summary is not None:
                return summary

        raise RuntimeError(f"Unexpected HF API response format: {result}")
