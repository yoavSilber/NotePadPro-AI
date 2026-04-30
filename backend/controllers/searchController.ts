import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { semanticSearch } from "../services/searchService";

export const search = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const query = (req.query.q as string)?.trim();

    if (!query) {
      return res.status(400).json({ error: "Missing search query" });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const results = await semanticSearch(query, req.user._id.toString());
    res.status(200).json(results);
  }
);
