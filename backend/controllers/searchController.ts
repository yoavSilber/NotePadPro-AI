import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { semanticSearch } from "../services/searchService";

export const search = asyncHandler(
  async (req: Request, res: Response) => {
    const query = (req.query.q as string)?.trim();
    const scope = (req.query.scope as string) || "all";

    if (!query) {
      return res.status(400).json({ error: "Missing search query" });
    }

    // scope=mine requires auth; scope=all is open to everyone
    const user = (req as AuthenticatedRequest).user;
    if (scope === "mine" && !user) {
      return res.status(401).json({ error: "Authentication required to search your own notes" });
    }

    const userId = scope === "mine" && user ? user._id.toString() : null;
    const results = await semanticSearch(query, userId);
    res.status(200).json(results);
  }
);
