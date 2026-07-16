import db from "../db";
import { authMiddleware, type AuthRequest } from "../middleware";
import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

async function recalcProductRating(productId: number) {
  const stats = await db.execute({
    sql: "SELECT COALESCE(ROUND(AVG(rating), 1), 0) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?",
    args: [productId],
  });
  const { avg_rating, total } = stats.rows[0] as any;
  await db.execute({
    sql: "UPDATE products SET rating = ?, reviews = ? WHERE id = ?",
    args: [avg_rating, total, productId],
  });
}

router.get("/user/check/:productId", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM reviews WHERE user_id = ? AND product_id = ?",
      args: [req.user!.id, req.params.productId],
    });
    if (result.rows.length > 0) {
      res.json({ reviewed: true, review: result.rows[0] });
    } else {
      res.json({ reviewed: false, review: null });
    }
  } catch {
    res.status(500).json({ error: "Failed to check review" });
  }
});

router.get("/:productId", async (req: Request, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
            FROM reviews r JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ? ORDER BY r.created_at DESC`,
      args: [req.params.productId],
    });
    const stats = await db.execute({
      sql: "SELECT COALESCE(ROUND(AVG(rating), 1), 0) as average, COUNT(*) as count FROM reviews WHERE product_id = ?",
      args: [req.params.productId],
    });
    const { average, count } = stats.rows[0] as any;
    res.json({ reviews: result.rows, average, count });
  } catch {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, rating, title, comment } = req.body;
    if (!product_id || !rating) {
      res.status(400).json({ error: "product_id and rating are required" });
      return;
    }
    const existing = await db.execute({
      sql: "SELECT id FROM reviews WHERE user_id = ? AND product_id = ?",
      args: [req.user!.id, product_id],
    });
    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE reviews SET rating = ?, title = ?, comment = ? WHERE user_id = ? AND product_id = ?",
        args: [rating, title || null, comment || null, req.user!.id, product_id],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO reviews (user_id, product_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)",
        args: [req.user!.id, product_id, rating, title || null, comment || null],
      });
    }
    await recalcProductRating(product_id);
    res.status(201).json({ message: "Review submitted" });
  } catch {
    res.status(500).json({ error: "Failed to submit review" });
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await db.execute({
      sql: "SELECT product_id FROM reviews WHERE id = ? AND user_id = ?",
      args: [req.params.id, req.user!.id],
    });
    if (existing.rows.length === 0) {
      res.status(404).json({ error: "Review not found" });
      return;
    }
    const productId = existing.rows[0].product_id as number;
    await db.execute({
      sql: "DELETE FROM reviews WHERE id = ? AND user_id = ?",
      args: [req.params.id, req.user!.id],
    });
    await recalcProductRating(productId);
    res.json({ message: "Review deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
