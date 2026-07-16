import { Router, type Response } from "express";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import db from "../db";

const router = Router();

// Dashboard stats
router.get("/dashboard", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [totalOrders, totalRevenue, ordersThisMonth, revenueThisMonth, avgOrderValue, topCarriers, recentOrders, lowStock] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE status != 'cancelled'", args: [] }),
      db.execute({ sql: "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'cancelled'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND status != 'cancelled'", args: [thirtyDaysAgo] }),
      db.execute({ sql: "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE created_at >= ? AND status != 'cancelled'", args: [thirtyDaysAgo] }),
      db.execute({ sql: "SELECT COALESCE(AVG(total), 0) as avg FROM orders WHERE status != 'cancelled'", args: [] }),
      db.execute({ sql: `SELECT shipping_carrier as carrier, COUNT(*) as count, SUM(shipping_cost) as cost
                          FROM orders WHERE shipping_carrier IS NOT NULL GROUP BY shipping_carrier ORDER BY count DESC`, args: [] }),
      db.execute({ sql: `SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id
                          ORDER BY o.created_at DESC LIMIT 10`, args: [] }),
      db.execute({ sql: `SELECT i.*, p.name as product_name, w.name as warehouse_name, (i.quantity - i.reserved) as available
                          FROM inventory i JOIN products p ON i.product_id = p.id JOIN warehouses w ON i.warehouse_id = w.id
                          WHERE (i.quantity - i.reserved) <= i.reorder_point`, args: [] }),
    ]);

    // Orders by day (last 30 days)
    const dailyOrders = await db.execute({
      sql: `SELECT date(created_at) as date, COUNT(*) as orders, SUM(total) as revenue
            FROM orders WHERE created_at >= ? AND status != 'cancelled'
            GROUP BY date(created_at) ORDER BY date`,
      args: [thirtyDaysAgo],
    });

    // Fulfillment pipeline
    const pipeline = await db.execute({
      sql: `SELECT status, COUNT(*) as count FROM fulfillment_tasks GROUP BY status`,
      args: [],
    });

    // Return rate
    const returnStats = await db.execute({
      sql: `SELECT COUNT(*) as total_returns,
                   SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded,
                   COALESCE(SUM(refund_amount), 0) as total_refunded
            FROM returns WHERE created_at >= ?`,
      args: [thirtyDaysAgo],
    });

    res.json({
      overview: {
        totalOrders: (totalOrders.rows[0] as any).count,
        totalRevenue: (totalRevenue.rows[0] as any).total,
        ordersThisMonth: (ordersThisMonth.rows[0] as any).count,
        revenueThisMonth: (revenueThisMonth.rows[0] as any).total,
        avgOrderValue: (avgOrderValue.rows[0] as any).avg,
      },
      topCarriers: topCarriers.rows,
      recentOrders: recentOrders.rows,
      lowStock: lowStock.rows,
      dailyOrders: dailyOrders.rows,
      pipeline: pipeline.rows,
      returns: returnStats.rows[0],
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Shipping cost analytics
router.get("/shipping", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [byCarrier, byMethod, avgByCarrier] = await Promise.all([
      db.execute({
        sql: `SELECT shipping_carrier as carrier, COUNT(*) as shipments,
                     COALESCE(SUM(shipping_cost), 0) as total_cost,
                     COALESCE(AVG(shipping_cost), 0) as avg_cost
              FROM orders WHERE created_at >= ? AND shipping_carrier IS NOT NULL AND status != 'cancelled'
              GROUP BY shipping_carrier ORDER BY total_cost DESC`,
        args: [since],
      }),
      db.execute({
        sql: `SELECT shipping_method as method, shipping_carrier as carrier, COUNT(*) as shipments,
                     COALESCE(AVG(shipping_cost), 0) as avg_cost
              FROM orders WHERE created_at >= ? AND shipping_method IS NOT NULL AND status != 'cancelled'
              GROUP BY shipping_method, shipping_carrier ORDER BY shipments DESC`,
        args: [since],
      }),
      db.execute({
        sql: `SELECT shipping_carrier as carrier,
                     AVG(CASE WHEN status = 'delivered' THEN 1.0 ELSE 0.0 END) * 100 as delivery_rate
              FROM orders WHERE created_at >= ? AND shipping_carrier IS NOT NULL
              GROUP BY shipping_carrier`,
        args: [since],
      }),
    ]);

    res.json({
      period: `${days} days`,
      byCarrier: byCarrier.rows,
      byMethod: byMethod.rows,
      performance: avgByCarrier.rows,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch shipping analytics" });
  }
});

// Warehouse inventory summary
router.get("/inventory", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [summary, movements, topProducts] = await Promise.all([
      db.execute({
        sql: `SELECT w.name as warehouse, COUNT(i.id) as products, SUM(i.quantity) as total_units,
                     SUM(i.reserved) as reserved_units, SUM(i.quantity - i.reserved) as available
              FROM warehouses w LEFT JOIN inventory i ON w.id = i.warehouse_id
              GROUP BY w.id`,
        args: [],
      }),
      db.execute({
        sql: `SELECT movement_type, COUNT(*) as count, SUM(quantity) as total_qty
              FROM inventory_movements WHERE created_at >= datetime('now', '-30 days')
              GROUP BY movement_type`,
        args: [],
      }),
      db.execute({
        sql: `SELECT p.name, p.image, SUM(i.quantity) as total_stock, SUM(i.reserved) as reserved
              FROM inventory i JOIN products p ON i.product_id = p.id
              GROUP BY p.id ORDER BY total_stock DESC LIMIT 10`,
        args: [],
      }),
    ]);

    res.json({
      warehouses: summary.rows,
      movements: movements.rows,
      topProducts: topProducts.rows,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch inventory analytics" });
  }
});

export default router;
