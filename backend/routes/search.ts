import express from "express";
import { search } from "../controllers/searchController";
import { tokenExtractor, userExtractor } from "../middlewares/auth";

const router = express.Router();

router.use(tokenExtractor);
router.get("/search", userExtractor, search);

export default router;
