"""
Production summarizer — calls the Hugging Face Inference API instead of
running BART locally. Same model (facebook/bart-large-cnn), same output,
but zero memory cost on the server.

Used when USE_HF_INFERENCE_API=true is set in the environment.
"""

import os
import requests


class HFSummarizer:
    API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"

    def __init__(self):
        token = os.environ.get("HF_API_TOKEN")
        if not token:
            raise RuntimeError("HF_API_TOKEN environment variable is not set")
        self.headers = {"Authorization": f"Bearer {token}"}

    def summarize(self, text: str, max_length: int = 130, min_length: int = 30) -> str:
        payload = {
            "inputs": text,
            "parameters": {
                "max_length": max_length,
                "min_length": min_length,
                "do_sample": False,
                "truncation": True,
            },
        }

        response = requests.post(self.API_URL, headers=self.headers, json=payload, timeout=60)

        if response.status_code == 503:
            # Model is loading on HF side — happens on cold start, retry
            raise RuntimeError("HF model is loading, please retry in a moment")

        if not response.ok:
            raise RuntimeError(f"HF API error {response.status_code}: {response.text}")

        result = response.json()

        # HF returns a list: [{"summary_text": "..."}]
        if isinstance(result, list) and result:
            return result[0]["summary_text"]

        raise RuntimeError(f"Unexpected HF API response format: {result}")
