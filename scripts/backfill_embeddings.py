"""
One-time script to backfill embeddings for all notes that don't have them yet.
Run with: python scripts/backfill_embeddings.py

Requires: pip install pymongo requests
"""

import hashlib
import os
import sys
import requests
from pymongo import MongoClient

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb+srv://silberyoav_db_user:H8plfD65NITxmwTG@notepadpro.0l4zn8b.mongodb.net/notepadpro?appName=notepadpro")
ML_SERVICE_URL = os.environ.get("ML_SERVICE_URL", "https://selfless-endurance-production-89ec.up.railway.app")


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def embed(text: str) -> list:
    response = requests.post(
        f"{ML_SERVICE_URL}/embed",
        json={"text": text},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["embedding"]


def main():
    client = MongoClient(MONGODB_URI)
    db = client.get_default_database()
    notes = db["notes"]

    # Find all notes that don't have an embedding yet
    to_embed = list(notes.find({"embeddingHash": {"$exists": False}}))
    print(f"Found {len(to_embed)} notes without embeddings")

    success = 0
    for note in to_embed:
        content = note.get("content", "")
        if not content.strip():
            print(f"  Skipping '{note.get('title')}' — empty content")
            continue
        try:
            vector = embed(content)
            notes.update_one(
                {"_id": note["_id"]},
                {"$set": {
                    "embedding": vector,
                    "embeddingHash": sha256(content),
                }},
            )
            print(f"  ✓ Embedded '{note.get('title')}'")
            success += 1
        except Exception as e:
            print(f"  ✗ Failed '{note.get('title')}': {e}")

    print(f"\nDone — {success}/{len(to_embed)} notes embedded")
    client.close()


if __name__ == "__main__":
    main()
