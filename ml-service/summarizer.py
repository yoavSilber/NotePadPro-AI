"""
Summarizer module — wraps a Hugging Face pretrained summarization model.

KEY CONCEPTS:
- A "pretrained model" is a neural network that was already trained on massive amounts of text.
  We download it and use it directly — no training needed on our part.

- "facebook/bart-large-cnn" is a model trained by Facebook/Meta specifically for summarization.
  It was trained on CNN/DailyMail news articles to generate summaries.

- A "pipeline" is Hugging Face's highest-level API. It handles:
  1. Tokenization — converting text into numbers the model understands
  2. Inference — running the model to generate output
  3. Decoding — converting the model's number output back into text

- PyTorch is the deep learning framework running under the hood.
  When you call pipeline(), it loads a PyTorch model internally.
"""

from transformers import pipeline


class Summarizer:
    def __init__(self):
        """
        Load the summarization model into memory.
        First run downloads ~1.6GB of model weights to ~/.cache/huggingface/.
        Subsequent runs load from cache (fast).
        """
        self.pipe = pipeline(
            task="summarization",
            model="facebook/bart-large-cnn",
        )

    def summarize(self, text: str, max_length: int = 130, min_length: int = 30) -> str:
        """
        Summarize the given text.

        Args:
            text: The input text to summarize (works best with 3+ sentences).
            max_length: Maximum number of tokens in the summary (~words).
            min_length: Minimum number of tokens in the summary.

        Returns:
            The generated summary string.

        Notes:
            - do_sample=False means deterministic output (greedy decoding).
              The model always picks the most likely next word.
            - truncation=True means if your text is longer than the model's
              max input (1024 tokens for BART), it will be cut automatically.
        """
        result = self.pipe(
            text,
            max_length=max_length,
            min_length=min_length,
            do_sample=False,
            truncation=True,
        )
        return result[0]["summary_text"]
