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

    # Compute ROUGE scores only for rows that have a reference summary
    if "reference_summary" not in df.columns:
        df["rouge1"] = float("nan")
        df["rouge2"] = float("nan")
        df["rougeL"] = float("nan")
    else:
        def _score_row(row):
            ref = row.get("reference_summary")
            if not isinstance(ref, str) or not ref.strip():
                return {"rouge1": None, "rouge2": None, "rougeL": None}
            s = scorer.score(ref, row["summary"])
            return {"rouge1": s["rouge1"].fmeasure, "rouge2": s["rouge2"].fmeasure, "rougeL": s["rougeL"].fmeasure}

        rouge_rows = df.apply(_score_row, axis=1, result_type="expand")
        df["rouge1"] = rouge_rows["rouge1"]
        df["rouge2"] = rouge_rows["rouge2"]
        df["rougeL"] = rouge_rows["rougeL"]

    # Per-article results
    for _, row in df.iterrows():
        print(f"--- {row['title']} ---")
        print(f"Original  ({row['text_word_count']} words): {row['text'][:100]}...")
        print(f"Summary   ({row['summary_word_count']} words): {row['summary']}")
        print(f"Compression: {row['compression_ratio']}%")
        if row["rouge1"] is not None and not (isinstance(row["rouge1"], float) and row["rouge1"] != row["rouge1"]):
            print(f"ROUGE-1: {row['rouge1']:.3f}  ROUGE-2: {row['rouge2']:.3f}  ROUGE-L: {row['rougeL']:.3f}\n")
        else:
            print("ROUGE: n/a (no reference summary)\n")

    # Aggregate stats (skipna so rows without a reference summary don't break the mean)
    print("=== Overall Statistics ===")
    print(f"Average compression:  {df['compression_ratio'].mean():.1f}%")
    rouge_rows_count = df["rouge1"].notna().sum()
    if rouge_rows_count > 0:
        print(f"Average ROUGE-1:      {df['rouge1'].mean(skipna=True):.3f}  (over {rouge_rows_count} row(s))")
        print(f"Average ROUGE-2:      {df['rouge2'].mean(skipna=True):.3f}")
        print(f"Average ROUGE-L:      {df['rougeL'].mean(skipna=True):.3f}")
    else:
        print("ROUGE averages: n/a (no reference summaries found)")


if __name__ == "__main__":
    main()
