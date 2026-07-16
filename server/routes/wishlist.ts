import db from "../db";
import { authMiddleware, type AuthRequest } from "../middleware";
import { Router, type Response } from "express";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT w.id, w.product_id, p.name, p.subtitle, p.price, p.original_price, p.image, p.rating, p.reviews, p.badge, c.name as category
            FROM wishlists w JOIN products p ON w.product_id = p.id JOIN categories c ON p.category_id = c.id
            WHERE w.user_id = ? ORDER BY w.created_at DESC`,
      args: [req.user!.id],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id } = req.body;
    await db.execute({
      sql: "INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)",
      args: [req.user!.id, product_id],
    });
    res.status(201).json({ message: "Added to wishlist" });
  } catch {
    res.status(500).json({ error: "Failed to add to wishlist" });
  }
});

router.delete("/:product_id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({
      sql: "DELETE FROM wishlists WHERE user_id = ? AND product_id = ?",
      args: [req.user!.id, req.params.product_id],
    });
    res.json({ message: "Removed from wishlist" });
  } catch {
    res.status(500).json({ error: "Failed to remove from wishlist" });
  }
});

export default router;
