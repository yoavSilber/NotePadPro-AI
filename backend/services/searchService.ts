import { Note } from "../models/noteModel";
import * as ml from "./mlService";

// Cosine similarity between two L2-normalized vectors == dot product.
const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
};

// Escape a string for safe use inside a MongoDB $regex.
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Hybrid search:
//   1. Keyword match (case-insensitive substring on title/content) — boosts the
//      score so exact matches always win.
//   2. Semantic match via embeddings — finds notes that mean the same thing
//      even when the words don't overlap.
// Results from both pools are merged, deduped by _id, and ranked.
export const semanticSearch = async (
  query: string,
  userId: string | null,
  topK = 20
) => {
  const baseFilter: Record<string, unknown> = {};
  if (userId) baseFilter.user = userId;

  // ── 1. Keyword pass ──────────────────────────────────────────────────────
  const regex = new RegExp(escapeRegex(query), "i");
  const keywordHits = await Note.find({
    ...baseFilter,
    $or: [{ title: regex }, { content: regex }],
  }).select("+embedding");

  // Score = 1.0 if title matches, 0.7 if only content matches.
  const keywordScores = new Map<string, number>();
  for (const n of keywordHits) {
    const titleMatch = regex.test(n.title);
    keywordScores.set(String(n._id), titleMatch ? 1.0 : 0.7);
  }

  // ── 2. Semantic pass ─────────────────────────────────────────────────────
  let semanticHits: { note: typeof keywordHits[number]; score: number }[] = [];
  try {
    const queryEmbedding = await ml.embed(query);
    const SEMANTIC_THRESHOLD = 0.2;

    const embeddedNotes = await Note.find({
      ...baseFilter,
      embeddingHash: { $exists: true },
    }).select("+embedding");

    semanticHits = embeddedNotes
      .filter((n) => n.embedding && n.embedding.length > 0)
      .map((n) => ({
        note: n,
        score: cosineSimilarity(queryEmbedding, n.embedding as number[]),
      }))
      .filter(({ score }) => score >= SEMANTIC_THRESHOLD);
  } catch (err) {
    // If the ML service is down, we still return keyword results.
    console.warn(
      `Semantic search skipped: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // ── 3. Merge & dedupe ────────────────────────────────────────────────────
  const merged = new Map<string, { note: typeof keywordHits[number]; score: number }>();

  for (const n of keywordHits) {
    merged.set(String(n._id), { note: n, score: keywordScores.get(String(n._id)) || 0.7 });
  }
  for (const { note, score } of semanticHits) {
    const id = String(note._id);
    const existing = merged.get(id);
    // Keep the higher score (keyword usually wins)
    if (!existing || score > existing.score) {
      merged.set(id, { note, score });
    }
  }

  const ranked = [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked.map(({ note, score }) => ({
    _id: note._id,
    title: note.title,
    content: note.content,
    author: note.author,
    summary: note.summary,
    summarizedAt: note.summarizedAt,
    score: Math.round(score * 100) / 100,
  }));
};
