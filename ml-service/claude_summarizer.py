"""
Production summarizer — calls Claude (claude-haiku-4-5) via the Anthropic SDK.

Why Claude instead of BART?
- BART is a sequence-to-sequence model trained on news articles.  It finds
  statistical phrase patterns and recombines them — it doesn't understand
  meaning.  For short, varied note content it often copies the last sentence
  or produces irrelevant output.
- Claude is an instruction-following LLM.  You give it a prompt describing
  what you want, and it actually reads and reasons about the content.  The
  quality difference for short-form note summarisation is dramatic.

Model choice: claude-haiku-4-5
- Fastest and cheapest Claude model (input ~$0.003 / 1M tokens).
- A 200-word note costs a fraction of a cent.
- Quality is more than sufficient for 1-2 sentence summaries.

Used when USE_CLAUDE_API=true is set in the environment.
"""

import os

import anthropic

SYSTEM_PROMPT = """You are a precise note summarizer.
Your job: read the note and write 1–2 sentences that capture the core idea.

Rules:
- Be direct and informative — state the key insight, not what the note is about.
- Do NOT start with "This note", "The author", "The text", or similar meta-phrases.
- Do NOT copy sentences verbatim from the note — paraphrase in your own words.
- Match the register of the note: casual notes get casual summaries, technical notes get precise ones.
- Keep it under 50 words."""


class ClaudeSummarizer:
    def __init__(self):
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")
        self.client = anthropic.Anthropic(api_key=api_key)

    def summarize(self, text: str, max_length: int = 60, min_length: int = 15) -> str:
        """
        Summarize text using Claude Haiku.

        The **_kwargs absorbs max_length/min_length that callers may pass —
        they're meaningless for an LLM but we keep the interface compatible
        with the BART-based summarizers.
        """
        try:
            message = self.client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=120,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": text},
                ],
            )
            return message.content[0].text.strip()
        except anthropic.AuthenticationError:
            raise RuntimeError(
                "Anthropic API authentication failed — check that ANTHROPIC_API_KEY is valid"
            )
        except anthropic.RateLimitError:
            raise RuntimeError(
                "Anthropic API rate limit exceeded — please try again in a moment"
            )
        except anthropic.APIStatusError as exc:
            raise RuntimeError(
                f"Anthropic API error {exc.status_code}: {exc.message}"
            ) from exc
        except Exception as exc:
            raise RuntimeError(
                f"Unexpected error calling Claude API: {exc}"
            ) from exc
