import db from "../db";
import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware, adminMiddleware } from "../middleware";
import type { AuthRequest } from "../middleware";

const router = Router();

router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute("SELECT * FROM categories ORDER BY id");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, best_sellers, new_arrivals, featured, search, page = "1", limit = "12", sort } = req.query;
    let query = "SELECT * FROM products WHERE 1=1";
    const args: any[] = [];

    if (category) {
      query += " AND category_id = ?";
      args.push(category);
    }
    if (best_sellers === "true") query += " AND is_best_seller = 1";
    if (new_arrivals === "true") query += " AND is_new_arrival = 1";
    if (featured === "true") query += " AND is_featured = 1";

    if (search && typeof search === "string") {
      query += " AND (name LIKE ? OR subtitle LIKE ? OR description LIKE ?)";
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    let orderClause = " ORDER BY created_at DESC";
    if (sort === "price_asc") orderClause = " ORDER BY price ASC";
    else if (sort === "price_desc") orderClause = " ORDER BY price DESC";
    else if (sort === "rating") orderClause = " ORDER BY rating DESC";
    else if (sort === "name") orderClause = " ORDER BY name ASC";

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const offset = (pageNum - 1) * limitNum;

    const countQuery = `SELECT COUNT(*) as total FROM products WHERE 1=1` + query.slice("SELECT * FROM products WHERE 1=1".length);
    const countResult = await db.execute({ sql: countQuery, args });
    const total = Number(countResult.rows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limitNum);

    query += orderClause + " LIMIT ? OFFSET ?";
    args.push(limitNum, offset);

    const result = await db.execute({ sql: query, args });
    res.json({ products: result.rows, total, page: pageNum, totalPages });
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [req.params.id] });
    if (result.rows.length === 0) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, subtitle, description, price, original_price, rating, reviews, image, images, badge, stock, specs, category_id, is_best_seller, is_new_arrival, is_featured } = req.body;
    const result = await db.execute({
      sql: `INSERT INTO products (name, subtitle, description, price, original_price, rating, reviews, image, images, badge, stock, specs, category_id, is_best_seller, is_new_arrival, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [name, subtitle || null, description || null, price, original_price || null, rating || 0, reviews || 0, image || null, images || null, badge || null, stock || 100, specs || null, category_id || null, is_best_seller ? 1 : 0, is_new_arrival ? 1 : 0, is_featured ? 1 : 0],
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), ...req.body });
  } catch {
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const fields = req.body;
    const keys = Object.keys(fields);
    if (keys.length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => fields[k]);
    values.push(req.params.id);
    await db.execute({ sql: `UPDATE products SET ${setClause} WHERE id = ?`, args: values });
    res.json({ message: "Product updated" });
  } catch {
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [req.params.id] });
    res.json({ message: "Product deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
