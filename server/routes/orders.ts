import db from "../db";
import { authMiddleware, type AuthRequest } from "../middleware";
import { Router, type Response } from "express";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      args: [req.user!.id],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/detail/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const order = await db.execute({
      sql: "SELECT * FROM orders WHERE id = ?",
      args: [req.params.id],
    });
    if (order.rows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const items = await db.execute({
      sql: `SELECT oi.quantity, oi.price, p.name as product_name, p.image as product_image, p.subtitle FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
      args: [req.params.id],
    });
    res.json({ ...order.rows[0], items: items.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Admin: all orders
router.get("/all", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const result = await db.execute({
      sql: `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`,
      args: [],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.put("/:id/status", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const { status } = req.body;
    await db.execute({ sql: "UPDATE orders SET status = ? WHERE id = ?", args: [status, req.params.id] });
    res.json({ message: "Order status updated" });
  } catch {
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
