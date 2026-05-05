"""
Evaluation script — measures summarization quality using ROUGE scores.

ROUGE (Recall-Oriented Understudy for Gisting Evaluation) compares a
generated summary against a human-written reference summary:
  - ROUGE-1: overlap of individual words
  - ROUGE-2: overlap of two-word pairs (bigrams)
  - ROUGE-L: longest common subsequence (measures sentence fluency)

Scores range 0–1. BART-large-CNN typically achieves ~0.40–0.44 ROUGE-1
on news datasets, which is considered strong for abstractive summarization.

Run with: python evaluate.py
"""

import pandas as pd
from rouge_score import rouge_scorer
from summarizer import Summarizer


def main():
    df = pd.read_csv("sample_texts.csv")
    print(f"Loaded {len(df)} sample texts\n")
    print("Running summarization...\n")

    model = Summarizer()
    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)

    df["summary"] = df["text"].apply(model.summarize)
    df["text_word_count"] = df["text"].str.split().str.len()
    df["summary_word_count"] = df["summary"].str.split().str.len()
    df["compression_ratio"] = (df["summary_word_count"] / df["text_word_count"] * 100).round(1)

    # Compute ROUGE scores for each row
    scores = df.apply(
        lambda row: scorer.score(row["reference_summary"], row["summary"]),
        axis=1,
    )
    df["rouge1"] = [s["rouge1"].fmeasure for s in scores]
    df["rouge2"] = [s["rouge2"].fmeasure for s in scores]
    df["rougeL"] = [s["rougeL"].fmeasure for s in scores]

    # Per-article results
    for _, row in df.iterrows():
        print(f"--- {row['title']} ---")
        print(f"Original  ({row['text_word_count']} words): {row['text'][:100]}...")
        print(f"Summary   ({row['summary_word_count']} words): {row['summary']}")
        print(f"Compression: {row['compression_ratio']}%")
        print(f"ROUGE-1: {row['rouge1']:.3f}  ROUGE-2: {row['rouge2']:.3f}  ROUGE-L: {row['rougeL']:.3f}\n")

    # Aggregate stats
    print("=== Overall Statistics ===")
    print(f"Average compression:  {df['compression_ratio'].mean():.1f}%")
    print(f"Average ROUGE-1:      {df['rouge1'].mean():.3f}")
    print(f"Average ROUGE-2:      {df['rouge2'].mean():.3f}")
    print(f"Average ROUGE-L:      {df['rougeL'].mean():.3f}")


if __name__ == "__main__":
    main()
