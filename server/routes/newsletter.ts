import db from "../db";
import { Router } from "express";

const router = Router();

router.post("/newsletter", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }
    await db.execute({ sql: "INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)", args: [email] });
    res.status(201).json({ message: "Subscribed successfully" });
  } catch {
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

router.get("/testimonials", async (_req, res) => {
  try {
    const result = await db.execute("SELECT * FROM testimonials WHERE is_active = 1 ORDER BY id");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.post("/testimonials", async (req, res) => {
  try {
    const { name, role, avatar, quote, rating } = req.body;
    const result = await db.execute({
      sql: "INSERT INTO testimonials (name, role, avatar, quote, rating) VALUES (?, ?, ?, ?, ?)",
      args: [name, role || null, avatar || null, quote, rating || 5],
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), ...req.body });
  } catch {
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

export default router;
