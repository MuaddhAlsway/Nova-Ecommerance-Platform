import Stripe from "stripe";
import { Router, type Response } from "express";
import { authMiddleware, type AuthRequest } from "../middleware";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

router.post("/create-intent", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, currency = "usd", order_metadata } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Invalid amount" });
      return;
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: String(req.user!.id),
        ...order_metadata,
      },
    });
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err: any) {
    console.error("Stripe create-intent error:", err.message);
    res.status(500).json({ error: err.message || "Payment intent creation failed" });
  }
});

router.post("/confirm", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      res.status(400).json({ error: "paymentIntentId required" });
      return;
    }
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    res.json({
      status: pi.status,
      paymentId: pi.id,
      amount: pi.amount / 100,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Payment confirmation failed" });
  }
});

router.post("/refund", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    const { paymentIntentId, amount } = req.body;
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    res.json({ refundId: refund.id, status: refund.status });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Refund failed" });
  }
});

export default router;
