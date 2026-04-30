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
  userId: string,
  topK = 20
) => {
  // Get the embedding for the search query
  const queryEmbedding = await ml.embed(query);

  // Load only this user's notes that have been embedded.
  // `embedding` has select:false on the schema so we must explicitly request it.
  const notes = await Note.find({
    user: userId,
    embeddingHash: { $exists: true },
  }).select("+embedding");

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
