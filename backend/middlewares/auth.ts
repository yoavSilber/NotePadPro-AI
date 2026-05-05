import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { User } from "../models/userModel";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const tokenExtractor = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.get("authorization");

  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    req.token = authorization.substring(7);
  }

  next();
};

// Like userExtractor but never blocks the request — loads user if token
// is present and valid, otherwise just calls next() with req.user undefined.
// Used for routes that are public but can behave differently when authenticated.
export const optionalUserExtractor = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.token) return next();
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) return next();
    const decodedToken = jwt.verify(req.token, JWT_SECRET) as any;
    if (!decodedToken.id) return next();
    const user = await User.findById(decodedToken.id);
    if (user) req.user = user;
  } catch {
    // invalid token — just proceed as unauthenticated
  }
  next();
};

export const userExtractor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    const decodedToken = jwt.verify(req.token, JWT_SECRET) as any;

    if (!decodedToken.id) {
      return res.status(401).json({ error: "Token invalid" });
    }

    const user = await User.findById(decodedToken.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token invalid" });
  }
};

declare global {
  namespace Express {
    interface Request {
      token?: string;
    }
  }
}
