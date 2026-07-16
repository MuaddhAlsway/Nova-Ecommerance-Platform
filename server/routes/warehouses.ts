import { Router, type Response } from "express";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import db from "../db";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT w.*, COUNT(i.id) as product_count, COALESCE(SUM(i.quantity), 0) as total_units
            FROM warehouses w LEFT JOIN inventory i ON w.id = i.warehouse_id GROUP BY w.id ORDER BY w.name`,
      args: [],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, city, state, zip, country, is_default } = req.body;
    if (is_default) {
      await db.execute({ sql: "UPDATE warehouses SET is_default = 0", args: [] });
    }
    const result = await db.execute({
      sql: "INSERT INTO warehouses (name, address, city, state, zip, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [name, address || null, city || null, state || null, zip || null, country || "US", is_default ? 1 : 0],
    });
    res.json({ id: result.lastInsertRowid });
  } catch {
    res.status(500).json({ error: "Failed to create warehouse" });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, city, state, zip, country, is_default, is_active } = req.body;
    if (is_default) {
      await db.execute({ sql: "UPDATE warehouses SET is_default = 0", args: [] });
    }
    await db.execute({
      sql: `UPDATE warehouses SET name=COALESCE(?,name), address=COALESCE(?,address), city=COALESCE(?,city),
            state=COALESCE(?,state), zip=COALESCE(?,zip), country=COALESCE(?,country),
            is_default=COALESCE(?,is_default), is_active=COALESCE(?,is_active) WHERE id=?`,
      args: [name ?? null, address ?? null, city ?? null, state ?? null, zip ?? null, country ?? null, is_default ?? null, is_active ?? null, req.params.id],
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update warehouse" });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({ sql: "DELETE FROM warehouses WHERE id = ? AND is_default = 0", args: [req.params.id] });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete warehouse" });
  }
});

export default router;
