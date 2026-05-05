import logging

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Expected embedding dimensionality.  If the upstream model ever changes this,
# we catch it immediately at the first encode() call rather than silently
# returning vectors of the wrong size to downstream consumers.
EXPECTED_DIM = 384

# all-MiniLM-L6-v2 uses a 256-token window.  Anything longer is silently
# truncated by the library.  We warn when the input is suspiciously long so
# callers know they may be losing information.
_APPROX_CHAR_LIMIT = 1_500  # rough chars-per-256-tokens estimate


class Embedder:
    def __init__(self):
        # all-MiniLM-L6-v2: ~80MB, 384-dim vectors, fast on CPU (~5ms per text).
        # Designed specifically for semantic similarity — much better than using
        # BART's encoder for this purpose.
        try:
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self._available = True
        except Exception as exc:
            # Don't crash the whole server — /summarize can still work.
            logger.error("Failed to load MiniLM embedder: %s", exc, exc_info=True)
            self.model = None
            self._available = False

    def embed(self, text: str) -> list[float]:
        if not self._available:
            raise RuntimeError("Embedding model failed to load at startup — check server logs")

        if len(text) > _APPROX_CHAR_LIMIT:
            logger.warning(
                "embed() received %d chars; MiniLM truncates at ~256 tokens "
                "(≈%d chars). Embedding covers only the beginning of the text.",
                len(text),
                _APPROX_CHAR_LIMIT,
            )

        vector = self.model.encode(text, normalize_embeddings=True)
        result = vector.tolist()

        if len(result) != EXPECTED_DIM:
            raise RuntimeError(
                f"Embedding has {len(result)} dimensions but {EXPECTED_DIM} were expected. "
                "The model may have been updated — check all-MiniLM-L6-v2 upstream."
            )

        return result
