import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "@models";
import { UserRoles } from "@typescript/user";
import { getRequestContext, runWithContext } from "@lib/requestContext";

declare global {
  namespace Express {
    interface Request {
      userId: string;
      token: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
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

    // Refine the ALS-backed RequestContext stamped by
    // requestContextMiddleware: attach userId + sessionId so any
    // mutation emitted during this request attributes correctly.
    const ctx = getRequestContext();
    if (ctx) {
      const enriched = {
        ...ctx,
        userId,
        sessionId:
          typeof decoded.sessionId === "string" ? decoded.sessionId : ctx.sessionId,
      };
      runWithContext(enriched, () => next());
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function requireDeveloper(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await User.findById(req.userId).lean();
  if (!user || user.role !== UserRoles.Developer) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
