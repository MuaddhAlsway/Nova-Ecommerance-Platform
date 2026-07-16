import type { Request, Response, NextFunction } from "express";
import db from "./db";

export interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string; role: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }
  try {
    const result = await db.execute({
      sql: "SELECT id, email, name, role FROM users WHERE token = ?",
      args: [token],
    });
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    req.user = result.rows[0] as any;
    next();
  } catch {
    res.status(500).json({ error: "Auth error" });
  }
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
