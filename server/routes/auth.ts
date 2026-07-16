import db from "../db";
import { hashPassword, verifyPassword, generateToken } from "../auth";
import { authMiddleware, type AuthRequest } from "../middleware";
import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email, and password are required" });
      return;
    }
    const existing = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const password_hash = hashPassword(password);
    const token = generateToken();
    const result = await db.execute({
      sql: "INSERT INTO users (name, email, password_hash, token) VALUES (?, ?, ?, ?)",
      args: [name, email, password_hash, token],
    });
    res.status(201).json({
      id: Number(result.lastInsertRowid),
      name,
      email,
      role: "user",
      token,
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    const result = await db.execute({
      sql: "SELECT id, name, email, password_hash, role, avatar, phone, address FROM users WHERE email = ?",
      args: [email],
    });
    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const user = result.rows[0] as any;
    if (!verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = generateToken();
    await db.execute({ sql: "UPDATE users SET token = ? WHERE id = ?", args: [token, user.id] });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone, address: user.address, token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: "SELECT id, name, email, role, avatar, phone, address, created_at FROM users WHERE id = ?",
      args: [req.user!.id],
    });
    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.put("/profile", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, address, avatar } = req.body;
    await db.execute({
      sql: "UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), avatar = COALESCE(?, avatar) WHERE id = ?",
      args: [name || null, phone || null, address || null, avatar || null, req.user!.id],
    });
    res.json({ message: "Profile updated" });
  } catch {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.post("/logout", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({ sql: "UPDATE users SET token = NULL WHERE id = ?", args: [req.user!.id] });
    res.json({ message: "Logged out" });
  } catch {
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
