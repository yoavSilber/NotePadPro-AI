import express from "express";
import { search } from "../controllers/searchController";
import { tokenExtractor, userExtractor } from "../middlewares/auth";

const router = express.Router();

router.use(tokenExtractor);
// userExtractor is optional here — search works for guests (scope=all)
// and for logged-in users (scope=mine or scope=all)
router.get("/search", search);

export default router;
