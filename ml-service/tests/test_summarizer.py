"""
Tests for the Summarizer class.

The HuggingFace pipeline is mocked so these run instantly without
downloading the 1.6GB BART model — CI stays fast and cheap.
"""

from unittest.mock import MagicMock, patch
import pytest

MOCK_SUMMARY = "This is a mocked summary output."


@pytest.fixture
def summarizer():
    with patch("summarizer.pipeline") as mock_pipeline:
        mock_pipe = MagicMock()
        mock_pipe.return_value = [{"summary_text": MOCK_SUMMARY}]
        mock_pipeline.return_value = mock_pipe

        from summarizer import Summarizer
        yield Summarizer()


def test_summarize_returns_string(summarizer):
    result = summarizer.summarize("A" * 100)
    assert isinstance(result, str)
    assert len(result) > 0


def test_summarize_returns_expected_mock_output(summarizer):
    result = summarizer.summarize("A" * 100)
    assert result == MOCK_SUMMARY


def test_summarize_accepts_max_and_min_length(summarizer):
    # Should not raise — custom lengths are passed through to the pipeline
    result = summarizer.summarize("A" * 100, max_length=50, min_length=10)
    assert isinstance(result, str)


def test_summarize_short_text_is_handled_by_api_layer():
    # The Summarizer itself does not enforce minimum length —
    # that validation lives in the FastAPI endpoint (tested via the API).
    # This test documents that design decision explicitly.
    with patch("summarizer.pipeline") as mock_pipeline:
        mock_pipe = MagicMock()
        mock_pipe.return_value = [{"summary_text": "short"}]
        mock_pipeline.return_value = mock_pipe

        from summarizer import Summarizer
        s = Summarizer()
        result = s.summarize("Hi")
        assert isinstance(result, str)
