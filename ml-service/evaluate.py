"""
Evaluation script — uses pandas to analyze summarization results.

KEY CONCEPTS:
- Pandas is Python's main library for working with tabular data (like Excel but in code).
- A DataFrame is a 2D table (rows and columns). Think of it like a spreadsheet.
- You can add columns, filter rows, compute statistics — all in a few lines.

This script:
1. Loads sample texts from a CSV file
2. Runs each through the summarizer
3. Computes stats like compression ratio and word counts
4. Displays results in a nice table

Run with: python evaluate.py
"""

import pandas as pd
from summarizer import Summarizer


def main():
    # Load CSV into a DataFrame — each row becomes a record
    df = pd.read_csv("sample_texts.csv")

    print(f"Loaded {len(df)} sample texts\n")
    print("Running summarization on each text...\n")

    # Initialize the model (downloads on first run)
    model = Summarizer()

    # Apply summarization to each row's "text" column
    # .apply() runs a function on every element in a column — very common in pandas
    df["summary"] = df["text"].apply(model.summarize)

    # Compute stats using pandas vectorized operations
    # These operate on entire columns at once (no for-loops needed)
    df["text_word_count"] = df["text"].str.split().str.len()
    df["summary_word_count"] = df["summary"].str.split().str.len()
    df["compression_ratio"] = (df["summary_word_count"] / df["text_word_count"] * 100).round(1)

    # Display results
    for _, row in df.iterrows():
        print(f"--- {row['title']} ---")
        print(f"Original ({row['text_word_count']} words): {row['text'][:100]}...")
        print(f"Summary  ({row['summary_word_count']} words): {row['summary']}")
        print(f"Compression: {row['compression_ratio']}%\n")

    # Pandas makes aggregate stats trivial
    print("=== Overall Statistics ===")
    print(f"Average text length:    {df['text_word_count'].mean():.0f} words")
    print(f"Average summary length: {df['summary_word_count'].mean():.0f} words")
    print(f"Average compression:    {df['compression_ratio'].mean():.1f}%")


if __name__ == "__main__":
    main()
