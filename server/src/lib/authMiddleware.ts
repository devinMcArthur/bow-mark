import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      token: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization;
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload;
    const userId = decoded?.userId;
    if (!userId) {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
    req.userId = userId;
    req.token = token;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
