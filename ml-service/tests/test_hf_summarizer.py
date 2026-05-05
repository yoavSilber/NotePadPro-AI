"""
Tests for HFSummarizer — the production path that calls the Hugging Face
Inference API instead of running BART locally.

All tests mock requests.post so no real HTTP calls are made.
"""

from unittest.mock import MagicMock, patch
import pytest
import requests as requests_lib


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_response(status_code: int, json_body=None, text: str = ""):
    """Build a mock requests.Response."""
    mock_resp = MagicMock()
    mock_resp.status_code = status_code
    mock_resp.ok = 200 <= status_code < 300
    mock_resp.text = text
    mock_resp.json.return_value = json_body if json_body is not None else {}
    return mock_resp


# ---------------------------------------------------------------------------
# Fixture — HFSummarizer with a fake token
# ---------------------------------------------------------------------------

@pytest.fixture
def hf_summarizer():
    with patch.dict("os.environ", {"HF_API_TOKEN": "test-token"}):
        # Import fresh each time so the env patch takes effect
        import importlib
        import hf_summarizer as mod
        importlib.reload(mod)
        yield mod.HFSummarizer()


# ---------------------------------------------------------------------------
# Tests — happy path
# ---------------------------------------------------------------------------

def test_summarize_returns_summary(hf_summarizer):
    ok_response = _make_response(200, json_body=[{"summary_text": "A concise summary."}])
    with patch("requests.post", return_value=ok_response):
        result = hf_summarizer.summarize("Some long text " * 20)
    assert result == "A concise summary."


# ---------------------------------------------------------------------------
# Tests — HF error responses
# ---------------------------------------------------------------------------

def test_503_raises_runtime_error_with_retry_hint(hf_summarizer):
    resp = _make_response(503, json_body={"estimated_time": 20.0})
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="warming up"):
            hf_summarizer.summarize("text " * 20)


def test_503_without_estimated_time(hf_summarizer):
    resp = _make_response(503, json_body={})
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="retry"):
            hf_summarizer.summarize("text " * 20)


def test_429_raises_rate_limit_error(hf_summarizer):
    resp = _make_response(429, text="Too Many Requests")
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="rate limit"):
            hf_summarizer.summarize("text " * 20)


def test_401_raises_auth_error(hf_summarizer):
    resp = _make_response(401, text="Unauthorized")
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="authentication failed"):
            hf_summarizer.summarize("text " * 20)


def test_403_raises_auth_error(hf_summarizer):
    resp = _make_response(403, text="Forbidden")
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="authentication failed"):
            hf_summarizer.summarize("text " * 20)


def test_500_raises_generic_api_error(hf_summarizer):
    resp = _make_response(500, text="Internal Server Error")
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="HF API error 500"):
            hf_summarizer.summarize("text " * 20)


# ---------------------------------------------------------------------------
# Tests — network / timeout errors
# ---------------------------------------------------------------------------

def test_timeout_raises_runtime_error(hf_summarizer):
    with patch("requests.post", side_effect=requests_lib.Timeout):
        with pytest.raises(RuntimeError, match="timed out"):
            hf_summarizer.summarize("text " * 20)


def test_connection_error_raises_runtime_error(hf_summarizer):
    with patch("requests.post", side_effect=requests_lib.ConnectionError("refused")):
        with pytest.raises(RuntimeError, match="Could not reach"):
            hf_summarizer.summarize("text " * 20)


# ---------------------------------------------------------------------------
# Tests — malformed API responses
# ---------------------------------------------------------------------------

def test_empty_list_response_raises(hf_summarizer):
    resp = _make_response(200, json_body=[])
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="Unexpected"):
            hf_summarizer.summarize("text " * 20)


def test_missing_summary_text_key_raises(hf_summarizer):
    # Dict present but key is missing — should raise RuntimeError, not KeyError
    resp = _make_response(200, json_body=[{"other_key": "value"}])
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="Unexpected"):
            hf_summarizer.summarize("text " * 20)


def test_non_json_response_raises(hf_summarizer):
    resp = _make_response(200, text="<html>not json</html>")
    resp.json.side_effect = ValueError("not valid json")
    with patch("requests.post", return_value=resp):
        with pytest.raises(RuntimeError, match="non-JSON"):
            hf_summarizer.summarize("text " * 20)


# ---------------------------------------------------------------------------
# Tests — missing token
# ---------------------------------------------------------------------------

def test_missing_token_raises_on_init():
    with patch.dict("os.environ", {}, clear=True):
        import importlib
        import hf_summarizer as mod
        importlib.reload(mod)
        with pytest.raises(RuntimeError, match="HF_API_TOKEN"):
            mod.HFSummarizer()
