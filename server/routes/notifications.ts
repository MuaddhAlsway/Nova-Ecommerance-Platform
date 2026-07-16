import { Router, type Response } from "express";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middleware";
import db from "../db";

const router = Router();

// Send notification
async function sendNotification(userId: number, type: string, title: string, message: string, channel = "email", refType?: string, refId?: number) {
  try {
    await db.execute({
      sql: `INSERT INTO notifications (user_id, type, title, message, channel, status, reference_type, reference_id)
            VALUES (?, ?, ?, ?, ?, 'sent', ?, ?)`,
      args: [userId, type, title, message, channel, refType || null, refId || null],
    });
  } catch (err) {
    console.error("Notification failed:", err);
  }
}

// Get user notifications
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { type, unread_only } = req.query;
    let sql = "SELECT * FROM notifications WHERE user_id = ?";
    const args: any[] = [req.user!.id];
    if (type) { sql += " AND type = ?"; args.push(type); }
    if (unread_only === "1") { sql += " AND status != 'read'"; }
    sql += " ORDER BY created_at DESC LIMIT 50";
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark as read
router.put("/:id/read", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({ sql: "UPDATE notifications SET status = 'read' WHERE id = ? AND user_id = ?", args: [req.params.id, req.user!.id] });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark notification" });
  }
});

// Mark all as read
router.put("/read-all", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await db.execute({ sql: "UPDATE notifications SET status = 'read' WHERE user_id = ? AND status != 'read'", args: [req.user!.id] });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark notifications" });
  }
});

// Unread count
router.get("/unread-count", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.execute({
      sql: "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status != 'read'",
      args: [req.user!.id],
    });
    res.json({ count: (result.rows[0] as any).count });
  } catch {
    res.status(500).json({ error: "Failed to get count" });
  }
});

// Admin: send notification to user
router.post("/send", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user_id, type, title, message, channel } = req.body;
    await sendNotification(user_id, type, title, message, channel || "email");
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// Admin: bulk send
router.post("/send-bulk", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { user_ids, type, title, message, channel } = req.body;
    let sent = 0;
    for (const uid of user_ids || []) {
      await sendNotification(uid, type, title, message, channel || "email");
      sent++;
    }
    res.json({ sent });
  } catch {
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

// Export sendNotification for use by other modules
export { sendNotification };
export default router;
