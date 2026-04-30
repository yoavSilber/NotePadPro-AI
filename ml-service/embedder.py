from sentence_transformers import SentenceTransformer


class Embedder:
    def __init__(self):
        # all-MiniLM-L6-v2: ~80MB, 384-dim vectors, fast on CPU (~5ms per text).
        # Designed specifically for semantic similarity — much better than using
        # BART's encoder for this purpose.
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed(self, text: str) -> list[float]:
        vector = self.model.encode(text, normalize_embeddings=True)
        return vector.tolist()
