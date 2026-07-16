import "dotenv/config";
import express from "express";
import cors from "cors";
import db from "./db";
import { initDatabase } from "./schema";
import { seed } from "./seed";
import { authMiddleware, type AuthRequest } from "./middleware";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/orders";
import wishlistRoutes from "./routes/wishlist";
import newsletterRoutes from "./routes/newsletter";
import reviewRoutes from "./routes/reviews";
import couponRoutes from "./routes/coupons";
import paymentRoutes from "./routes/payments";
import shippingRoutes from "./routes/shipping";
import inventoryRoutes from "./routes/inventory";
import fulfillmentRoutes from "./routes/fulfillment";
import supplierRoutes from "./routes/suppliers";
import returnRoutes from "./routes/returns";
import notificationRoutes from "./routes/notifications";
import analyticsRoutes from "./routes/analytics";
import warehouseRoutes from "./routes/warehouses";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth
app.use("/api/auth", authRoutes);

// Products (public)
app.use("/api/products", productRoutes);

// Cart (auth required)
app.use("/api/cart", cartRoutes);

// Orders (auth required)
app.use("/api/orders", orderRoutes);

// Wishlist (auth required)
app.use("/api/wishlist", wishlistRoutes);

// Newsletter & Testimonials (public)
app.use("/api", newsletterRoutes);

// Reviews (public + auth)
app.use("/api/reviews", reviewRoutes);

// Coupons (auth + admin)
app.use("/api/coupons", couponRoutes);

// Stripe Payments
app.use("/api/payments", paymentRoutes);

// Shipping (Shippo + carriers)
app.use("/api/shipping", shippingRoutes);

// Inventory Management
app.use("/api/inventory", inventoryRoutes);

// Fulfillment (pick/pack/ship workflow)
app.use("/api/fulfillment", fulfillmentRoutes);

// Suppliers & Purchase Orders
app.use("/api/suppliers", supplierRoutes);

// Returns / RMA
app.use("/api/returns", returnRoutes);

// Notifications
app.use("/api/notifications", notificationRoutes);

// Warehouses
app.use("/api/warehouses", warehouseRoutes);

// Analytics & Reporting
app.use("/api/analytics", analyticsRoutes);

// Categories (top-level)
app.get("/api/categories", async (_req, res) => {
  try {
    const result = await db.execute("SELECT * FROM categories ORDER BY id");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Admin stats
app.get("/api/admin/stats", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const [users, products, orders, revenue] = await Promise.all([
      db.execute("SELECT COUNT(*) as count FROM users WHERE role='user'"),
      db.execute("SELECT COUNT(*) as count FROM products"),
      db.execute("SELECT COUNT(*) as count FROM orders"),
      db.execute("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status='confirmed'"),
    ]);
    res.json({
      totalUsers: (users.rows[0] as any).count,
      totalProducts: (products.rows[0] as any).count,
      totalOrders: (orders.rows[0] as any).count,
      totalRevenue: (revenue.rows[0] as any).total,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Admin: List all users
app.get("/api/admin/users", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const result = await db.execute("SELECT id, name, email, role, avatar, phone, address, created_at FROM users ORDER BY created_at DESC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin: Order detail
app.get("/api/orders/detail/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const orderResult = await db.execute({
      sql: `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
      args: [req.params.id],
    });
    if (orderResult.rows.length === 0) { res.status(404).json({ error: "Order not found" }); return; }
    const items = await db.execute({
      sql: `SELECT oi.*, p.name as product_name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
      args: [req.params.id],
    });
    res.json({ ...orderResult.rows[0], items: items.rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Admin: Category CRUD
app.get("/api/admin/categories", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const result = await db.execute("SELECT * FROM categories ORDER BY id");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/admin/categories", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const { name, icon, color } = req.body;
    if (!name || !icon) { res.status(400).json({ error: "Name and icon required" }); return; }
    const result = await db.execute({ sql: "INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)", args: [name, icon, color || null] });
    res.status(201).json({ id: Number(result.lastInsertRowid), name, icon, color: color || null, count: 0 });
  } catch {
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.put("/api/admin/categories/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    const { name, icon, color } = req.body;
    await db.execute({ sql: "UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color) WHERE id = ?", args: [name || null, icon || null, color || null, req.params.id] });
    res.json({ message: "Category updated" });
  } catch {
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/admin/categories/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
    await db.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [req.params.id] });
    res.json({ message: "Category deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// Health
app.get("/api/health", (_req, res) => { res.json({ status: "ok", timestamp: new Date().toISOString() }); });

async function start() {
  try {
    await initDatabase();
    await seed();
    app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
