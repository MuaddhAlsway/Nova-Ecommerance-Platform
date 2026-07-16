import { Router, type Response } from "express";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import db from "../db";

const router = Router();

// Fulfillment dashboard stats
router.get("/stats", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [pending, picking, packing, ready, shipped, exceptions] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'pending'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'picking'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'packing'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'ready_to_ship'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'shipped'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'exception'", args: [] }),
    ]);
    res.json({
      pending: (pending.rows[0] as any).count,
      picking: (picking.rows[0] as any).count,
      packing: (packing.rows[0] as any).count,
      readyToShip: (ready.rows[0] as any).count,
      shipped: (shipped.rows[0] as any).count,
      exceptions: (exceptions.rows[0] as any).count,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// List fulfillment tasks
router.get("/tasks", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { status, warehouse_id, limit } = req.query;
    let sql = `
      SELECT ft.*, o.total as order_total, o.shipping_name, o.shipping_address, o.shipping_city, o.shipping_zip,
             o.shipping_method, o.shipping_carrier, o.shipping_tracking_number,
             u.name as assignee_name, w.name as warehouse_name
      FROM fulfillment_tasks ft
      JOIN orders o ON ft.order_id = o.id
      LEFT JOIN users u ON ft.assigned_to = u.id
      LEFT JOIN warehouses w ON ft.warehouse_id = w.id
      WHERE 1=1
    `;
    const args: any[] = [];
    if (status) { sql += ` AND ft.status = ?`; args.push(status); }
    if (warehouse_id) { sql += ` AND ft.warehouse_id = ?`; args.push(warehouse_id); }
    sql += ` ORDER BY ft.created_at DESC LIMIT ?`;
    args.push(Number(limit) || 50);

    const result = await db.execute({ sql, args });

    // Attach items to each task
    const tasks = await Promise.all(
      result.rows.map(async (task: any) => {
        const items = await db.execute({
          sql: `SELECT oi.*, p.name as product_name, p.image as product_image
                FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
          args: [task.order_id],
        });
        return { ...task, items: items.rows };
      })
    );

    res.json(tasks);
  } catch {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Create fulfillment task for an order
router.post("/tasks", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { order_id, warehouse_id, assigned_to } = req.body;

    const existing = await db.execute({
      sql: "SELECT id FROM fulfillment_tasks WHERE order_id = ?",
      args: [order_id],
    });
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Fulfillment task already exists for this order" });
    }

    const result = await db.execute({
      sql: `INSERT INTO fulfillment_tasks (order_id, warehouse_id, assigned_to, status) VALUES (?, ?, ?, 'pending')`,
      args: [order_id, warehouse_id || null, assigned_to || null],
    });

    await db.execute({
      sql: "UPDATE orders SET status = 'confirmed' WHERE id = ? AND status = 'pending'",
      args: [order_id],
    });

    res.json({ id: result.lastInsertRowid });
  } catch {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Auto-create fulfillment tasks for all confirmed orders without tasks
router.post("/tasks/auto-create", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await db.execute({
      sql: `SELECT o.id FROM orders o
            LEFT JOIN fulfillment_tasks ft ON o.id = ft.order_id
            WHERE o.status = 'confirmed' AND ft.id IS NULL`,
      args: [],
    });

    let created = 0;
    for (const order of orders.rows) {
      await db.execute({
        sql: `INSERT INTO fulfillment_tasks (order_id, status) VALUES (?, 'pending')`,
        args: [(order as any).id],
      });
      created++;
    }

    res.json({ created, message: `${created} fulfillment tasks created` });
  } catch {
    res.status(500).json({ error: "Failed to auto-create tasks" });
  }
});

// Update fulfillment task status
router.put("/tasks/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, notes } = req.body;

    const task = await db.execute({ sql: "SELECT * FROM fulfillment_tasks WHERE id = ?", args: [id] });
    if (task.rows.length === 0) return res.status(404).json({ error: "Task not found" });

    const current = task.rows[0] as any;
    const now = new Date().toISOString();
    const updates: string[] = [];
    const args: any[] = [];

    if (status) {
      updates.push("status = ?");
      args.push(status);

      if (status === "picking" && !current.pick_started_at) { updates.push("pick_started_at = ?"); args.push(now); }
      if (status === "packing") {
        if (!current.pick_completed_at) { updates.push("pick_completed_at = ?"); args.push(now); }
        updates.push("pack_started_at = ?"); args.push(now);
      }
      if (status === "ready_to_ship") { updates.push("pack_completed_at = ?"); args.push(now); }
      if (status === "shipped") { updates.push("shipped_at = ?"); args.push(now); }
      if (status === "delivered") { updates.push("delivered_at = ?"); args.push(now); }
    }
    if (assigned_to !== undefined) { updates.push("assigned_to = ?"); args.push(assigned_to); }
    if (notes !== undefined) { updates.push("notes = ?"); args.push(notes); }

    if (updates.length > 0) {
      args.push(id);
      await db.execute({ sql: `UPDATE fulfillment_tasks SET ${updates.join(", ")} WHERE id = ?`, args });
    }

    // Sync order status
    if (status === "shipped") {
      await db.execute({ sql: "UPDATE orders SET status = 'shipped' WHERE id = ?", args: [current.order_id] });
    } else if (status === "delivered") {
      await db.execute({ sql: "UPDATE orders SET status = 'delivered' WHERE id = ?", args: [current.order_id] });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Pick lists
router.get("/pick-lists", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id } = req.query;
    let sql = `SELECT pl.*, w.name as warehouse_name, u.name as assignee_name
               FROM pick_lists pl
               LEFT JOIN warehouses w ON pl.warehouse_id = w.id
               LEFT JOIN users u ON pl.assigned_to = u.id
               WHERE 1=1`;
    const args: any[] = [];
    if (warehouse_id) { sql += ` AND pl.warehouse_id = ?`; args.push(warehouse_id); }
    sql += ` ORDER BY pl.created_at DESC LIMIT 20`;

    const result = await db.execute({ sql, args });

    const lists = await Promise.all(
      result.rows.map(async (list: any) => {
        const items = await db.execute({
          sql: `SELECT pli.*, p.name as product_name, p.image as product_image,
                       ft.order_id, o.shipping_name
                FROM pick_list_items pli
                JOIN products p ON pli.product_id = p.id
                JOIN fulfillment_tasks ft ON pli.fulfillment_task_id = ft.id
                JOIN orders o ON ft.order_id = o.id
                WHERE pli.pick_list_id = ?`,
          args: [list.id],
        });
        return { ...list, items: items.rows };
      })
    );

    res.json(lists);
  } catch {
    res.status(500).json({ error: "Failed to fetch pick lists" });
  }
});

// Create pick list from pending tasks
router.post("/pick-lists", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { warehouse_id, task_ids, assigned_to } = req.body;

    const listResult = await db.execute({
      sql: `INSERT INTO pick_lists (warehouse_id, assigned_to, status) VALUES (?, ?, 'open')`,
      args: [warehouse_id, assigned_to || null],
    });
    const listId = Number(listResult.lastInsertRowid);

    let totalItems = 0;
    const tasks = task_ids && task_ids.length > 0 ? task_ids : [];

    if (tasks.length === 0) {
      // Auto-assign pending tasks for this warehouse
      const pending = await db.execute({
        sql: `SELECT id FROM fulfillment_tasks WHERE status = 'pending' ${warehouse_id ? "AND warehouse_id = ?" : ""} LIMIT 20`,
        args: warehouse_id ? [warehouse_id] : [],
      });
      tasks.push(...pending.rows.map((r: any) => r.id));
    }

    for (const taskId of tasks) {
      const task = await db.execute({ sql: "SELECT * FROM fulfillment_tasks WHERE id = ?", args: [taskId] });
      if (task.rows.length === 0) continue;
      const t = task.rows[0] as any;

      const items = await db.execute({ sql: "SELECT * FROM order_items WHERE order_id = ?", args: [t.order_id] });
      for (const item of items.rows) {
        const inv = await db.execute({
          sql: "SELECT bin_location FROM inventory WHERE product_id = ? AND warehouse_id = ?",
          args: [(item as any).product_id, warehouse_id],
        });
        const bin = inv.rows.length > 0 ? (inv.rows[0] as any).bin_location : null;

        await db.execute({
          sql: `INSERT INTO pick_list_items (pick_list_id, fulfillment_task_id, product_id, quantity, bin_location)
                VALUES (?, ?, ?, ?, ?)`,
          args: [listId, taskId, (item as any).product_id, (item as any).quantity, bin],
        });
        totalItems++;
      }

      await db.execute({ sql: "UPDATE fulfillment_tasks SET status = 'picking', pick_started_at = datetime('now') WHERE id = ?", args: [taskId] });
    }

    await db.execute({ sql: "UPDATE pick_lists SET total_items = ? WHERE id = ?", args: [totalItems, listId] });

    res.json({ id: listId, total_items: totalItems });
  } catch {
    res.status(500).json({ error: "Failed to create pick list" });
  }
});

// Mark pick list item as picked
router.put("/pick-lists/:listId/items/:itemId", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { listId, itemId } = req.params;
    const { picked_quantity, status } = req.body;

    await db.execute({
      sql: `UPDATE pick_list_items SET picked_quantity = ?, status = ?, picked_at = datetime('now') WHERE id = ? AND pick_list_id = ?`,
      args: [picked_quantity, status || "picked", itemId, listId],
    });

    // Update completed count
    const completed = await db.execute({
      sql: "SELECT COUNT(*) as count FROM pick_list_items WHERE pick_list_id = ? AND status != 'pending'",
      args: [listId],
    });
    const total = await db.execute({
      sql: "SELECT total_items FROM pick_lists WHERE id = ?", args: [listId],
    });
    await db.execute({
      sql: "UPDATE pick_lists SET completed_items = ? WHERE id = ?",
      args: [(completed.rows[0] as any).count, listId],
    });

    if ((completed.rows[0] as any).count >= (total.rows[0] as any).total_items) {
      await db.execute({ sql: "UPDATE pick_lists SET status = 'completed', completed_at = datetime('now') WHERE id = ?", args: [listId] });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update pick item" });
  }
});

export default router;
