import db from "../db";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.post("/validate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code || subtotal === undefined) {
      res.status(400).json({ error: "Code and subtotal are required" });
      return;
    }

    const result = await db.execute({
      sql: "SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)",
      args: [code],
    });
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invalid coupon code" });
      return;
    }

    const coupon = result.rows[0] as any;

    if (!coupon.is_active) {
      res.status(400).json({ error: "Coupon is inactive" });
      return;
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      res.status(400).json({ error: "Coupon has expired" });
      return;
    }

    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
      res.status(400).json({ error: "Coupon usage limit reached" });
      return;
    }

    if (subtotal < coupon.min_order) {
      res.status(400).json({ error: `Minimum order amount is ${coupon.min_order}` });
      return;
    }

    let discount_amount: number;
    if (coupon.discount_type === "percent") {
      discount_amount = Math.min(subtotal * coupon.discount_value / 100, subtotal);
    } else {
      discount_amount = Math.min(coupon.discount_value, subtotal);
    }

    const final_total = Math.max(subtotal - discount_amount, 0);

    res.json({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount,
      final_total,
    });
  } catch {
    res.status(500).json({ error: "Failed to validate coupon" });
  }
});

router.post("/apply", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: "Code is required" });
      return;
    }

    const result = await db.execute({
      sql: "SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)",
      args: [code],
    });
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Invalid coupon code" });
      return;
    }

    await db.execute({
      sql: "UPDATE coupons SET used_count = used_count + 1 WHERE UPPER(code) = UPPER(?)",
      args: [code],
    });

    res.json({ message: "Coupon applied" });
  } catch {
    res.status(500).json({ error: "Failed to apply coupon" });
  }
});

router.get("/", authMiddleware, adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute("SELECT * FROM coupons ORDER BY created_at DESC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, discount_type, discount_value, min_order, max_uses, expires_at } = req.body;
    if (!code || !discount_type || discount_value === undefined) {
      res.status(400).json({ error: "Code, discount_type, and discount_value are required" });
      return;
    }

    const result = await db.execute({
      sql: "INSERT INTO coupons (code, discount_type, discount_value, min_order, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [code, discount_type, discount_value, min_order || 0, max_uses || 0, expires_at || null],
    });

    res.status(201).json({ id: Number(result.lastInsertRowid), code, discount_type, discount_value, min_order: min_order || 0, max_uses: max_uses || 0, expires_at: expires_at || null, is_active: 1, used_count: 0 });
  } catch {
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code, discount_type, discount_value, min_order, max_uses, expires_at, is_active } = req.body;
    const result = await db.execute({
      sql: "UPDATE coupons SET code = COALESCE(?, code), discount_type = COALESCE(?, discount_type), discount_value = COALESCE(?, discount_value), min_order = COALESCE(?, min_order), max_uses = COALESCE(?, max_uses), expires_at = COALESCE(?, expires_at), is_active = COALESCE(?, is_active) WHERE id = ?",
      args: [code ?? null, discount_type ?? null, discount_value ?? null, min_order ?? null, max_uses ?? null, expires_at ?? null, is_active ?? null, req.params.id],
    });
    if (result.rowsAffected === 0) {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }
    res.json({ message: "Coupon updated" });
  } catch {
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: "DELETE FROM coupons WHERE id = ?",
      args: [req.params.id],
    });
    if (result.rowsAffected === 0) {
      res.status(404).json({ error: "Coupon not found" });
      return;
    }
    res.json({ message: "Coupon deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

export default router;
