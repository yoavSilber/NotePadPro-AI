import express from "express";
import {
  getNotes,
  getNote,
  addNote,
  updateNote,
  deleteNote,
  summarizeNote,
  getNoteByIndexHandler,
  updateNoteByIndexHandler,
  deleteNoteByIndexHandler,
} from "../controllers/noteController";
import { tokenExtractor, userExtractor } from "../middlewares/auth";

const router = express.Router();

// Apply token extractor to all routes
router.use(tokenExtractor);

router.get("/notes", getNotes);
router.post("/notes", userExtractor, addNote);
// Static-segment routes must come before dynamic /:id routes to avoid shadowing.
router.get("/notes/by-index/:i", getNoteByIndexHandler);
router.put("/notes/by-index/:i", userExtractor, updateNoteByIndexHandler);
router.delete("/notes/by-index/:i", userExtractor, deleteNoteByIndexHandler);
router.get("/notes/:id", getNote);
router.put("/notes/:id", userExtractor, updateNote);
router.delete("/notes/:id", userExtractor, deleteNote);
router.post("/notes/:id/summarize", userExtractor, summarizeNote);

export default router;
