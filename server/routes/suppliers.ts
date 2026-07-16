import { Router, type Response } from "express";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import db from "../db";

const router = Router();

// List suppliers
router.get("/", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT s.*, COUNT(sp.id) as product_count
            FROM suppliers s LEFT JOIN supplier_products sp ON s.id = sp.supplier_id
            GROUP BY s.id ORDER BY s.name`,
      args: [],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// Create supplier
router.post("/", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days } = req.body;
    const result = await db.execute({
      sql: `INSERT INTO suppliers (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [name, contact_name || null, email || null, phone || null, address || null, city || null, country || null, payment_terms || "Net 30", lead_time_days || 14],
    });
    res.json({ id: result.lastInsertRowid });
  } catch {
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

// Update supplier
router.put("/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days, is_active } = req.body;
    await db.execute({
      sql: `UPDATE suppliers SET name=COALESCE(?,name), contact_name=COALESCE(?,contact_name),
            email=COALESCE(?,email), phone=COALESCE(?,phone), address=COALESCE(?,address),
            city=COALESCE(?,city), country=COALESCE(?,country), payment_terms=COALESCE(?,payment_terms),
            lead_time_days=COALESCE(?,lead_time_days), is_active=COALESCE(?,is_active) WHERE id=?`,
      args: [name ?? null, contact_name ?? null, email ?? null, phone ?? null, address ?? null, city ?? null, country ?? null, payment_terms ?? null, lead_time_days ?? null, is_active ?? null, id],
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

// Supplier products
router.get("/:id/products", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT sp.*, p.name as product_name, p.image as product_image, p.price as retail_price
            FROM supplier_products sp JOIN products p ON sp.product_id = p.id WHERE sp.supplier_id = ?`,
      args: [req.params.id],
    });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch supplier products" });
  }
});

// Add supplier product
router.post("/:id/products", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, unit_cost, min_order_qty, lead_time_days, supplier_sku, is_preferred } = req.body;
    const result = await db.execute({
      sql: `INSERT INTO supplier_products (supplier_id, product_id, unit_cost, min_order_qty, lead_time_days, supplier_sku, is_preferred)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [req.params.id, product_id, unit_cost, min_order_qty || 1, lead_time_days || null, supplier_sku || null, is_preferred || 0],
    });
    res.json({ id: result.lastInsertRowid });
  } catch {
    res.status(500).json({ error: "Failed to add supplier product" });
  }
});

// Purchase orders
router.get("/purchase-orders", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.name as creator_name
               FROM purchase_orders po
               JOIN suppliers s ON po.supplier_id = s.id
               JOIN warehouses w ON po.warehouse_id = w.id
               LEFT JOIN users u ON po.created_by = u.id
               WHERE 1=1`;
    const args: any[] = [];
    if (status) { sql += ` AND po.status = ?`; args.push(status); }
    sql += ` ORDER BY po.created_at DESC`;

    const result = await db.execute({ sql, args });
    const pos = await Promise.all(
      result.rows.map(async (po: any) => {
        const items = await db.execute({
          sql: `SELECT poi.*, p.name as product_name, p.image as product_image
                FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE poi.po_id = ?`,
          args: [po.id],
        });
        return { ...po, items: items.rows };
      })
    );
    res.json(pos);
  } catch {
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

// Create purchase order
router.post("/purchase-orders", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { supplier_id, warehouse_id, notes, expected_date, items } = req.body;
    const total = (items || []).reduce((sum: number, i: any) => sum + (i.unit_cost * i.quantity), 0);

    const poResult = await db.execute({
      sql: `INSERT INTO purchase_orders (supplier_id, warehouse_id, total, notes, expected_date, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      args: [supplier_id, warehouse_id, total, notes || null, expected_date || null, req.user!.id],
    });
    const poId = Number(poResult.lastInsertRowid);

    for (const item of items || []) {
      await db.execute({
        sql: `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)`,
        args: [poId, item.product_id, item.quantity, item.unit_cost],
      });
    }

    res.json({ id: poId, total });
  } catch {
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

// Update PO status
router.put("/purchase-orders/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.execute({ sql: "UPDATE purchase_orders SET status = ? WHERE id = ?", args: [status, id] });

    if (status === "received") {
      await db.execute({ sql: "UPDATE purchase_orders SET received_date = datetime('now') WHERE id = ?", args: [id] });

      const po = await db.execute({ sql: "SELECT warehouse_id FROM purchase_orders WHERE id = ?", args: [id] });
      const items = await db.execute({ sql: "SELECT * FROM purchase_order_items WHERE po_id = ?", args: [id] });
      const warehouseId = (po.rows[0] as any)?.warehouse_id;

      for (const item of items.rows) {
        const inv = await db.execute({
          sql: "SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?",
          args: [(item as any).product_id, warehouseId],
        });
        if (inv.rows.length > 0) {
          await db.execute({
            sql: "UPDATE inventory SET quantity = quantity + ? WHERE id = ?",
            args: [(item as any).quantity, (inv.rows[0] as any).id],
          });
        } else {
          await db.execute({
            sql: "INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
            args: [(item as any).product_id, warehouseId, (item as any).quantity],
          });
        }

        await db.execute({
          sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
                VALUES (?, ?, 'inbound', ?, 'purchase_order', ?, ?, ?)`,
          args: [(item as any).product_id, warehouseId, (item as any).quantity, id,
            `PO #${id} received`, req.user!.id],
        });
      }
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update PO" });
  }
});

export default router;
