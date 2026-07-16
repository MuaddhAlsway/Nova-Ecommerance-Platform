import { Router, type Response } from "express";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import db from "../db";

const router = Router();

// Get all inventory for a warehouse
router.get("/", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id, low_stock, search } = req.query;
    let sql = `
      SELECT i.*, p.name as product_name, p.price as product_price, p.image as product_image,
             p.sku, w.name as warehouse_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (warehouse_id) { sql += ` AND i.warehouse_id = ?`; args.push(warehouse_id); }
    if (low_stock === "1") { sql += ` AND (i.quantity - i.reserved) <= i.reorder_point`; }
    if (search) { sql += ` AND p.name LIKE ?`; args.push(`%${search}%`); }

    sql += ` ORDER BY p.name ASC`;
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Update inventory (adjust stock)
router.put("/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, reserved, reorder_point, reorder_quantity, bin_location } = req.body;

    const current = await db.execute({ sql: "SELECT * FROM inventory WHERE id = ?", args: [id] });
    if (current.rows.length === 0) return res.status(404).json({ error: "Inventory record not found" });

    const item = current.rows[0] as any;
    const newQty = quantity !== undefined ? quantity : item.quantity;
    const newReserved = reserved !== undefined ? reserved : item.reserved;

    await db.execute({
      sql: `UPDATE inventory SET quantity = ?, reserved = ?, reorder_point = COALESCE(?, reorder_point),
            reorder_quantity = COALESCE(?, reorder_quantity), bin_location = COALESCE(?, bin_location) WHERE id = ?`,
      args: [newQty, newReserved, reorder_point ?? null, reorder_quantity ?? null, bin_location ?? null, id],
    });

    // Log movement if quantity changed
    if (quantity !== undefined && quantity !== item.quantity) {
      const diff = quantity - item.quantity;
      await db.execute({
        sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, notes, created_by)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [item.product_id, item.warehouse_id, diff > 0 ? "inbound" : "adjustment", Math.abs(diff),
          `Stock adjusted from ${item.quantity} to ${quantity}`, req.user!.id],
      });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

// Get low stock alerts
router.get("/alerts", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT i.*, p.name as product_name, p.image as product_image, w.name as warehouse_name,
            (i.quantity - i.reserved) as available
            FROM inventory i
            JOIN products p ON i.product_id = p.id
            JOIN warehouses w ON i.warehouse_id = w.id
            WHERE (i.quantity - i.reserved) <= i.reorder_point
            ORDER BY (i.quantity - i.reserved) ASC`,
      args: [],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// Get inventory movements
router.get("/movements", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, warehouse_id, type, limit } = req.query;
    let sql = `
      SELECT im.*, p.name as product_name, w.name as warehouse_name, u.name as created_by_name
      FROM inventory_movements im
      JOIN products p ON im.product_id = p.id
      JOIN warehouses w ON im.warehouse_id = w.id
      LEFT JOIN users u ON im.created_by = u.id
      WHERE 1=1
    `;
    const args: any[] = [];
    if (product_id) { sql += ` AND im.product_id = ?`; args.push(product_id); }
    if (warehouse_id) { sql += ` AND im.warehouse_id = ?`; args.push(warehouse_id); }
    if (type) { sql += ` AND im.movement_type = ?`; args.push(type); }
    sql += ` ORDER BY im.created_at DESC LIMIT ?`;
    args.push(Number(limit) || 50);

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});

// Record a movement (inbound/outbound/transfer/return)
router.post("/movements", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes } = req.body;

    if (!product_id || !warehouse_id || !movement_type || !quantity) {
      return res.status(400).json({ error: "product_id, warehouse_id, movement_type, and quantity are required" });
    }

    await db.execute({
      sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [product_id, warehouse_id, movement_type, quantity, reference_type || null, reference_id || null, notes || null, req.user!.id],
    });

    // Update inventory
    const inv = await db.execute({
      sql: "SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?",
      args: [product_id, warehouse_id],
    });

    if (inv.rows.length > 0) {
      const item = inv.rows[0] as any;
      let newQty = item.quantity;
      if (movement_type === "inbound" || movement_type === "return") newQty += quantity;
      else if (movement_type === "outbound" || movement_type === "transfer") newQty -= quantity;
      await db.execute({ sql: "UPDATE inventory SET quantity = ? WHERE id = ?", args: [newQty, item.id] });
    } else {
      await db.execute({
        sql: "INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
        args: [product_id, warehouse_id, movement_type === "inbound" ? quantity : 0],
      });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to record movement" });
  }
});

// Batch count inventory
router.post("/count", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id, counts } = req.body;
    // counts: [{ product_id, counted_quantity }]

    if (!warehouse_id || !Array.isArray(counts)) {
      return res.status(400).json({ error: "warehouse_id and counts array required" });
    }

    let adjusted = 0;
    for (const count of counts) {
      const inv = await db.execute({
        sql: "SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?",
        args: [count.product_id, warehouse_id],
      });
      if (inv.rows.length > 0) {
        const item = inv.rows[0] as any;
        if (item.quantity !== count.counted_quantity) {
          const diff = count.counted_quantity - item.quantity;
          await db.execute({
            sql: "UPDATE inventory SET quantity = ?, last_counted_at = datetime('now') WHERE id = ?",
            args: [count.counted_quantity, item.id],
          });
          await db.execute({
            sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, notes, created_by)
                  VALUES (?, ?, 'adjustment', ?, ?, ?)`,
            args: [count.product_id, warehouse_id, Math.abs(diff),
              `Cycle count: ${item.quantity} → ${count.counted_quantity}`, req.user!.id],
          });
          adjusted++;
        }
      }
    }

    res.json({ adjusted, message: `${adjusted} items adjusted` });
  } catch {
    res.status(500).json({ error: "Failed to count inventory" });
  }
});

export default router;
