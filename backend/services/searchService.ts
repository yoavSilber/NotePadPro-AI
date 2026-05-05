import { Note } from "../models/noteModel";
import * as ml from "./mlService";

// Cosine similarity between two equal-length vectors.
// Since MiniLM embeddings are L2-normalized, this is just the dot product.
const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
};

export const semanticSearch = async (
  query: string,
  userId: string | null,  // null = search all notes (global scope)
  topK = 20
) => {
  const queryEmbedding = await ml.embed(query);

  // userId = null → global search across all notes
  // userId = string → search only that user's notes
  const filter: Record<string, unknown> = { embeddingHash: { $exists: true } };
  if (userId) filter.user = userId;

  const notes = await Note.find(filter).select("+embedding");

  // Minimum similarity to be considered relevant.
  // MiniLM cosine scores: >0.5 = clearly related, 0.3-0.5 = somewhat related,
  // <0.3 = likely irrelevant. We use 0.25 as a conservative cutoff so that
  // results are only shown when there is genuine semantic overlap.
  const MIN_SCORE = 0.25;

  const scored = notes
    .filter((n) => n.embedding && n.embedding.length > 0)
    .map((n) => ({
      note: n,
      score: cosineSimilarity(queryEmbedding, n.embedding as number[]),
    }))
    .filter(({ score }) => score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(({ note, score }) => ({
    _id: note._id,
    title: note.title,
    content: note.content,
    author: note.author,
    summary: note.summary,
    summarizedAt: note.summarizedAt,
    score: Math.round(score * 100) / 100,
  }));
};
