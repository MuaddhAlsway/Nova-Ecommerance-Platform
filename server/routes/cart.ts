import db from "../db";
import { authMiddleware, type AuthRequest } from "../middleware";
import { Router, type Response } from "express";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: `SELECT ci.id, ci.quantity, ci.product_id, p.name, p.subtitle, p.price, p.original_price, p.image
            FROM cart_items ci JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?`,
      args: [req.user!.id],
    });
    const total = result.rows.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    res.json({ items: result.rows, total: Math.round(total * 100) / 100 });
  } catch {
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id) {
      res.status(400).json({ error: "product_id is required" });
      return;
    }
    const existing = await db.execute({
      sql: "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?",
      args: [req.user!.id, product_id],
    });
    if (existing.rows.length > 0) {
      const newQty = (existing.rows[0] as any).quantity + (quantity || 1);
      await db.execute({ sql: "UPDATE cart_items SET quantity = ? WHERE id = ?", args: [newQty, (existing.rows[0] as any).id] });
    } else {
      await db.execute({
        sql: "INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)",
        args: [req.user!.id, product_id, quantity || 1],
      });
    }
    res.status(201).json({ message: "Added to cart" });
  } catch {
    res.status(500).json({ error: "Failed to add to cart" });
  }
});

router.put("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { quantity } = req.body;
    if (quantity <= 0) {
      await db.execute({ sql: "DELETE FROM cart_items WHERE id = ? AND user_id = ?", args: [req.params.id, req.user!.id] });
    } else {
      await db.execute({ sql: "UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?", args: [quantity, req.params.id, req.user!.id] });
    }
    res.json({ message: "Cart updated" });
  } catch {
    res.status(500).json({ error: "Failed to update cart" });
  }
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({ sql: "DELETE FROM cart_items WHERE id = ? AND user_id = ?", args: [req.params.id, req.user!.id] });
    res.json({ message: "Removed from cart" });
  } catch {
    res.status(500).json({ error: "Failed to remove from cart" });
  }
});

router.delete("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({ sql: "DELETE FROM cart_items WHERE user_id = ?", args: [req.user!.id] });
    res.json({ message: "Cart cleared" });
  } catch {
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

router.post("/checkout", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { shipping_name, shipping_address, shipping_city, shipping_zip, payment_method, coupon_code, shipping_method, shipping_cost, stripe_payment_id } = req.body;
    const cart = await db.execute({
      sql: `SELECT ci.product_id, ci.quantity, p.price, p.name FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`,
      args: [req.user!.id],
    });
    if (cart.rows.length === 0) {
      res.status(400).json({ error: "Cart is empty" });
      return;
    }
    let total = cart.rows.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    // Apply coupon if provided
    let discountAmount = 0;
    if (coupon_code) {
      const couponResult = await db.execute({
        sql: "SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1",
        args: [coupon_code],
      });
      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0] as any;
        const validExpiry = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const validUses = coupon.max_uses === 0 || coupon.used_count < coupon.max_uses;
        const validMinOrder = total >= coupon.min_order;
        if (validExpiry && validUses && validMinOrder) {
          discountAmount = coupon.discount_type === "percent"
            ? Math.min(total * coupon.discount_value / 100, total)
            : Math.min(coupon.discount_value, total);
          await db.execute({ sql: "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", args: [coupon.id] });
        }
      }
    }

    const shippingCost = Number(shipping_cost) || 0;
    const finalTotal = Math.round((total - discountAmount + shippingCost) * 100) / 100;
    const carrierMap: Record<string, string> = {
      aramex_express: "Aramex", aramex_priority: "Aramex", dhl_express: "DHL",
      fedex_priority: "FedEx", ups_standard: "UPS", usps_priority: "USPS", free_standard: "Standard",
    };

    const order = await db.execute({
      sql: `INSERT INTO orders (user_id, total, status, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_method, shipping_carrier, payment_method, stripe_payment_id)
            VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        req.user!.id, finalTotal,
        shipping_name || req.user!.name, shipping_address || "", shipping_city || "", shipping_zip || "",
        shipping_method || "free_standard", carrierMap[shipping_method] || "Standard",
        payment_method || "card", stripe_payment_id || null,
      ],
    });
    const orderId = Number(order.lastInsertRowid);
    for (const item of cart.rows) {
      await db.execute({
        sql: "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        args: [orderId, (item as any).product_id, (item as any).quantity, (item as any).price],
      });
      await db.execute({
        sql: "UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?",
        args: [(item as any).quantity, (item as any).product_id],
      });
    }
    await db.execute({ sql: "DELETE FROM cart_items WHERE user_id = ?", args: [req.user!.id] });

    let shippoShipment: any = null;
    if (shipping_method && shipping_method !== "free_standard") {
      try {
        if (process.env.SHIPPO_API_TOKEN && process.env.SHIPPO_API_TOKEN !== "shippo_test_replace_with_your_token") {
          const shippoResp = await fetch(`${req.protocol}://${req.get("host")}/api/shipping/shipment`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer token` },
            body: JSON.stringify({
              shipping_name: shipping_name || req.user!.name,
              shipping_address,
              shipping_city,
              shipping_zip,
              weight: 500,
              pieces: cart.rows.length,
            }),
          });
          if (shippoResp.ok) {
            shippoShipment = await shippoResp.json();
            await db.execute({
              sql: "UPDATE orders SET shipping_tracking_number = ?, shipping_status = ? WHERE id = ?",
              args: [shippoShipment.tracking_number, shippoShipment.status || "pending", orderId],
            });
          }
        }
      } catch (err: any) {
        console.error("Shippo shipment creation failed:", err.message);
      }
    }

    res.json({ order_id: orderId, total: finalTotal, discount: discountAmount, shipping: shippingCost, status: "confirmed", shippo_shipment: shippoShipment });
  } catch {
    res.status(500).json({ error: "Failed to checkout" });
  }
});

export default router;
