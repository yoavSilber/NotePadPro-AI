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

import random

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
        # Adapt the length budget to the input.  BART-large-CNN was trained on
        # long news articles — given a short paragraph it copies sentences
        # rather than rewriting them.  Targeting ~40% of input length forces
        # real compression so the model has to rephrase.
        word_count = len(text.split())
        target_max = max(30, min(max_length, int(word_count * 0.4)))
        target_min = max(12, min(min_length, int(word_count * 0.15)))

        # Jitter for variety + cache busting.
        jittered_max = target_max + random.randint(-8, 8)
        jittered_max = max(target_min + 5, jittered_max)

        result = self.pipe(
            text,
            max_length=jittered_max,
            min_length=target_min,
            do_sample=True,
            temperature=0.9,
            top_p=0.95,
            length_penalty=0.7,        # discourage verbatim copying
            no_repeat_ngram_size=3,    # block reusing 3-grams from input
            truncation=True,
        )
        return result[0]["summary_text"]
