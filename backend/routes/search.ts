import express from "express";
import { search } from "../controllers/searchController";
import { tokenExtractor, optionalUserExtractor } from "../middlewares/auth";

const router = express.Router();

router.use(tokenExtractor);
// optionalUserExtractor: loads user if token present, doesn't block guests
router.get("/search", optionalUserExtractor, search);

export default router;
