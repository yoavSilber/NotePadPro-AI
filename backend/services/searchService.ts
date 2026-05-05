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

  // Score each note and sort highest first
  const scored = notes
    .filter((n) => n.embedding && n.embedding.length > 0)
    .map((n) => ({
      note: n,
      score: cosineSimilarity(queryEmbedding, n.embedding as number[]),
    }))
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
