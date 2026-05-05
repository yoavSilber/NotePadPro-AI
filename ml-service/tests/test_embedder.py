"""
Tests for the Embedder class.

sentence_transformers is mocked at the sys.modules level before embedder.py
is imported, so these run without downloading the model or installing the
full package. This is the correct pattern when a module is imported at the
top level of the file under test.
"""

import math
import sys
from unittest.mock import MagicMock
import numpy as np
import pytest


def make_unit_vector(dim=384):
    """Return a normalized random vector — matches what the real model produces."""
    v = np.random.rand(dim).astype(np.float32)
    return v / np.linalg.norm(v)


@pytest.fixture
def embedder():
    # Inject a fake sentence_transformers module before embedder.py is imported
    mock_st_module = MagicMock()
    mock_model_instance = MagicMock()
    mock_model_instance.encode.return_value = make_unit_vector(384)
    mock_st_module.SentenceTransformer.return_value = mock_model_instance

    sys.modules.setdefault("sentence_transformers", mock_st_module)

    # Remove cached embedder module so the fixture always gets a fresh import
    sys.modules.pop("embedder", None)

    from embedder import Embedder
    yield Embedder()

    sys.modules.pop("embedder", None)


def test_embed_returns_list(embedder):
    result = embedder.embed("Hello world")
    assert isinstance(result, list)


def test_embed_returns_384_dimensions(embedder):
    result = embedder.embed("Hello world")
    assert len(result) == 384


def test_embed_values_are_floats(embedder):
    result = embedder.embed("Hello world")
    assert all(isinstance(v, float) for v in result)


def test_embed_vector_is_normalized(embedder):
    # Cosine similarity math requires unit vectors.
    # normalize_embeddings=True in the real model ensures this.
    result = embedder.embed("Hello world")
    magnitude = math.sqrt(sum(v ** 2 for v in result))
    assert abs(magnitude - 1.0) < 1e-5
