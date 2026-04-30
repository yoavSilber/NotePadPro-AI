import { Request, Response, NextFunction } from "express";
import { MLServiceError } from "../services/mlService";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", error);

  // ML service errors → 502 Bad Gateway (we depend on an upstream)
  if (error instanceof MLServiceError) {
    return res.status(502).json({
      error: "AI service is temporarily unavailable. Please try again.",
    });
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" });
  }

  // Validation errors
  if (error.name === "ValidationError") {
    return res.status(400).json({ error: error.message });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists` });
  }

  // Default error
  return res.status(500).json({ error: "Internal server error" });
};

export default errorHandler;
