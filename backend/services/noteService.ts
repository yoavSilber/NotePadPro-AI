import { Note } from "../models/noteModel";
import mongoose from "mongoose";
import { createHash } from "crypto";
import * as ml from "./mlService";

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

// Fire-and-forget: embed the note content and persist it.
// Called after create/update — doesn't block the response.
const embedAndSave = (noteId: string, content: string) => {
  const contentHash = sha256(content);
  ml.embed(content)
    .then((embedding) =>
      Note.findByIdAndUpdate(noteId, { embedding, embeddingHash: contentHash })
    )
    .catch((err) =>
      console.warn(
        `Embedding failed for note ${noteId}: ${err instanceof Error ? err.message : String(err)}`
      )
    );
};

export const getPaginatedNotes = async (_page: number, _per_page: number) => {
  const skip = (_page - 1) * _per_page;
  const notes = await Note.find().sort({ _id: -1 }).skip(skip).limit(_per_page);
  const count = await Note.countDocuments();
  return { notes, count };
};

export const getNoteById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return await Note.findById(id);
};

export const createNote = async (data: {
  title: string;
  content: string;
  author?: { name: string; email: string } | null;
  user?: string | null;
}) => {
  const note = new Note({
    title: data.title,
    content: data.content,
    author: data.author || null,
    user: data.user || null,
  });

  const saved = await note.save();
  embedAndSave(String(saved._id), saved.content);
  return saved;
};

export const updateNoteById = async (
  id: string,
  data: {
    title?: string;
    content?: string;
    author?: { name: string; email: string } | null;
  }
) => {
  const updated = await Note.findByIdAndUpdate(id, data, { new: true });
  if (updated && data.content) embedAndSave(String(updated._id), updated.content);
  return updated;
};

export const deleteNoteById = async (id: string) => {
  return await Note.findByIdAndDelete(id);
};

export const getNoteByIndex = async (i: number) => {
  const notes = await Note.find().sort({ _id: -1 }).skip(i).limit(1);
  return notes[0] || null;
};

export const updateNoteByIndex = async (
  i: number,
  data: {
    title: string;
    content: string;
    author?: { name: string; email: string } | null;
  }
) => {
  const notes = await Note.find().sort({ _id: -1 }).skip(i).limit(1);
  const target = notes[0];

  if (!target) return null;

  target.title = data.title;
  target.content = data.content;
  target.author = data.author || null;

  return await target.save();
};

export const deleteNoteByIndex = async (i: number) => {
  const notes = await Note.find().sort({ _id: -1 }).skip(i).limit(1);
  const target = notes[0];

  if (!target) return null;

  return await Note.findByIdAndDelete(target._id);
};

export const summarizeNoteById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const note = await Note.findById(id);
  if (!note) return null;

  const contentHash = sha256(note.content);

  // Cache hit: same content was already summarized.
  if (note.summary && note.summaryHash === contentHash) {
    return note;
  }

  const summary = await ml.summarize(note.content);

  note.summary = summary;
  note.summaryHash = contentHash;
  note.summarizedAt = new Date();
  await note.save();

  return note;
};
