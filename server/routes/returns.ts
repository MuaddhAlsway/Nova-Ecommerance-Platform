import { Router, type Response } from "express";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import db from "../db";

const router = Router();

// List returns (admin)
router.get("/", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `SELECT r.*, o.total as order_total, u.name as user_name, u.email as user_email
               FROM returns r
               JOIN orders o ON r.order_id = o.id
               JOIN users u ON r.user_id = u.id
               WHERE 1=1`;
    const args: any[] = [];
    if (status) { sql += ` AND r.status = ?`; args.push(status); }
    sql += ` ORDER BY r.created_at DESC`;

    const result = await db.execute({ sql, args });
    const returns = await Promise.all(
      result.rows.map(async (ret: any) => {
        const items = await db.execute({
          sql: `SELECT ri.*, oi.quantity as order_quantity, oi.price as order_price,
                       p.name as product_name, p.image as product_image
                FROM return_items ri
                JOIN order_items oi ON ri.order_item_id = oi.id
                JOIN products p ON oi.product_id = p.id
                WHERE ri.return_id = ?`,
          args: [ret.id],
        });
        return { ...ret, items: items.rows };
      })
    );
    res.json(returns);
  } catch {
    res.status(500).json({ error: "Failed to fetch returns" });
  }
});

// Request return (user)
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { order_id, reason, return_type, items } = req.body;

    const order = await db.execute({ sql: "SELECT * FROM orders WHERE id = ? AND user_id = ?", args: [order_id, req.user!.id] });
    if (order.rows.length === 0) return res.status(404).json({ error: "Order not found" });

    let refundAmount = 0;
    for (const item of items || []) {
      const orderItem = await db.execute({ sql: "SELECT * FROM order_items WHERE id = ? AND order_id = ?", args: [item.order_item_id, order_id] });
      if (orderItem.rows.length > 0) {
        refundAmount += (orderItem.rows[0] as any).price * item.quantity;
      }
    }

    const result = await db.execute({
      sql: `INSERT INTO returns (order_id, user_id, reason, return_type, refund_amount) VALUES (?, ?, ?, ?, ?)`,
      args: [order_id, req.user!.id, reason || null, return_type || "refund", refundAmount],
    });
    const returnId = Number(result.lastInsertRowid);

    for (const item of items || []) {
      await db.execute({
        sql: `INSERT INTO return_items (return_id, order_item_id, quantity, reason, condition) VALUES (?, ?, ?, ?, ?)`,
        args: [returnId, item.order_item_id, item.quantity, item.reason || reason || null, item.condition || "good"],
      });
    }

    res.json({ id: returnId, refund_amount: refundAmount });
  } catch {
    res.status(500).json({ error: "Failed to request return" });
  }
});

// User's returns
router.get("/my", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*, o.total as order_total
            FROM returns r JOIN orders o ON r.order_id = o.id
            WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      args: [req.user!.id],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch returns" });
  }
});

// Update return status (admin)
router.put("/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, return_tracking, restock, notes } = req.body;

    const updates: string[] = ["status = ?"];
    const args: any[] = [status];

    if (return_tracking) { updates.push("return_tracking = ?"); args.push(return_tracking); }
    if (restock !== undefined) { updates.push("restock = ?"); args.push(restock ? 1 : 0); }
    if (notes) { updates.push("notes = ?"); args.push(notes); }
    if (status === "refunded" || status === "rejected") { updates.push("resolved_at = datetime('now')"); }

    args.push(id);
    await db.execute({ sql: `UPDATE returns SET ${updates.join(", ")} WHERE id = ?`, args });

    // If received and restocking, add items back to inventory
    if (status === "received" && restock !== false) {
      const returnItems = await db.execute({
        sql: `SELECT ri.*, oi.product_id FROM return_items ri JOIN order_items oi ON ri.order_item_id = oi.id WHERE ri.return_id = ?`,
        args: [id],
      });
      const ret = await db.execute({ sql: "SELECT o.id as order_id FROM returns r JOIN orders o ON r.order_id = o.id WHERE r.id = ?", args: [id] });
      const orderId = (ret.rows[0] as any)?.order_id;

      for (const item of returnItems.rows) {
        // Find default warehouse
        const wh = await db.execute({ sql: "SELECT id FROM warehouses WHERE is_default = 1 LIMIT 1", args: [] });
        const whId = wh.rows.length > 0 ? (wh.rows[0] as any).id : 1;

        const inv = await db.execute({
          sql: "SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?",
          args: [(item as any).product_id, whId],
        });
        if (inv.rows.length > 0) {
          await db.execute({ sql: "UPDATE inventory SET quantity = quantity + ? WHERE id = ?", args: [(item as any).quantity, (inv.rows[0] as any).id] });
        }
        await db.execute({
          sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
                VALUES (?, ?, 'return', ?, 'return', ?, ?, ?)`,
          args: [(item as any).product_id, whId, (item as any).quantity, id,
            `Return #${id} restocked`, req.user!.id],
        });
      }
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update return" });
  }
});

export default router;
