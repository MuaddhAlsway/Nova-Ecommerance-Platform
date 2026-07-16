import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@libsql/client';
import Stripe from 'stripe';
import nodeCrypto from 'crypto';

const _origStringify = JSON.stringify;
(JSON as any).stringify = function (value: any, replacer?: any, space?: any) {
  return _origStringify(value, function (_key: string, val: any) {
    return typeof val === 'bigint' ? Number(val) : val;
  }, space);
};

type Env = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  SHIPPO_API_TOKEN: string;
  GMAIL_USER: string;
  GMAIL_APP_PASSWORD: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  KV: KVNamespace;
  RATE_LIMIT: KVNamespace;
};

type Variables = {
  user: { id: number; email: string; name: string; role: string };
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', cors());

// ─── CACHING LAYER ───────────────────────────────────────────
const CACHE_TTL = {
  products: 300,        // 5 min
  product: 300,         // 5 min
  categories: 3600,     // 1 hour
  testimonials: 3600,   // 1 hour
  auth: 600,            // 10 min
  shippingRates: 900,   // 15 min
  stats: 120,           // 2 min
  orders: 60,           // 1 min
  notifications: 30,    // 30 sec
  wishlist: 120,        // 2 min
  suppliers: 300,       // 5 min
  carriers: 3600,       // 1 hour
};

// Inflight request dedup — prevents thundering herd on cache miss
const inflight = new Map<string, Promise<any>>();

async function cacheGet<T>(kv: KVNamespace | undefined, key: string): Promise<T | null> {
  if (!kv) return null;
  try {
    const val = await kv.get(key, 'json');
    return val as T;
  } catch { return null; }
}

async function cacheSet(kv: KVNamespace | undefined, key: string, value: any, ttl: number): Promise<void> {
  if (!kv) return;
  try {
    await kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
  } catch {}
}

async function cacheDelete(kv: KVNamespace | undefined, key: string): Promise<void> {
  if (!kv) return;
  try { await kv.delete(key); } catch {}
}

async function cacheInvalidatePattern(kv: KVNamespace | undefined, prefix: string): Promise<void> {
  if (!kv) return;
  try {
    const list = await kv.list({ prefix });
    await Promise.all(list.keys.map(k => kv.delete(k.name)));
  } catch {}
}

// Core cached query with inflight dedup + stale-while-revalidate
async function cachedQuery<T>(kv: KVNamespace | undefined, key: string, ttl: number, queryFn: () => Promise<T>): Promise<T> {
  if (!kv) return queryFn();
  const cached = await cacheGet<T>(kv, key);
  if (cached !== null) return cached;

  // Dedup: if same key is being fetched right now, wait for it
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = queryFn().then(async (result) => {
    await cacheSet(kv, key, result, ttl);
    inflight.delete(key);
    return result;
  }).catch((err) => {
    inflight.delete(key);
    throw err;
  });
  inflight.set(key, promise);
  return promise;
}

// Stale-while-revalidate: return stale immediately, refresh in background
async function cachedQuerySWR<T>(kv: KVNamespace | undefined, key: string, ttl: number, staleTtl: number, queryFn: () => Promise<T>): Promise<T> {
  if (!kv) return queryFn();
  const cached = await cacheGet<{ data: T; ts: number }>(kv, key);
  if (cached) {
    const age = Date.now() - cached.ts;
    if (age < ttl) return cached.data; // fresh
    if (age < staleTtl) {
      // stale but usable — refresh in background (fire and forget)
      queryFn().then(async (fresh) => {
        await cacheSet(kv, key, { data: fresh, ts: Date.now() }, staleTtl);
        inflight.delete(key);
      }).catch(() => {});
      inflight.delete(key);
      return cached.data;
    }
  }
  // expired or missing — fetch synchronously with dedup
  if (inflight.has(key)) {
    const existing = await inflight.get(key)!;
    return existing;
  }
  const promise = queryFn().then(async (result) => {
    await cacheSet(kv, key, { data: result, ts: Date.now() }, staleTtl);
    inflight.delete(key);
    return result;
  }).catch((err) => { inflight.delete(key); throw err; });
  inflight.set(key, promise);
  return promise;
}

// User-scoped cache key helper (prevents cross-user data leaks)
function userKey(userId: number | string, prefix: string, suffix?: string): string {
  return `u:${userId}:${prefix}${suffix ? ':' + suffix : ''}`;
}

// ─── RATE LIMITING ───────────────────────────────────────────
const RATE_LIMITS = {
  default: { windowMs: 60000, max: 100 },     // 100 req/min
  auth: { windowMs: 60000, max: 20 },          // 20 login attempts/min
  checkout: { windowMs: 60000, max: 10 },      // 10 checkouts/min
  shipping: { windowMs: 60000, max: 30 },      // 30 rate lookups/min
  broadcast: { windowMs: 60000, max: 5 },       // 5 broadcasts/min
};

async function checkRateLimit(kv: KVNamespace | undefined, key: string, limit: { windowMs: number; max: number }): Promise<{ allowed: boolean; remaining: number }> {
  if (!kv) return { allowed: true, remaining: limit.max };
  const now = Date.now();
  const windowKey = `rl:${key}:${Math.floor(now / limit.windowMs)}`;
  try {
    const current = await kv.get(windowKey, 'text');
    const count = current ? parseInt(current) : 0;
    if (count >= limit.max) return { allowed: false, remaining: 0 };
    await kv.put(windowKey, String(count + 1), { expirationTtl: Math.ceil(limit.windowMs / 1000) + 10 });
    return { allowed: true, remaining: limit.max - count - 1 };
  } catch {
    return { allowed: true, remaining: limit.max };
  }
}

function rateLimitMiddleware(limitName: keyof typeof RATE_LIMITS) {
  return async (c: any, next: any) => {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const token = c.req.header('authorization')?.replace('Bearer ', '') || '';
    const key = token ? `token:${token}` : `ip:${ip}`;
    const limit = RATE_LIMITS[limitName];
    const result = await checkRateLimit(c.env.RATE_LIMIT, key, limit);
    c.header('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) return c.json({ error: 'Rate limit exceeded. Try again later.' }, 429);
    await next();
  };
}

// ─── AUTH MIDDLEWARE (with KV cache) ─────────────────────────

function createDb(env: Env) {
  return createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
}

function generateToken(): string {
  return nodeCrypto.randomBytes(32).toString('hex');
}

function hashPassword(password: string): string {
  const salt = nodeCrypto.randomBytes(16).toString('hex');
  const key = nodeCrypto.scryptSync(password, salt, 64);
  return salt + ':' + key.toString('hex');
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const key = nodeCrypto.scryptSync(password, salt, 64);
  return key.toString('hex') === hash;
}

const CATEGORIES = [
  { name: 'Laptops', icon: 'Laptop', count: 124, color: 'from-blue-500/10' },
  { name: 'Smartwatches', icon: 'Watch', count: 89, color: 'from-purple-500/10' },
  { name: 'Smartphones', icon: 'Smartphone', count: 156, color: 'from-emerald-500/10' },
  { name: 'Audio', icon: 'Headphones', count: 203, color: 'from-rose-500/10' },
  { name: 'Gaming', icon: 'Gamepad2', count: 178, color: 'from-orange-500/10' },
  { name: 'Accessories', icon: 'Package', count: 445, color: 'from-cyan-500/10' },
];

const PRODUCTS = [
  { name: 'MacBook Pro 16"', subtitle: 'M3 Max · 36GB RAM · 1TB SSD', description: 'The most powerful MacBook Pro ever. With M3 Max chip, up to 128GB unified memory, and up to 22 hours of battery life. Built for demanding pro workflows.', price: 3499, original_price: 3899, rating: 4.9, reviews: 2847, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=800&fit=crop","https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=800&fit=crop"]', badge: 'Best Seller', category_name: 'Laptops', is_best_seller: 1, stock: 50, specs: '{"Chip":"M3 Max","RAM":"36GB","Storage":"1TB SSD","Display":"16.2-inch Liquid Retina XDR","Battery":"Up to 22 hours","Weight":"2.14 kg"}' },
  { name: 'Apple Watch Ultra 2', subtitle: '49mm · Titanium · GPS + Cellular', description: 'The most rugged and capable Apple Watch. Featuring the brightest display ever, precision dual-frequency GPS, and up to 36 hours of battery life.', price: 799, original_price: null, rating: 4.8, reviews: 1923, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=800&fit=crop"]', badge: 'Top Rated', category_name: 'Smartwatches', is_best_seller: 1, stock: 75, specs: '{"Case":"49mm Titanium","Display":"Always-On Retina","GPS":"Precision dual-frequency","Water":"100m WR","Battery":"Up to 36 hours","Chip":"S9 SiP"}' },
  { name: 'Sony WH-1000XM5', subtitle: 'Wireless Noise Cancelling', description: 'Industry-leading noise cancellation with Auto NC Optimizer. Crystal clear hands-free calling with 4 beamforming microphones. Up to 30 hours battery.', price: 349, original_price: 399, rating: 4.9, reviews: 4521, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=800&fit=crop"]', badge: 'Staff Pick', category_name: 'Audio', is_best_seller: 1, is_featured: 1, stock: 120, specs: '{"Driver":"30mm","ANC":"Industry Leading","Battery":"30 hours","Bluetooth":"5.2","Codec":"LDAC, AAC","Weight":"250g"}' },
  { name: 'iPhone 15 Pro Max', subtitle: '256GB · Natural Titanium', description: 'Titanium design. A17 Pro chip. Customizable Action button. The most powerful iPhone camera system ever for incredible photos and videos.', price: 1199, original_price: null, rating: 4.8, reviews: 8234, image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200&h=800&fit=crop"]', badge: null, category_name: 'Smartphones', is_best_seller: 1, stock: 200, specs: '{"Chip":"A17 Pro","Display":"6.7-inch Super Retina XDR","Camera":"48MP Main","Storage":"256GB","Battery":"Up to 29 hours video","Frame":"Titanium"}' },
  { name: 'iPad Pro M4', subtitle: '13-inch · 256GB · Wi-Fi', description: 'The ultimate iPad experience with the blazing M4 chip. Ultra Retina XDR display. Supports Apple Pencil Pro and Magic Keyboard.', price: 1299, original_price: null, rating: 4.9, reviews: 743, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&h=800&fit=crop"]', badge: 'New', category_name: 'Laptops', is_new_arrival: 1, stock: 60, specs: '{"Chip":"M4","Display":"13-inch Ultra Retina XDR","Storage":"256GB","Camera":"12MP Wide","Apple Pencil":"Pro supported","Weight":"579g"}' },
  { name: 'Samsung Galaxy S25 Ultra', subtitle: '512GB · Titanium Silver', description: 'The next leap in AI-powered mobile computing. Galaxy AI helps you search, create, and communicate in entirely new ways.', price: 1399, original_price: null, rating: 4.7, reviews: 1056, image: 'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1567581935884-3349723552ca?w=1200&h=800&fit=crop"]', badge: 'New', category_name: 'Smartphones', is_new_arrival: 1, stock: 90, specs: '{"Chip":"Snapdragon 8 Elite","Display":"6.9-inch QHD+ AMOLED","Camera":"200MP Main","Storage":"512GB","Battery":"5000mAh","S Pen":"Built-in"}' },
  { name: 'Apple AirPods Max', subtitle: 'USB-C · Midnight', description: 'Stunning high-fidelity audio. Active Noise Cancellation blocks outside noise. Transparency mode lets ambient sound in. Computational audio magic.', price: 549, original_price: null, rating: 4.6, reviews: 892, image: 'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=1200&h=800&fit=crop"]', badge: 'New', category_name: 'Audio', is_new_arrival: 1, stock: 85, specs: '{"Driver":"40mm Apple-designed","ANC":"Active","Transparency":"Yes","Battery":"20 hours","Connector":"USB-C","Spatial Audio":"Yes"}' },
  { name: 'ASUS ROG Zephyrus G16', subtitle: 'RTX 4090 · AMD Ryzen 9', description: 'Ultra-slim powerhouse gaming laptop with ROG Nebula Display, NVIDIA GeForce RTX 4090, and AMD Ryzen 9 processor for uncompromising performance.', price: 2799, original_price: null, rating: 4.8, reviews: 334, image: 'https://images.unsplash.com/photo-1593640408182-31c228e2c7d2?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1593640408182-31c228e2c7d2?w=1200&h=800&fit=crop"]', badge: 'New', category_name: 'Gaming', is_new_arrival: 1, stock: 30, specs: '{"GPU":"NVIDIA RTX 4090","CPU":"AMD Ryzen 9 7945HX","RAM":"32GB DDR5","Storage":"2TB NVMe","Display":"16-inch QHD 240Hz","Weight":"1.85 kg"}' },
  { name: 'Samsung Galaxy Watch 6 Classic', subtitle: '47mm · Bluetooth · Black', description: 'The iconic rotating bezel is back. Advanced sleep coaching, BioActive Sensor for heart rate, and sapphire crystal glass.', price: 399, original_price: 429, rating: 4.5, reviews: 1234, image: 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=1200&h=800&fit=crop"]', badge: null, category_name: 'Smartwatches', is_new_arrival: 0, stock: 100, specs: '{"Display":"1.47-inch Super AMOLED","Processor":"Exynos W930","Storage":"16GB","Battery":"425mAh","Water":"5ATM + IP68","Glass":"Sapphire Crystal"}' },
  { name: 'Nintendo Switch OLED', subtitle: 'White · 64GB', description: 'Play at home on the TV or on the go with a vibrant 7-inch OLED screen. Enhanced audio and a wide adjustable stand for comfortable tabletop play.', price: 349, original_price: null, rating: 4.7, reviews: 15678, image: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=1200&h=800&fit=crop"]', badge: null, category_name: 'Gaming', is_best_seller: 0, stock: 150, specs: '{"Display":"7-inch OLED","Storage":"64GB","Resolution":"1280x720","Audio":"Enhanced","Stand":"Adjustable wide","Battery":"4.5-9 hours"}' },
  { name: 'Bose QuietComfort Ultra', subtitle: 'Wireless Noise Cancelling Earbuds', description: 'World-class noise cancellation with Immersive Audio. CustomTune technology calibrates sound to your ears. Up to 6 hours battery life.', price: 299, original_price: null, rating: 4.7, reviews: 2341, image: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=1200&h=800&fit=crop"]', badge: null, category_name: 'Audio', is_new_arrival: 0, stock: 200, specs: '{"ANC":"World-class","Audio":"Immersive Spatial","Battery":"6 hours (24 with case)","Fit":"Stability Bands","Water":"IPX4","Bluetooth":"5.3"}' },
  { name: 'Apple Magic Keyboard', subtitle: 'for iPad Pro 13-inch · Black', description: 'The ultimate keyboard experience for iPad Pro. Built-in trackpad, USB-C charging port, and a sleek floating cantilever design.', price: 349, original_price: null, rating: 4.4, reviews: 567, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop&auto=format', images: '["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&h=800&fit=crop"]', badge: null, category_name: 'Accessories', is_new_arrival: 0, stock: 300, specs: '{"Connectivity":"Smart Connector","Trackpad":"Multi-touch","Charging":"USB-C","Backlight":"Yes","Angle":"Adjustable","Weight":"710g"}' },
];

const TESTIMONIALS = [
  { name: 'Alexandra Chen', role: 'Creative Director', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332e234?w=80&h=80&fit=crop&auto=format', quote: 'NOVA has completely transformed how I shop for technology. The curation is impeccable.', rating: 5 },
  { name: 'Marcus Reynolds', role: 'Software Engineer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format', quote: 'The level of service is unmatched. I had a question at 11pm and received a response within minutes.', rating: 5 },
  { name: 'Isabelle Fontaine', role: 'Architect', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format', quote: 'NOVA is in a different league — the attention to detail is truly extraordinary.', rating: 5 },
];

const COUPONS = [
  { code: 'WELCOME10', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: 0, expires_at: null },
  { code: 'SAVE50', discount_type: 'fixed', discount_value: 50, min_order: 200, max_uses: 100, expires_at: null },
  { code: 'VIP20', discount_type: 'percent', discount_value: 20, min_order: 500, max_uses: 50, expires_at: null },
];

async function seedDatabase(db: ReturnType<typeof createDb>) {
  const existing = await db.execute('SELECT COUNT(*) as count FROM categories');
  if ((existing.rows[0] as any).count > 0) return;

  const adminHash = await hashPassword('admin123');
  await db.execute({
    sql: "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    args: ['Admin', 'admin@nova.com', adminHash],
  });

  const userHash = await hashPassword('user123');
  await db.execute({
    sql: "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
    args: ['Demo User', 'user@nova.com', userHash],
  });

  for (const cat of CATEGORIES) {
    await db.execute({
      sql: 'INSERT INTO categories (name, icon, count, color) VALUES (?, ?, ?, ?)',
      args: [cat.name, cat.icon, cat.count, cat.color],
    });
  }

  for (const p of PRODUCTS) {
    const cat = await db.execute({ sql: 'SELECT id FROM categories WHERE name = ?', args: [p.category_name] });
    const categoryId = cat.rows[0]?.id ?? null;
    await db.execute({
      sql: `INSERT INTO products (name, subtitle, description, price, original_price, rating, reviews, image, images, badge, stock, specs, category_id, is_best_seller, is_new_arrival, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.name, p.subtitle, p.description, p.price, p.original_price, p.rating, p.reviews, p.image, p.images, p.badge, p.stock, p.specs, categoryId, p.is_best_seller || 0, p.is_new_arrival || 0, p.is_featured || 0],
    });
  }

  for (const t of TESTIMONIALS) {
    await db.execute({
      sql: 'INSERT INTO testimonials (name, role, avatar, quote, rating) VALUES (?, ?, ?, ?, ?)',
      args: [t.name, t.role, t.avatar, t.quote, t.rating],
    });
  }

  for (const c of COUPONS) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [c.code, c.discount_type, c.discount_value, c.min_order, c.max_uses, c.expires_at],
    });
  }

  await db.execute({
    sql: `INSERT OR IGNORE INTO warehouses (name, address, city, state, zip, country, is_default)
          VALUES ('NOVA Fulfillment Center', '100 Commerce Blvd', 'Newark', 'NJ', '07102', 'US', 1)`,
    args: [],
  });

  const products = await db.execute({ sql: 'SELECT id, stock FROM products', args: [] });
  const wh = await db.execute({ sql: 'SELECT id FROM warehouses WHERE is_default = 1', args: [] });
  if (wh.rows.length > 0) {
    const whId = (wh.rows[0] as any).id;
    for (const p of products.rows) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO inventory (product_id, warehouse_id, quantity, reorder_point, reorder_quantity, bin_location)
              VALUES (?, ?, ?, 10, 50, ?)`,
        args: [(p as any).id, whId, (p as any).stock, `A-${String.fromCharCode(65 + Math.floor(Math.random() * 8))}-${Math.floor(Math.random() * 20) + 1}`],
      });
    }
  }
}

let seeded = false;

async function ensureSeeded(db: ReturnType<typeof createDb>) {
  if (!seeded) {
    await seedDatabase(db);
    seeded = true;
  }
}

app.use('*', async (c, next) => {
  const db = createDb(c.env);
  await ensureSeeded(db);
  await next();
});

const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'No token provided' }, 401);

  const kv = c.env.KV;
  const cacheKey = `auth:${token}`;
  if (kv) {
    const cached = await cacheGet<any>(kv, cacheKey);
    if (cached) { c.set('user', cached); await next(); return; }
  }

  const db = createDb(c.env);
  const result = await db.execute({ sql: 'SELECT id, email, name, role FROM users WHERE token = ?', args: [token] });
  if (result.rows.length === 0) return c.json({ error: 'Invalid token' }, 401);

  const user = result.rows[0] as any;
  if (kv) await cacheSet(kv, cacheKey, user, CACHE_TTL.auth);
  c.set('user', user);
  await next();
};

const adminMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  await next();
};

const CARRIER_MAP: Record<string, string> = {
  aramex_express: 'Aramex', aramex_priority: 'Aramex', dhl_express: 'DHL',
  fedex_priority: 'FedEx', ups_standard: 'UPS', usps_priority: 'USPS', free_standard: 'Standard',
};

function sanitizeRows(rows: any[]): any[] {
  return rows.map((r) => {
    const obj: any = {};
    for (const [k, v] of Object.entries(r)) {
      obj[k] = typeof v === 'bigint' ? Number(v) : v;
    }
    return obj;
  });
}

const NOVA_LOGO = `<span style="font-family:Georgia,serif;font-size:22px;letter-spacing:0.35em;color:#fff;font-weight:300">NOVA</span>`;

function emailBase(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
<tr><td style="text-align:center;padding:30px 0 40px;border-bottom:1px solid rgba(255,255,255,0.07)">${NOVA_LOGO}</td></tr>
<tr><td style="padding:40px 0 20px"><h1 style="font-family:Georgia,serif;font-size:24px;color:#fff;font-weight:300;margin:0;letter-spacing:0.05em">${title}</h1></td></tr>
<tr><td style="padding:0 0 30px;color:rgba(255,255,255,0.45);font-size:14px;line-height:1.7">${body}</td></tr>
<tr><td style="border-top:1px solid rgba(255,255,255,0.07);padding:30px 0;text-align:center">
<p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0">&copy; 2026 NOVA Technologies, Inc. All rights reserved.</p>
<p style="color:rgba(255,255,255,0.15);font-size:10px;margin:8px 0 0">350 Fifth Avenue, Suite 7820, New York, NY 10118</p>
</td></tr></table></td></tr></table></body></html>`;
}

function orderConfirmEmail(name: string, orderId: number, total: number, items: { name: string; qty: number; price: number }[]): string {
  const itemRows = items.map(i => `<tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);font-size:13px">${i.name}</td><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.35);font-size:13px;text-align:center">x${i.qty}</td><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);font-size:13px;text-align:right">$${(i.price * i.qty).toFixed(2)}</td></tr>`).join('');
  return emailBase('Order Confirmed', `
<p style="margin:0 0 20px">Hi ${name},</p>
<p style="margin:0 0 20px">Thank you for your purchase. Your order <strong style="color:#fff">#${orderId}</strong> has been confirmed and is being prepared.</p>
<table width="100%" style="background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;margin:20px 0">
<tr><td style="padding:20px"><table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 15px;color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.15em;text-transform:uppercase">Order Items</td></tr>
${itemRows}
<tr><td colspan="2" style="padding:15px 0 0;color:rgba(255,255,255,0.3);font-size:13px">Total</td><td style="padding:15px 0 0;color:#fff;font-size:15px;text-align:right;font-weight:500">$${total.toFixed(2)}</td></tr>
</table></td></tr></table>
<p style="margin:20px 0 0;color:rgba(255,255,255,0.3);font-size:13px">You will receive a shipping confirmation once your order is on its way.</p>
<div style="margin:30px 0"><a href="https://nova-ecommerce-cm7.pages.dev/dashboard" style="display:inline-block;padding:12px 32px;background:#fff;color:#080808;text-decoration:none;border-radius:9999px;font-size:13px;font-weight:500">View Order</a></div>`);
}

function loginEmail(name: string): string {
  return emailBase('Welcome Back', `
<p style="margin:0 0 20px">Hi ${name},</p>
<p style="margin:0 0 20px">You've successfully signed in to your NOVA account. If this wasn't you, please secure your account immediately.</p>
<table width="100%" style="background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.07);margin:20px 0">
<tr><td style="padding:20px"><table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.15em;text-transform:uppercase;padding-bottom:12px">Login Details</td></tr>
<tr><td style="color:rgba(255,255,255,0.5);font-size:13px">Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</td></tr>
<tr><td style="color:rgba(255,255,255,0.5);font-size:13px;padding-top:4px">Device: Web Browser</td></tr>
</table></td></tr></table>
<div style="margin:30px 0"><a href="https://nova-ecommerce-cm7.pages.dev/products" style="display:inline-block;padding:12px 32px;background:#fff;color:#080808;text-decoration:none;border-radius:9999px;font-size:13px;font-weight:500">Continue Shopping</a></div>`);
}

function broadcastEmail(title: string, message: string): string {
  return emailBase(title, `
<p style="margin:0 0 20px">Hello,</p>
<div style="background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.07);padding:24px;margin:20px 0">
<p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;margin:0">${message.replace(/\n/g, '<br>')}</p>
</div>
<div style="margin:30px 0"><a href="https://nova-ecommerce-cm7.pages.dev/products" style="display:inline-block;padding:12px 32px;background:#fff;color:#080808;text-decoration:none;border-radius:9999px;font-size:13px;font-weight:500">Shop Now</a></div>`);
}

function buildMimeMessage(from: string, to: string, subject: string, html: string): string {
  const boundary = 'NOVA_BOUNDARY_' + Math.random().toString(36).slice(2);
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
    '',
    `--${boundary}--`,
  ];
  return lines.join('\r\n');
}

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function gmailMimeMessage(from: string, to: string, subject: string, html: string): string {
  const boundary = `nova_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const parts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    '',
    html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim(),
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    '',
    html,
    '',
    `--${boundary}--`,
  ];
  return parts.join('\r\n');
}

async function getGmailAccessToken(env: Env): Promise<string | null> {
  if (!env.GMAIL_USER || !env.GMAIL_REFRESH_TOKEN || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) return null;
  const data: any = await resp.json();
  return data.access_token || null;
}

async function smtpSend(env: Env, to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getGmailAccessToken(env);
    if (!token) return { ok: false, error: 'failed to get gmail access token' };

    const mimeMessage = gmailMimeMessage(`NOVA <${env.GMAIL_USER}>`, to, subject, html);
    const encodedMessage = toBase64(mimeMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!resp.ok) {
      const err: any = await resp.json().catch(() => ({}));
      return { ok: false, error: `gmail api: ${resp.status} ${err?.error?.message || resp.statusText}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  const result = await smtpSend(env, to, subject, html);
  return result.ok;
}

const SHIPPO_BASE = 'https://api.goshippo.com';

const FALLBACK_RATES = [
  { id: 'usps_priority', carrier: 'USPS', name: 'USPS Priority Mail', price: 12.99, estimatedDays: '3-5 business days', tracking: true, insurance: false },
  { id: 'usps_ground', carrier: 'USPS', name: 'USPS Ground Advantage', price: 8.99, estimatedDays: '5-7 business days', tracking: true, insurance: false },
  { id: 'ups_ground', carrier: 'UPS', name: 'UPS Ground', price: 19.99, estimatedDays: '3-5 business days', tracking: true, insurance: true },
  { id: 'ups_2day', carrier: 'UPS', name: 'UPS 2nd Day Air', price: 29.99, estimatedDays: '2 business days', tracking: true, insurance: true },
  { id: 'fedex_ground', carrier: 'FedEx', name: 'FedEx Ground', price: 18.99, estimatedDays: '3-5 business days', tracking: true, insurance: true },
  { id: 'fedex_express', carrier: 'FedEx', name: 'FedEx Express Saver', price: 34.99, estimatedDays: '2-3 business days', tracking: true, insurance: true },
  { id: 'dhl_express', carrier: 'DHL', name: 'DHL Express Worldwide', price: 39.99, estimatedDays: '2-4 business days', tracking: true, insurance: true },
  { id: 'free_standard', carrier: 'Standard', name: 'Free Standard Shipping', price: 0, estimatedDays: '7-10 business days', tracking: true, insurance: false },
];

function shippoRateToShippingRate(rate: any) {
  const carrier = rate.carrier || rate.provider || 'Unknown';
  const serviceName = rate.servicelevel?.name || rate.service_level?.name || `${carrier} Shipping`;
  const days = rate.estimated_days || rate.delivery_days || 5;
  const insuranceTerms = rate.attributes || [];
  return {
    id: `shippo_${rate.object_id || rate.id}`,
    carrier,
    name: serviceName,
    price: parseFloat(rate.amount || '0'),
    estimatedDays: `${days} business days`,
    tracking: true,
    insurance: insuranceTerms.includes('INSURANCE'),
    shippo_rate_id: rate.object_id || rate.id,
  };
}

function shippoHeaders(env: Env) {
  return { 'Content-Type': 'application/json', Authorization: `ShippoToken ${env.SHIPPO_API_TOKEN}` };
}

async function shippoPost(path: string, body: any, env: Env): Promise<any> {
  const resp = await fetch(`${SHIPPO_BASE}${path}`, {
    method: 'POST',
    headers: shippoHeaders(env),
    body: JSON.stringify(body),
  });
  const data = await resp.json() as any;
  if (!resp.ok) throw new Error(data?.detail || `Shippo API error: ${resp.status}`);
  return data;
}

async function shippoGet(path: string, env: Env): Promise<any> {
  const resp = await fetch(`${SHIPPO_BASE}${path}`, {
    headers: { Authorization: `ShippoToken ${env.SHIPPO_API_TOKEN}` },
  });
  const data = await resp.json() as any;
  if (!resp.ok) throw new Error(data?.detail || `Shippo API error: ${resp.status}`);
  return data;
}

// ─── GLOBAL RATE LIMIT (all routes) ──────────────────────────
app.use('/api/*', rateLimitMiddleware('default'));

app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.post('/api/auth/register', rateLimitMiddleware('auth'), async (c) => {
  const db = createDb(c.env);
  try {
    const { name, email, password } = await c.req.json();
    if (!name || !email || !password) return c.json({ error: 'Name, email, and password are required' }, 400);
    const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] });
    if (existing.rows.length > 0) return c.json({ error: 'Email already registered' }, 409);
    const password_hash = await hashPassword(password);
    const token = generateToken();
    const result = await db.execute({
      sql: 'INSERT INTO users (name, email, password_hash, token) VALUES (?, ?, ?, ?)',
      args: [name, email, password_hash, token],
    });
    return c.json({ id: Number(result.lastInsertRowid), name, email, role: 'user', token }, 201);
  } catch {
    return c.json({ error: 'Registration failed' }, 500);
  }
});

app.post('/api/auth/login', rateLimitMiddleware('auth'), async (c) => {
  const db = createDb(c.env);
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email and password are required' }, 400);
    const result = await db.execute({
      sql: 'SELECT id, name, email, password_hash, role, avatar, phone, address FROM users WHERE email = ?',
      args: [email],
    });
    if (result.rows.length === 0) return c.json({ error: 'Invalid credentials' }, 401);
    const user = result.rows[0] as any;
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
    const oldToken = user.token;
    const token = generateToken();
    await db.execute({ sql: 'UPDATE users SET token = ? WHERE id = ?', args: [token, user.id] });
    if (c.env.KV && oldToken) await cacheDelete(c.env.KV, `auth:${oldToken}`);
    sendEmail(c.env, user.email, 'Welcome Back to NOVA', loginEmail(user.name)).catch(() => {});
    return c.json({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, phone: user.phone, address: user.address, token });
  } catch {
    return c.json({ error: 'Login failed' }, 500);
  }
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const result = await db.execute({
      sql: 'SELECT id, name, email, role, avatar, phone, address, created_at FROM users WHERE id = ?',
      args: [user.id],
    });
    if (result.rows.length === 0) return c.json({ error: 'User not found' }, 404);
    return c.json(result.rows[0]);
  } catch {
    return c.json({ error: 'Failed to get profile' }, 500);
  }
});

app.put('/api/auth/profile', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { name, phone, address, avatar } = await c.req.json();
    await db.execute({
      sql: 'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), avatar = COALESCE(?, avatar) WHERE id = ?',
      args: [name || null, phone || null, address || null, avatar || null, user.id],
    });
    if (c.env.KV) await cacheDelete(c.env.KV, `auth:${c.req.header('Authorization')?.replace('Bearer ', '')}`);
    const updated = await db.execute({ sql: 'SELECT id, name, email, role, avatar, phone, address FROM users WHERE id = ?', args: [user.id] });
    return c.json(updated.rows[0]);
  } catch {
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

app.get('/api/products', async (c) => {
  const db = createDb(c.env);
  try {
    const category = c.req.query('category');
    const best_sellers = c.req.query('best_sellers');
    const new_arrivals = c.req.query('new_arrivals');
    const featured = c.req.query('featured');
    const search = c.req.query('search');
    const page = c.req.query('page') || '1';
    const limit = c.req.query('limit') || '12';
    const sort = c.req.query('sort');

    const cacheKey = `products:${JSON.stringify({ category, best_sellers, new_arrivals, featured, search, page, limit, sort })}`;
    const cached = await cachedQuery(c.env.KV, cacheKey, CACHE_TTL.products, async () => {
      let query = 'SELECT * FROM products WHERE 1=1';
      const args: any[] = [];
      if (category) { query += ' AND category_id = ?'; args.push(category); }
      if (best_sellers === 'true') query += ' AND is_best_seller = 1';
      if (new_arrivals === 'true') query += ' AND is_new_arrival = 1';
      if (featured === 'true') query += ' AND is_featured = 1';
      if (search) {
        query += ' AND (name LIKE ? OR subtitle LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        args.push(searchTerm, searchTerm, searchTerm);
      }
      let orderClause = ' ORDER BY created_at DESC';
      if (sort === 'price_asc') orderClause = ' ORDER BY price ASC';
      else if (sort === 'price_desc') orderClause = ' ORDER BY price DESC';
      else if (sort === 'rating') orderClause = ' ORDER BY rating DESC';
      else if (sort === 'name') orderClause = ' ORDER BY name ASC';
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.max(1, Number(limit));
      const offset = (pageNum - 1) * limitNum;
      const countQuery = `SELECT COUNT(*) as total FROM products WHERE 1=1` + query.slice('SELECT * FROM products WHERE 1=1'.length);
      const countResult = await db.execute({ sql: countQuery, args });
      const total = Number(countResult.rows[0]?.total ?? 0);
      const totalPages = Math.ceil(total / limitNum);
      query += orderClause + ' LIMIT ? OFFSET ?';
      args.push(limitNum, offset);
      const result = await db.execute({ sql: query, args });
      return { products: result.rows, total, page: pageNum, totalPages };
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

app.get('/api/products/:id', async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    const result = await cachedQuery(c.env.KV, `product:${id}`, CACHE_TTL.product, async () => {
      const r = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [id] });
      if (r.rows.length === 0) return null;
      return r.rows[0];
    });
    if (!result) return c.json({ error: 'Product not found' }, 404);
    return c.json(result);
  } catch {
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

app.post('/api/products', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { name, subtitle, description, price, original_price, badge, stock, image, category_id, rating, is_best_seller, is_new_arrival, is_featured } = await c.req.json();
    if (!name || price == null) return c.json({ error: 'Name and price are required' }, 400);
    const result = await db.execute({
      sql: `INSERT INTO products (name, subtitle, description, price, original_price, badge, stock, image, category_id, rating, is_best_seller, is_new_arrival, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name, subtitle || null, description || null, Number(price),
        original_price ? Number(original_price) : null, badge || null,
        stock != null ? Number(stock) : 0, image || null,
        category_id ? Number(category_id) : null, rating ? Number(rating) : 0,
        is_best_seller ? 1 : 0, is_new_arrival ? 1 : 0, is_featured ? 1 : 0,
      ],
    });
    const product = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    if (c.env.KV) await cacheInvalidatePattern(c.env.KV, 'products:');
    return c.json(product.rows[0], 201);
  } catch {
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

app.put('/api/products/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const fields = await c.req.json();
    const keys = Object.keys(fields);
    if (keys.length === 0) return c.json({ error: 'No fields to update' }, 400);
    const allowed = ['name','subtitle','description','price','original_price','badge','stock','image','category_id','rating','is_best_seller','is_new_arrival','is_featured'];
    const filtered = keys.filter(k => allowed.includes(k));
    if (filtered.length === 0) return c.json({ error: 'No valid fields to update' }, 400);
    const setClause = filtered.map(k => `${k} = ?`).join(', ');
    const values = filtered.map(k => {
      const v = fields[k];
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v;
    });
    values.push(c.req.param('id'));
    await db.execute({ sql: `UPDATE products SET ${setClause} WHERE id = ?`, args: values });
    const result = await db.execute({ sql: 'SELECT * FROM products WHERE id = ?', args: [c.req.param('id')] });
    if (c.env.KV) { await cacheDelete(c.env.KV, `product:${c.req.param('id')}`); await cacheInvalidatePattern(c.env.KV, 'products:'); }
    return c.json(result.rows[0]);
  } catch {
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

app.delete('/api/products/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    const existing = await db.execute({ sql: 'SELECT id FROM products WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return c.json({ error: 'Product not found' }, 404);
    await db.execute({ sql: 'DELETE FROM products WHERE id = ?', args: [id] });
    if (c.env.KV) { await cacheDelete(c.env.KV, `product:${id}`); await cacheInvalidatePattern(c.env.KV, 'products:'); }
    return c.json({ message: 'Product deleted' });
  } catch {
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

app.get('/api/cart', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const result = await db.execute({
      sql: `SELECT ci.id, ci.quantity, ci.product_id, p.name, p.subtitle, p.price, p.original_price, p.image
            FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`,
      args: [user.id],
    });
    const total = result.rows.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    return c.json({ items: result.rows, total: Math.round(total * 100) / 100 });
  } catch {
    return c.json({ error: 'Failed to fetch cart' }, 500);
  }
});

app.post('/api/cart/add', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { product_id, quantity } = await c.req.json();
    if (!product_id) return c.json({ error: 'product_id is required' }, 400);
    const existing = await db.execute({
      sql: 'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      args: [user.id, product_id],
    });
    if (existing.rows.length > 0) {
      const newQty = (existing.rows[0] as any).quantity + (quantity || 1);
      await db.execute({ sql: 'UPDATE cart_items SET quantity = ? WHERE id = ?', args: [newQty, (existing.rows[0] as any).id] });
    } else {
      await db.execute({
        sql: 'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        args: [user.id, product_id, quantity || 1],
      });
    }
    return c.json({ message: 'Added to cart' }, 201);
  } catch {
    return c.json({ error: 'Failed to add to cart' }, 500);
  }
});

// Alias: POST /api/cart (body-based, matches frontend)
app.post('/api/cart', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { product_id, quantity } = await c.req.json();
    if (!product_id) return c.json({ error: 'product_id is required' }, 400);
    const existing = await db.execute({
      sql: 'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      args: [user.id, product_id],
    });
    if (existing.rows.length > 0) {
      const newQty = (existing.rows[0] as any).quantity + (quantity || 1);
      await db.execute({ sql: 'UPDATE cart_items SET quantity = ? WHERE id = ?', args: [newQty, (existing.rows[0] as any).id] });
    } else {
      await db.execute({
        sql: 'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        args: [user.id, product_id, quantity || 1],
      });
    }
    return c.json({ message: 'Added to cart' }, 201);
  } catch {
    return c.json({ error: 'Failed to add to cart' }, 500);
  }
});

app.put('/api/cart/:id', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { quantity } = await c.req.json();
    if (quantity <= 0) {
      await db.execute({ sql: 'DELETE FROM cart_items WHERE id = ? AND user_id = ?', args: [c.req.param('id'), user.id] });
    } else {
      await db.execute({ sql: 'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', args: [quantity, c.req.param('id'), user.id] });
    }
    return c.json({ message: 'Cart updated' });
  } catch {
    return c.json({ error: 'Failed to update cart' }, 500);
  }
});

app.delete('/api/cart/:id', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    await db.execute({ sql: 'DELETE FROM cart_items WHERE id = ? AND user_id = ?', args: [c.req.param('id'), user.id] });
    return c.json({ message: 'Removed from cart' });
  } catch {
    return c.json({ error: 'Failed to remove from cart' }, 500);
  }
});

app.post('/api/cart/checkout', authMiddleware, rateLimitMiddleware('checkout'), async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { shipping_name, shipping_address, shipping_city, shipping_zip, payment_method, coupon_code, shipping_method, shipping_cost, stripe_payment_id } = body;
    const cart = await db.execute({
      sql: `SELECT ci.product_id, ci.quantity, p.price, p.name FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?`,
      args: [user.id],
    });
    if (cart.rows.length === 0) return c.json({ error: 'Cart is empty' }, 400);
    let total = cart.rows.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    let discountAmount = 0;
    if (coupon_code) {
      const couponResult = await db.execute({
        sql: 'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1',
        args: [coupon_code],
      });
      if (couponResult.rows.length > 0) {
        const coupon = couponResult.rows[0] as any;
        const validExpiry = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const validUses = coupon.max_uses === 0 || coupon.used_count < coupon.max_uses;
        const validMinOrder = total >= coupon.min_order;
        if (validExpiry && validUses && validMinOrder) {
          discountAmount = coupon.discount_type === 'percent'
            ? Math.min(total * coupon.discount_value / 100, total)
            : Math.min(coupon.discount_value, total);
          await db.execute({ sql: 'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', args: [coupon.id] });
        }
      }
    }
    const shippingCost = Number(shipping_cost) || 0;
    const finalTotal = Math.round((total - discountAmount + shippingCost) * 100) / 100;
    const order = await db.execute({
      sql: `INSERT INTO orders (user_id, total, status, shipping_name, shipping_address, shipping_city, shipping_zip, shipping_method, shipping_carrier, payment_method, stripe_payment_id)
            VALUES (?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        user.id, finalTotal,
        shipping_name || user.name, shipping_address || '', shipping_city || '', shipping_zip || '',
        shipping_method || 'free_standard', CARRIER_MAP[shipping_method] || 'Standard',
        payment_method || 'card', stripe_payment_id || null,
      ],
    });
    const orderId = Number(order.lastInsertRowid);
    for (const item of cart.rows) {
      await db.execute({
        sql: 'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        args: [orderId, (item as any).product_id, (item as any).quantity, (item as any).price],
      });
      await db.execute({
        sql: 'UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?',
        args: [(item as any).quantity, (item as any).product_id],
      });
    }
    await db.execute({ sql: 'DELETE FROM cart_items WHERE user_id = ?', args: [user.id] });
    let shippoShipment: any = null;
    if (shipping_method && shipping_method !== 'free_standard' && c.env.SHIPPO_API_TOKEN && c.env.SHIPPO_API_TOKEN !== 'shippo_test_replace_with_your_token') {
      try {
        const shipment = await shippoPost('/shipments/', {
          address_from: { name: 'NOVA Technologies', street1: '350 Fifth Avenue', city: 'New York', state: 'NY', zip: '10118', country: 'US' },
          address_to: { name: shipping_name || user.name, street1: shipping_address, city: shipping_city, zip: shipping_zip, country: 'US' },
          parcels: [{ length: '30', width: '25', height: '20', weight: '500', mass_unit: 'g', distance_unit: 'cm' }],
          async: false,
        }, c.env);
        if (shipment.rates && shipment.rates.length > 0) {
          const bestRate = shipment.rates[0];
          const transaction = await shippoPost('/transactions/', { rate: bestRate.object_id, label_file_type: 'PDF' }, c.env);
          if (transaction.status === 'SUCCESS') {
            shippoShipment = { tracking_number: transaction.tracking_number, status: transaction.status };
            await db.execute({
              sql: 'UPDATE orders SET shipping_tracking_number = ?, shipping_status = ? WHERE id = ?',
              args: [transaction.tracking_number, 'label_purchased', orderId],
            });
          }
        }
      } catch {}
    }
    const emailItems = (cart.rows as any[]).map((item: any) => ({ name: item.name || 'Product', qty: item.quantity, price: item.price }));
    sendEmail(c.env, user.email, `Order #${orderId} Confirmed — NOVA`, orderConfirmEmail(user.name, orderId, finalTotal, emailItems)).catch(() => {});
    if (c.env.KV) {
      await cacheDelete(c.env.KV, userKey(user.id, 'orders'));
      await cacheDelete(c.env.KV, userKey(user.id, 'wishlist'));
      await cacheDelete(c.env.KV, userKey(user.id, 'notif', ':'));
      await cacheInvalidatePattern(c.env.KV, 'products:');
      await cacheInvalidatePattern(c.env.KV, 'admin:');
    }
    return c.json({ order_id: orderId, total: finalTotal, discount: discountAmount, shipping: shippingCost, status: 'confirmed', shippo_shipment: shippoShipment });
  } catch {
    return c.json({ error: 'Failed to checkout' }, 500);
  }
});

app.get('/api/orders', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const cached = await cachedQuery(c.env.KV, userKey(user.id, 'orders'), CACHE_TTL.orders, async () => {
      const result = await db.execute({
        sql: 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        args: [user.id],
      });
      return sanitizeRows(result.rows);
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

app.get('/api/orders/detail/:id', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const order = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [c.req.param('id')] });
    if (order.rows.length === 0) return c.json({ error: 'Order not found' }, 404);
    const items = await db.execute({
      sql: `SELECT oi.quantity, oi.price, p.name as product_name, p.image as product_image, p.subtitle FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
      args: [c.req.param('id')],
    });
    return c.json({ ...order.rows[0], items: items.rows });
  } catch {
    return c.json({ error: 'Failed to fetch order' }, 500);
  }
});

app.get('/api/orders/all', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const result = await db.execute({
      sql: `SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`,
      args: [],
    });
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { status } = await c.req.json();
    await db.execute({ sql: 'UPDATE orders SET status = ? WHERE id = ?', args: [status, c.req.param('id')] });
    if (c.env.KV) { await cacheInvalidatePattern(c.env.KV, 'admin:'); await cacheInvalidatePattern(c.env.KV, 'orders:'); }
    return c.json({ message: 'Order status updated' });
  } catch {
    return c.json({ error: 'Failed to update order' }, 500);
  }
});

app.get('/api/wishlist', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const cached = await cachedQuery(c.env.KV, userKey(user.id, 'wishlist'), CACHE_TTL.wishlist, async () => {
      const result = await db.execute({
        sql: `SELECT w.id, w.product_id, p.name, p.subtitle, p.price, p.original_price, p.image, p.rating, p.reviews, p.badge, c.name as category
              FROM wishlists w JOIN products p ON w.product_id = p.id JOIN categories c ON p.category_id = c.id
              WHERE w.user_id = ? ORDER BY w.created_at DESC`,
        args: [user.id],
      });
      return sanitizeRows(result.rows);
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch wishlist' }, 500);
  }
});

app.post('/api/wishlist/:productId', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const productId = c.req.param('productId');
    const existing = await db.execute({
      sql: 'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      args: [user.id, productId],
    });
    if (existing.rows.length > 0) {
      await db.execute({ sql: 'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', args: [user.id, productId] });
      if (c.env.KV) await cacheDelete(c.env.KV, userKey(user.id, 'wishlist'));
      return c.json({ message: 'Removed from wishlist', added: false });
    } else {
      await db.execute({ sql: 'INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)', args: [user.id, productId] });
      if (c.env.KV) await cacheDelete(c.env.KV, userKey(user.id, 'wishlist'));
      return c.json({ message: 'Added to wishlist', added: true }, 201);
    }
  } catch {
    return c.json({ error: 'Failed to toggle wishlist' }, 500);
  }
});

// Alias: POST /api/wishlist (body-based, matches frontend)
app.post('/api/wishlist', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { product_id } = await c.req.json();
    if (!product_id) return c.json({ error: 'product_id is required' }, 400);
    const existing = await db.execute({
      sql: 'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      args: [user.id, product_id],
    });
    if (existing.rows.length > 0) {
      await db.execute({ sql: 'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', args: [user.id, product_id] });
      if (c.env.KV) await cacheDelete(c.env.KV, userKey(user.id, 'wishlist'));
      return c.json({ message: 'Removed from wishlist', added: false });
    } else {
      await db.execute({ sql: 'INSERT OR IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)', args: [user.id, product_id] });
      if (c.env.KV) await cacheDelete(c.env.KV, userKey(user.id, 'wishlist'));
      return c.json({ message: 'Added to wishlist', added: true }, 201);
    }
  } catch {
    return c.json({ error: 'Failed to toggle wishlist' }, 500);
  }
});

app.delete('/api/wishlist/:productId', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const productId = c.req.param('productId');
    await db.execute({ sql: 'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', args: [user.id, productId] });
    if (c.env.KV) await cacheDelete(c.env.KV, userKey(user.id, 'wishlist'));
    return c.json({ message: 'Removed from wishlist' });
  } catch {
    return c.json({ error: 'Failed to remove from wishlist' }, 500);
  }
});

app.get('/api/reviews/user/check/:productId', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const result = await db.execute({
      sql: 'SELECT * FROM reviews WHERE user_id = ? AND product_id = ?',
      args: [user.id, c.req.param('productId')],
    });
    if (result.rows.length > 0) return c.json({ reviewed: true, review: result.rows[0] });
    return c.json({ reviewed: false });
  } catch {
    return c.json({ reviewed: false });
  }
});

app.get('/api/reviews/:productId', async (c) => {
  const db = createDb(c.env);
  try {
    const pid = c.req.param('productId');
    const cached = await cachedQuery(c.env.KV, `reviews:${pid}`, CACHE_TTL.products, async () => {
      const result = await db.execute({
        sql: `SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
              FROM reviews r JOIN users u ON r.user_id = u.id
              WHERE r.product_id = ? ORDER BY r.created_at DESC`,
        args: [pid],
      });
      const stats = await db.execute({
        sql: 'SELECT COALESCE(ROUND(AVG(rating), 1), 0) as average, COUNT(*) as count FROM reviews WHERE product_id = ?',
        args: [pid],
      });
      const { average, count } = stats.rows[0] as any;
      return { reviews: result.rows, average, count };
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch reviews' }, 500);
  }
});

app.get('/api/reviews/product/:productId', async (c) => {
  const db = createDb(c.env);
  try {
    const pid = c.req.param('productId');
    const cached = await cachedQuery(c.env.KV, `reviews:${pid}`, CACHE_TTL.products, async () => {
      const result = await db.execute({
        sql: `SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
              FROM reviews r JOIN users u ON r.user_id = u.id
              WHERE r.product_id = ? ORDER BY r.created_at DESC`,
        args: [pid],
      });
      const stats = await db.execute({
        sql: 'SELECT COALESCE(ROUND(AVG(rating), 1), 0) as average, COUNT(*) as count FROM reviews WHERE product_id = ?',
        args: [pid],
      });
      const { average, count } = stats.rows[0] as any;
      return { reviews: result.rows, average, count };
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch reviews' }, 500);
  }
});

app.post('/api/reviews', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { product_id, rating, title, comment } = await c.req.json();
    if (!product_id || !rating) return c.json({ error: 'product_id and rating are required' }, 400);
    const existing = await db.execute({
      sql: 'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
      args: [user.id, product_id],
    });
    if (existing.rows.length > 0) {
      await db.execute({
        sql: 'UPDATE reviews SET rating = ?, title = ?, comment = ? WHERE user_id = ? AND product_id = ?',
        args: [rating, title || null, comment || null, user.id, product_id],
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO reviews (user_id, product_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)',
        args: [user.id, product_id, rating, title || null, comment || null],
      });
    }
    const stats = await db.execute({
      sql: 'SELECT COALESCE(ROUND(AVG(rating), 1), 0) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id = ?',
      args: [product_id],
    });
    const { avg_rating, total } = stats.rows[0] as any;
    await db.execute({ sql: 'UPDATE products SET rating = ?, reviews = ? WHERE id = ?', args: [avg_rating, total, product_id] });
    if (c.env.KV) { await cacheDelete(c.env.KV, `reviews:${product_id}`); await cacheDelete(c.env.KV, `product:${product_id}`); await cacheInvalidatePattern(c.env.KV, 'products:'); }
    return c.json({ message: 'Review submitted' }, 201);
  } catch {
    return c.json({ error: 'Failed to submit review' }, 500);
  }
});

app.get('/api/coupons', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const result = await db.execute('SELECT * FROM coupons ORDER BY id DESC');
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch coupons' }, 500);
  }
});

app.post('/api/coupons', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { code, discount_type, discount_value, min_order, max_uses, expires_at } = await c.req.json();
    if (!code || !discount_type || discount_value == null) return c.json({ error: 'code, discount_type, discount_value required' }, 400);
    const result = await db.execute({
      sql: 'INSERT INTO coupons (code, discount_type, discount_value, min_order, max_uses, expires_at, is_active, used_count) VALUES (?, ?, ?, ?, ?, ?, 1, 0)',
      args: [code.toUpperCase(), discount_type, discount_value, min_order || 0, max_uses || 0, expires_at || null],
    });
    return c.json({ id: Number(result.lastInsertRowid), code: code.toUpperCase(), discount_type, discount_value, min_order: min_order || 0, max_uses: max_uses || 0, expires_at: expires_at || null, is_active: true, used_count: 0 }, 201);
  } catch {
    return c.json({ error: 'Failed to create coupon' }, 500);
  }
});

app.put('/api/coupons/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { code, discount_type, discount_value, min_order, max_uses, expires_at, is_active } = await c.req.json();
    await db.execute({
      sql: 'UPDATE coupons SET code=COALESCE(?,code), discount_type=COALESCE(?,discount_type), discount_value=COALESCE(?,discount_value), min_order=COALESCE(?,min_order), max_uses=COALESCE(?,max_uses), expires_at=COALESCE(?,expires_at), is_active=COALESCE(?,is_active) WHERE id=?',
      args: [code?.toUpperCase() || null, discount_type || null, discount_value ?? null, min_order ?? null, max_uses ?? null, expires_at || null, is_active ?? null, c.req.param('id')],
    });
    return c.json({ message: 'Coupon updated' });
  } catch {
    return c.json({ error: 'Failed to update coupon' }, 500);
  }
});

app.delete('/api/coupons/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    await db.execute({ sql: 'DELETE FROM coupons WHERE id = ?', args: [c.req.param('id')] });
    return c.json({ message: 'Coupon deleted' });
  } catch {
    return c.json({ error: 'Failed to delete coupon' }, 500);
  }
});

app.post('/api/coupons/validate', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { code, subtotal } = await c.req.json();
    if (!code || subtotal === undefined) return c.json({ error: 'Code and subtotal are required' }, 400);
    const result = await db.execute({ sql: 'SELECT * FROM coupons WHERE UPPER(code) = UPPER(?)', args: [code] });
    if (result.rows.length === 0) return c.json({ error: 'Invalid coupon code' }, 404);
    const coupon = result.rows[0] as any;
    if (!coupon.is_active) return c.json({ error: 'Coupon is inactive' }, 400);
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return c.json({ error: 'Coupon has expired' }, 400);
    if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) return c.json({ error: 'Coupon usage limit reached' }, 400);
    if (subtotal < coupon.min_order) return c.json({ error: `Minimum order amount is ${coupon.min_order}` }, 400);
    let discount_amount: number;
    if (coupon.discount_type === 'percent') {
      discount_amount = Math.min(subtotal * coupon.discount_value / 100, subtotal);
    } else {
      discount_amount = Math.min(coupon.discount_value, subtotal);
    }
    const final_total = Math.max(subtotal - discount_amount, 0);
    return c.json({ code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount_amount, final_total });
  } catch {
    return c.json({ error: 'Failed to validate coupon' }, 500);
  }
});

app.post('/api/newsletter', async (c) => {
  const db = createDb(c.env);
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'Email is required' }, 400);
    await db.execute({ sql: 'INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)', args: [email] });
    return c.json({ message: 'Subscribed successfully' }, 201);
  } catch {
    return c.json({ error: 'Failed to subscribe' }, 500);
  }
});

app.get('/api/testimonials', async (c) => {
  const db = createDb(c.env);
  try {
    const cached = await cachedQuery(c.env.KV, 'testimonials:active', CACHE_TTL.testimonials, async () => {
      const result = await db.execute('SELECT * FROM testimonials WHERE is_active = 1 ORDER BY id');
      return sanitizeRows(result.rows);
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch testimonials' }, 500);
  }
});

app.get('/api/testimonials/all', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const result = await db.execute('SELECT * FROM testimonials ORDER BY id');
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch testimonials' }, 500);
  }
});

app.post('/api/testimonials', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { name, role, avatar, quote, rating, is_active } = await c.req.json();
    if (!name || !quote) return c.json({ error: 'Name and quote are required' }, 400);
    const result = await db.execute({
      sql: 'INSERT INTO testimonials (name, role, avatar, quote, rating, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      args: [name, role || null, avatar || null, quote, rating || 5, is_active != null ? (is_active ? 1 : 0) : 1],
    });
    const testimonial = await db.execute({ sql: 'SELECT * FROM testimonials WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    if (c.env.KV) await cacheDelete(c.env.KV, 'testimonials:active');
    return c.json(testimonial.rows[0], 201);
  } catch {
    return c.json({ error: 'Failed to create testimonial' }, 500);
  }
});

app.put('/api/testimonials/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { name, role, avatar, quote, rating, is_active } = await c.req.json();
    const existing = await db.execute({ sql: 'SELECT id FROM testimonials WHERE id = ?', args: [c.req.param('id')] });
    if (existing.rows.length === 0) return c.json({ error: 'Testimonial not found' }, 404);
    await db.execute({
      sql: 'UPDATE testimonials SET name = ?, role = ?, avatar = ?, quote = ?, rating = ?, is_active = ? WHERE id = ?',
      args: [name, role || null, avatar || null, quote, rating || 5, is_active != null ? (is_active ? 1 : 0) : 1, c.req.param('id')],
    });
    const result = await db.execute({ sql: 'SELECT * FROM testimonials WHERE id = ?', args: [c.req.param('id')] });
    if (c.env.KV) await cacheDelete(c.env.KV, 'testimonials:active');
    return c.json(result.rows[0]);
  } catch {
    return c.json({ error: 'Failed to update testimonial' }, 500);
  }
});

app.delete('/api/testimonials/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    const existing = await db.execute({ sql: 'SELECT id FROM testimonials WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return c.json({ error: 'Testimonial not found' }, 404);
    await db.execute({ sql: 'DELETE FROM testimonials WHERE id = ?', args: [id] });
    if (c.env.KV) await cacheDelete(c.env.KV, 'testimonials:active');
    return c.json({ message: 'Testimonial deleted' });
  } catch {
    return c.json({ error: 'Failed to delete testimonial' }, 500);
  }
});

app.post('/api/payments/create-intent', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { amount, currency = 'usd', order_metadata } = await c.req.json();
    if (!amount || amount <= 0) return c.json({ error: 'Invalid amount' }, 400);
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { user_id: String(user.id), ...order_metadata },
    });
    return c.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err: any) {
    return c.json({ error: err.message || 'Payment intent creation failed' }, 500);
  }
});

app.post('/api/payments/confirm', authMiddleware, async (c) => {
  try {
    const { paymentIntentId } = await c.req.json();
    if (!paymentIntentId) return c.json({ error: 'paymentIntentId required' }, 400);
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return c.json({ status: pi.status, paymentId: pi.id, amount: pi.amount / 100 });
  } catch (err: any) {
    return c.json({ error: err.message || 'Payment confirmation failed' }, 500);
  }
});

app.post('/api/payments/refund', authMiddleware, adminMiddleware, async (c) => {
  try {
    const { paymentIntentId, amount } = await c.req.json();
    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    return c.json({ refundId: refund.id, status: refund.status });
  } catch (err: any) {
    return c.json({ error: err.message || 'Refund failed' }, 500);
  }
});

app.get('/api/shipping/rates', authMiddleware, rateLimitMiddleware('shipping'), async (c) => {
  try {
    const subtotal = c.req.query('subtotal');
    const destination_city = c.req.query('destination_city');
    const destination_zip = c.req.query('destination_zip');
    const destination_country = c.req.query('destination_country');
    const destination_state = c.req.query('destination_state');
    const weight = c.req.query('weight');
    const length = c.req.query('length');
    const width = c.req.query('width');
    const height = c.req.query('height');

    const cacheKey = `shipping:${JSON.stringify({ destination_zip, destination_city, destination_state, weight, length, width, height })}`;
    const cached = await cachedQuery(c.env.KV, cacheKey, CACHE_TTL.shippingRates, async () => {
      if (c.env.SHIPPO_API_TOKEN && c.env.SHIPPO_API_TOKEN !== 'shippo_test_replace_with_your_token') {
        try {
          const shipment = await shippoPost('/shipments/', {
            address_from: { name: 'NOVA Technologies', street1: '350 Fifth Avenue', city: 'New York', state: 'NY', zip: '10118', country: 'US' },
            address_to: { city: destination_city || 'Los Angeles', state: destination_state || 'CA', zip: destination_zip || '90001', country: destination_country || 'US' },
            parcels: [{ length: length || '30', width: width || '25', height: height || '20', weight: weight || '500', mass_unit: 'g', distance_unit: 'cm' }],
            async: false,
          }, c.env);
          if (shipment.rates && shipment.rates.length > 0) {
            const rates = shipment.rates
              .map(shippoRateToShippingRate)
              .filter((r: any) => r.price > 0)
              .sort((a: any, b: any) => a.price - b.price);
            const sub = Number(subtotal) || 0;
            const freeStandard = { id: 'free_standard', carrier: 'Standard', name: 'Free Standard Shipping', price: sub >= 200 ? 0 : 15, estimatedDays: '7-10 business days', tracking: true, insurance: false };
            return [...rates.slice(0, 7), freeStandard];
          }
        } catch {}
      }
      const sub = Number(subtotal) || 0;
      return FALLBACK_RATES.map(rate => ({
        ...rate,
        price: rate.id === 'free_standard' ? (sub >= 200 ? 0 : 15) : rate.price,
      }));
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch shipping rates' }, 500);
  }
});

app.post('/api/shipping/shipment', authMiddleware, async (c) => {
  try {
    const { shipping_name, shipping_address, shipping_city, shipping_zip, shipping_state, shipping_country, weight, pieces, rate_id } = await c.req.json();
    if (c.env.SHIPPO_API_TOKEN && c.env.SHIPPO_API_TOKEN !== 'shippo_test_replace_with_your_token') {
      try {
        if (rate_id) {
          const transaction = await shippoPost('/transactions/', { rate: rate_id, label_file_type: 'PDF' }, c.env);
          if (transaction.status === 'SUCCESS') {
            return c.json({
              shipment_id: `SHP-${Date.now()}`,
              carrier: transaction.carrier,
              service: transaction.servicelevel?.name || 'Shippo Shipping',
              tracking_number: transaction.tracking_number,
              label_url: transaction.label_url,
              tracking_url: transaction.tracking_url_provider,
              status: 'label_purchased',
              estimated_delivery: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
              created_at: new Date().toISOString(),
            });
          }
        }
        const shipment = await shippoPost('/shipments/', {
          address_from: { name: 'NOVA Technologies', street1: '350 Fifth Avenue', city: 'New York', state: 'NY', zip: '10118', country: 'US' },
          address_to: { name: shipping_name, street1: shipping_address, city: shipping_city, state: shipping_state || '', zip: shipping_zip, country: shipping_country || 'US' },
          parcels: [{ length: '30', width: '25', height: '20', weight: (weight || 500).toString(), mass_unit: 'g', distance_unit: 'cm' }],
          async: false,
        }, c.env);
        return c.json({
          shipment_id: shipment.object_id,
          status: shipment.status || 'rates_returned',
          rates_count: shipment.rates?.length || 0,
          rates: (shipment.rates || []).map(shippoRateToShippingRate),
          created_at: new Date().toISOString(),
        });
      } catch {}
    }
    return c.json({
      shipment_id: `SHP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      carrier: 'Shippo',
      service: 'Standard Shipping',
      tracking_number: `SHP${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: 'pending_pickup',
      estimated_delivery: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      shipper: { name: 'NOVA Technologies', address: '350 Fifth Avenue, Suite 7820', city: 'New York', country: 'US' },
      consignee: { name: shipping_name, address: shipping_address, city: shipping_city, zip: shipping_zip, country: shipping_country || 'US' },
      weight: weight || 1,
      pieces: pieces || 1,
      created_at: new Date().toISOString(),
    });
  } catch {
    return c.json({ error: 'Failed to create shipment' }, 500);
  }
});

app.get('/api/shipping/track/:carrier/:trackingNumber', authMiddleware, async (c) => {
  try {
    const { carrier, trackingNumber } = c.req.param();
    if (c.env.SHIPPO_API_TOKEN && c.env.SHIPPO_API_TOKEN !== 'shippo_test_replace_with_your_token') {
      try {
        const track = await shippoGet(`/tracks/${carrier}/${trackingNumber}`, c.env);
        return c.json({
          tracking_number: trackingNumber,
          carrier: track.carrier || carrier,
          status: track.status || 'unknown',
          status_details: track.status_details || '',
          eta: track.eta || null,
          events: (track.tracking_history || []).map((e: any) => ({
            status: e.status || '',
            location: e.location?.city ? `${e.location.city}, ${e.location.state || ''}` : '',
            timestamp: e.status_date || e.timestamp || '',
            message: e.message || '',
          })),
        });
      } catch {}
    }
    return c.json({
      tracking_number: trackingNumber,
      carrier,
      status: 'in_transit',
      events: [
        { status: 'Shipment picked up', location: 'New York, NY', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
        { status: 'In transit', location: 'Regional hub', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { status: 'Arrived at destination facility', location: 'Local facility', timestamp: new Date().toISOString() },
      ],
    });
  } catch {
    return c.json({ error: 'Failed to track shipment' }, 500);
  }
});

app.get('/api/shipping/carriers', authMiddleware, async (c) => {
  try {
    const cached = await cachedQuery(c.env.KV, 'carriers:all', CACHE_TTL.carriers, async () => {
      if (c.env.SHIPPO_API_TOKEN && c.env.SHIPPO_API_TOKEN !== 'shippo_test_replace_with_your_token') {
        try {
          const carriers = await shippoGet('/carrieraccounts/', c.env);
          return (carriers.results || []).map((car: any) => ({
            object_id: car.object_id,
            carrier: car.carrier,
            account_name: car.account_name || car.carrier,
            active: car.is_active,
          }));
        } catch {}
      }
      return [
        { carrier: 'USPS', account_name: 'USPS', active: true },
        { carrier: 'UPS', account_name: 'UPS', active: true },
        { carrier: 'FedEx', account_name: 'FedEx', active: true },
        { carrier: 'DHL', account_name: 'DHL Express', active: true },
      ];
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch carriers' }, 500);
  }
});

app.get('/api/warehouses', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const result = await db.execute({
      sql: `SELECT w.*, COUNT(i.id) as product_count, COALESCE(SUM(i.quantity), 0) as total_units
            FROM warehouses w LEFT JOIN inventory i ON w.id = i.warehouse_id GROUP BY w.id ORDER BY w.name`,
      args: [],
    });
    const warehouses = result.rows.map((r: any) => ({
      ...r,
      location: [r.address, r.city, r.state].filter(Boolean).join(', ') || r.country || 'Not set',
      capacity: 1000,
      item_count: r.product_count || 0,
    }));
    return c.json(warehouses);
  } catch {
    return c.json({ error: 'Failed to fetch warehouses' }, 500);
  }
});

app.post('/api/warehouses', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { name, address, city, state, zip, country, is_default, location } = await c.req.json();
    const addr = address || location || null;
    if (is_default) await db.execute({ sql: 'UPDATE warehouses SET is_default = 0', args: [] });
    const result = await db.execute({
      sql: 'INSERT INTO warehouses (name, address, city, state, zip, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [name, addr, city || null, state || null, zip || null, country || 'US', is_default ? 1 : 0],
    });
    return c.json({ id: Number(result.lastInsertRowid), name, location: addr || 'Not set', capacity: 1000, item_count: 0 });
  } catch {
    return c.json({ error: 'Failed to create warehouse' }, 500);
  }
});

app.put('/api/warehouses/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    const { name, address, city, state, zip, country, is_default, is_active } = await c.req.json();
    if (is_default) await db.execute({ sql: 'UPDATE warehouses SET is_default = 0', args: [] });
    await db.execute({
      sql: `UPDATE warehouses SET name = COALESCE(?, name), address = COALESCE(?, address),
            city = COALESCE(?, city), state = COALESCE(?, state), zip = COALESCE(?, zip),
            country = COALESCE(?, country), is_default = COALESCE(?, is_default),
            is_active = COALESCE(?, is_active) WHERE id = ?`,
      args: [name ?? null, address ?? null, city ?? null, state ?? null, zip ?? null, country ?? null, is_default ?? null, is_active ?? null, id],
    });
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update warehouse' }, 500);
  }
});

app.get('/api/inventory', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const warehouse_id = c.req.query('warehouse_id');
    const low_stock = c.req.query('low_stock');
    const search = c.req.query('search');
    let sql = `SELECT i.*, p.name as product_name, p.price as product_price, p.image as product_image,
               w.name as warehouse_name
               FROM inventory i JOIN products p ON i.product_id = p.id JOIN warehouses w ON i.warehouse_id = w.id WHERE 1=1`;
    const args: any[] = [];
    if (warehouse_id) { sql += ' AND i.warehouse_id = ?'; args.push(warehouse_id); }
    if (low_stock === '1') sql += ' AND (i.quantity - i.reserved) <= i.reorder_point';
    if (search) { sql += ' AND p.name LIKE ?'; args.push(`%${search}%`); }
    sql += ' ORDER BY p.name ASC';
    const result = await db.execute({ sql, args });
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch inventory' }, 500);
  }
});

app.put('/api/inventory/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const { quantity, reserved, reorder_point, reorder_quantity, bin_location } = await c.req.json();
    const current = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [id] });
    if (current.rows.length === 0) return c.json({ error: 'Inventory record not found' }, 404);
    const item = current.rows[0] as any;
    const newQty = quantity !== undefined ? quantity : item.quantity;
    const newReserved = reserved !== undefined ? reserved : item.reserved;
    await db.execute({
      sql: `UPDATE inventory SET quantity = ?, reserved = ?, reorder_point = COALESCE(?, reorder_point),
            reorder_quantity = COALESCE(?, reorder_quantity), bin_location = COALESCE(?, bin_location) WHERE id = ?`,
      args: [newQty, newReserved, reorder_point ?? null, reorder_quantity ?? null, bin_location ?? null, id],
    });
    if (quantity !== undefined && quantity !== item.quantity) {
      const diff = quantity - item.quantity;
      await db.execute({
        sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, notes, created_by)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [item.product_id, item.warehouse_id, diff > 0 ? 'inbound' : 'adjustment', Math.abs(diff),
          `Stock adjusted from ${item.quantity} to ${quantity}`, user.id],
      });
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update inventory' }, 500);
  }
});

app.get('/api/inventory/alerts', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const result = await db.execute({
      sql: `SELECT i.*, p.name as product_name, p.image as product_image, w.name as warehouse_name,
            (i.quantity - i.reserved) as available
            FROM inventory i JOIN products p ON i.product_id = p.id JOIN warehouses w ON i.warehouse_id = w.id
            WHERE (i.quantity - i.reserved) <= i.reorder_point ORDER BY (i.quantity - i.reserved) ASC`,
      args: [],
    });
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch alerts' }, 500);
  }
});

app.get('/api/inventory/movements', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const product_id = c.req.query('product_id');
    const warehouse_id = c.req.query('warehouse_id');
    const type = c.req.query('type');
    const limit = c.req.query('limit');
    let sql = `SELECT im.*, p.name as product_name, w.name as warehouse_name, u.name as created_by_name
               FROM inventory_movements im JOIN products p ON im.product_id = p.id JOIN warehouses w ON im.warehouse_id = w.id
               LEFT JOIN users u ON im.created_by = u.id WHERE 1=1`;
    const args: any[] = [];
    if (product_id) { sql += ' AND im.product_id = ?'; args.push(product_id); }
    if (warehouse_id) { sql += ' AND im.warehouse_id = ?'; args.push(warehouse_id); }
    if (type) { sql += ' AND im.movement_type = ?'; args.push(type); }
    sql += ' ORDER BY im.created_at DESC LIMIT ?';
    args.push(Number(limit) || 50);
    const result = await db.execute({ sql, args });
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch movements' }, 500);
  }
});

app.post('/api/inventory/movements', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes } = await c.req.json();
    if (!product_id || !warehouse_id || !movement_type || !quantity) return c.json({ error: 'product_id, warehouse_id, movement_type, and quantity are required' }, 400);
    await db.execute({
      sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [product_id, warehouse_id, movement_type, quantity, reference_type || null, reference_id || null, notes || null, user.id],
    });
    const inv = await db.execute({
      sql: 'SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?',
      args: [product_id, warehouse_id],
    });
    if (inv.rows.length > 0) {
      const item = inv.rows[0] as any;
      let newQty = item.quantity;
      if (movement_type === 'inbound' || movement_type === 'return') newQty += quantity;
      else if (movement_type === 'outbound' || movement_type === 'transfer') newQty -= quantity;
      await db.execute({ sql: 'UPDATE inventory SET quantity = ? WHERE id = ?', args: [newQty, item.id] });
    } else {
      await db.execute({
        sql: 'INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)',
        args: [product_id, warehouse_id, movement_type === 'inbound' ? quantity : 0],
      });
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to record movement' }, 500);
  }
});

app.post('/api/inventory/count', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { warehouse_id, counts } = await c.req.json();
    if (!warehouse_id || !Array.isArray(counts)) return c.json({ error: 'warehouse_id and counts array required' }, 400);
    let adjusted = 0;
    for (const count of counts) {
      const inv = await db.execute({
        sql: 'SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?',
        args: [count.product_id, warehouse_id],
      });
      if (inv.rows.length > 0) {
        const item = inv.rows[0] as any;
        if (item.quantity !== count.counted_quantity) {
          const diff = count.counted_quantity - item.quantity;
          await db.execute({
            sql: "UPDATE inventory SET quantity = ?, last_counted_at = datetime('now') WHERE id = ?",
            args: [count.counted_quantity, item.id],
          });
          await db.execute({
            sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, notes, created_by)
                  VALUES (?, ?, 'adjustment', ?, ?, ?)`,
            args: [count.product_id, warehouse_id, Math.abs(diff),
              `Cycle count: ${item.quantity} → ${count.counted_quantity}`, user.id],
          });
          adjusted++;
        }
      }
    }
    return c.json({ adjusted, message: `${adjusted} items adjusted` });
  } catch {
    return c.json({ error: 'Failed to count inventory' }, 500);
  }
});

app.get('/api/fulfillment/stats', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const [pending, picking, packing, ready, shipped, exceptions] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'pending'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'picking'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'packing'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'ready_to_ship'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'shipped'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM fulfillment_tasks WHERE status = 'exception'", args: [] }),
    ]);
    return c.json({
      pending: Number((pending.rows[0] as any).count),
      picking: Number((picking.rows[0] as any).count),
      packing: Number((packing.rows[0] as any).count),
      ready_to_ship: Number((ready.rows[0] as any).count),
      shipped: Number((shipped.rows[0] as any).count),
      exceptions: Number((exceptions.rows[0] as any).count),
    });
  } catch {
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

app.get('/api/fulfillment/tasks', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const status = c.req.query('status');
    let sql = `SELECT ft.id, ft.order_id, ft.status, ft.assigned_to, ft.warehouse_id, ft.notes, ft.created_at,
               ft.pick_started_at, ft.pick_completed_at, ft.pack_started_at, ft.pack_completed_at,
               ft.shipped_at, ft.delivered_at,
               o.total as order_total, o.shipping_name as customer_name, o.shipping_address, o.shipping_city, o.shipping_zip,
               o.shipping_method, o.shipping_carrier, o.shipping_tracking_number,
               u.name as assignee_name, w.name as warehouse_name
               FROM fulfillment_tasks ft JOIN orders o ON ft.order_id = o.id
               LEFT JOIN users u ON ft.assigned_to = u.id LEFT JOIN warehouses w ON ft.warehouse_id = w.id`;
    const args: any[] = [];
    if (status) { sql += ' WHERE ft.status = ?'; args.push(status); }
    sql += ' ORDER BY ft.created_at DESC';
    const result = await db.execute({ sql, args });
    const tasks: any[] = [];
    for (const task of result.rows) {
      const items = await db.execute({
        sql: `SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, p.name as product_name, p.image as product_image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
        args: [Number((task as any).order_id)],
      });
      const cleanTask: any = {};
      for (const [k, v] of Object.entries(task as any)) {
        cleanTask[k] = typeof v === 'bigint' ? Number(v) : v;
      }
      cleanTask.items = items.rows.map((item: any) => {
        const clean: any = {};
        for (const [k, v] of Object.entries(item)) {
          clean[k] = typeof v === 'bigint' ? Number(v) : v;
        }
        return clean;
      });
      tasks.push(cleanTask);
    }
    return c.json(tasks);
  } catch (e: any) {
    return c.json({ error: e?.message || String(e) }, 500);
  }
});

app.post('/api/fulfillment/tasks', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { order_id, warehouse_id, assigned_to } = await c.req.json();
    const existing = await db.execute({ sql: 'SELECT id FROM fulfillment_tasks WHERE order_id = ?', args: [order_id] });
    if (existing.rows.length > 0) return c.json({ error: 'Fulfillment task already exists for this order' }, 400);
    const result = await db.execute({
      sql: `INSERT INTO fulfillment_tasks (order_id, warehouse_id, assigned_to, status) VALUES (?, ?, ?, 'pending')`,
      args: [order_id, warehouse_id || null, assigned_to || null],
    });
    await db.execute({ sql: "UPDATE orders SET status = 'confirmed' WHERE id = ? AND status = 'pending'", args: [order_id] });
    return c.json({ id: result.lastInsertRowid });
  } catch {
    return c.json({ error: 'Failed to create task' }, 500);
  }
});

app.post('/api/fulfillment/tasks/auto-create', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const orders = await db.execute({
      sql: `SELECT o.id FROM orders o LEFT JOIN fulfillment_tasks ft ON o.id = ft.order_id
            WHERE o.status = 'confirmed' AND ft.id IS NULL`,
      args: [],
    });
    let created = 0;
    for (const order of orders.rows) {
      await db.execute({ sql: `INSERT INTO fulfillment_tasks (order_id, status) VALUES (?, 'pending')`, args: [(order as any).id] });
      created++;
    }
    return c.json({ created, message: `${created} fulfillment tasks created` });
  } catch {
    return c.json({ error: 'Failed to auto-create tasks' }, 500);
  }
});

app.put('/api/fulfillment/tasks/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    const { status, assigned_to, notes } = await c.req.json();
    const task = await db.execute({ sql: 'SELECT * FROM fulfillment_tasks WHERE id = ?', args: [id] });
    if (task.rows.length === 0) return c.json({ error: 'Task not found' }, 404);
    const current = task.rows[0] as any;
    const now = new Date().toISOString();
    const updates: string[] = [];
    const args: any[] = [];
    if (status) {
      updates.push('status = ?');
      args.push(status);
      if (status === 'picking' && !current.pick_started_at) { updates.push('pick_started_at = ?'); args.push(now); }
      if (status === 'packing') {
        if (!current.pick_completed_at) { updates.push('pick_completed_at = ?'); args.push(now); }
        updates.push('pack_started_at = ?'); args.push(now);
      }
      if (status === 'ready_to_ship') { updates.push('pack_completed_at = ?'); args.push(now); }
      if (status === 'shipped') { updates.push('shipped_at = ?'); args.push(now); }
      if (status === 'delivered') { updates.push('delivered_at = ?'); args.push(now); }
    }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); args.push(assigned_to); }
    if (notes !== undefined) { updates.push('notes = ?'); args.push(notes); }
    if (updates.length > 0) {
      args.push(id);
      await db.execute({ sql: `UPDATE fulfillment_tasks SET ${updates.join(', ')} WHERE id = ?`, args });
    }
    if (status === 'shipped') {
      await db.execute({ sql: "UPDATE orders SET status = 'shipped' WHERE id = ?", args: [current.order_id] });
    } else if (status === 'delivered') {
      await db.execute({ sql: "UPDATE orders SET status = 'delivered' WHERE id = ?", args: [current.order_id] });
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update task' }, 500);
  }
});

app.get('/api/fulfillment/pick-lists', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const warehouse_id = c.req.query('warehouse_id');
    let sql = `SELECT pl.*, w.name as warehouse_name, u.name as assignee_name
               FROM pick_lists pl LEFT JOIN warehouses w ON pl.warehouse_id = w.id
               LEFT JOIN users u ON pl.assigned_to = u.id WHERE 1=1`;
    const args: any[] = [];
    if (warehouse_id) { sql += ' AND pl.warehouse_id = ?'; args.push(warehouse_id); }
    sql += ' ORDER BY pl.created_at DESC LIMIT 20';
    const result = await db.execute({ sql, args });
    const lists = await Promise.all(
      result.rows.map(async (list: any) => {
        const items = await db.execute({
          sql: `SELECT pli.*, p.name as product_name, p.image as product_image, ft.order_id, o.shipping_name
                FROM pick_list_items pli JOIN products p ON pli.product_id = p.id
                JOIN fulfillment_tasks ft ON pli.fulfillment_task_id = ft.id
                JOIN orders o ON ft.order_id = o.id WHERE pli.pick_list_id = ?`,
          args: [list.id],
        });
        return { ...sanitizeRows([list])[0], items: sanitizeRows(items.rows) };
      })
    );
    return c.json(lists);
  } catch {
    return c.json({ error: 'Failed to fetch pick lists' }, 500);
  }
});

app.post('/api/fulfillment/pick-lists', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { warehouse_id, task_ids, assigned_to } = await c.req.json();
    const listResult = await db.execute({
      sql: `INSERT INTO pick_lists (warehouse_id, assigned_to, status) VALUES (?, ?, 'open')`,
      args: [warehouse_id, assigned_to || null],
    });
    const listId = Number(listResult.lastInsertRowid);
    let totalItems = 0;
    const tasks = task_ids && task_ids.length > 0 ? [...task_ids] : [];
    if (tasks.length === 0) {
      const pending = await db.execute({
        sql: `SELECT id FROM fulfillment_tasks WHERE status = 'pending' ${warehouse_id ? 'AND warehouse_id = ?' : ''} LIMIT 20`,
        args: warehouse_id ? [warehouse_id] : [],
      });
      tasks.push(...pending.rows.map((r: any) => r.id));
    }
    for (const taskId of tasks) {
      const task = await db.execute({ sql: 'SELECT * FROM fulfillment_tasks WHERE id = ?', args: [taskId] });
      if (task.rows.length === 0) continue;
      const t = task.rows[0] as any;
      const items = await db.execute({ sql: 'SELECT * FROM order_items WHERE order_id = ?', args: [t.order_id] });
      for (const item of items.rows) {
        const inv = await db.execute({
          sql: 'SELECT bin_location FROM inventory WHERE product_id = ? AND warehouse_id = ?',
          args: [(item as any).product_id, warehouse_id],
        });
        const bin = inv.rows.length > 0 ? (inv.rows[0] as any).bin_location : null;
        await db.execute({
          sql: `INSERT INTO pick_list_items (pick_list_id, fulfillment_task_id, product_id, quantity, bin_location) VALUES (?, ?, ?, ?, ?)`,
          args: [listId, taskId, (item as any).product_id, (item as any).quantity, bin],
        });
        totalItems++;
      }
      await db.execute({ sql: "UPDATE fulfillment_tasks SET status = 'picking', pick_started_at = datetime('now') WHERE id = ?", args: [taskId] });
    }
    await db.execute({ sql: 'UPDATE pick_lists SET total_items = ? WHERE id = ?', args: [totalItems, listId] });
    return c.json({ id: listId, total_items: totalItems });
  } catch {
    return c.json({ error: 'Failed to create pick list' }, 500);
  }
});

app.put('/api/fulfillment/pick-lists/:listId/items/:itemId', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const listId = c.req.param('listId');
    const itemId = c.req.param('itemId');
    const { picked_quantity, status } = await c.req.json();
    await db.execute({
      sql: `UPDATE pick_list_items SET picked_quantity = ?, status = ?, picked_at = datetime('now') WHERE id = ? AND pick_list_id = ?`,
      args: [picked_quantity, status || 'picked', itemId, listId],
    });
    const completed = await db.execute({
      sql: "SELECT COUNT(*) as count FROM pick_list_items WHERE pick_list_id = ? AND status != 'pending'",
      args: [listId],
    });
    const total = await db.execute({ sql: 'SELECT total_items FROM pick_lists WHERE id = ?', args: [listId] });
    await db.execute({
      sql: 'UPDATE pick_lists SET completed_items = ? WHERE id = ?',
      args: [(completed.rows[0] as any).count, listId],
    });
    if ((completed.rows[0] as any).count >= (total.rows[0] as any).total_items) {
      await db.execute({ sql: "UPDATE pick_lists SET status = 'completed', completed_at = datetime('now') WHERE id = ?", args: [listId] });
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update pick item' }, 500);
  }
});

app.get('/api/suppliers', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const cached = await cachedQuery(c.env.KV, 'admin:suppliers', CACHE_TTL.suppliers, async () => {
      const result = await db.execute({
        sql: `SELECT s.*, COUNT(sp.id) as product_count FROM suppliers s LEFT JOIN supplier_products sp ON s.id = sp.supplier_id GROUP BY s.id ORDER BY s.name`,
        args: [],
      });
      return sanitizeRows(result.rows);
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch suppliers' }, 500);
  }
});

app.post('/api/suppliers', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days } = await c.req.json();
    const result = await db.execute({
      sql: `INSERT INTO suppliers (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [name, contact_name || null, email || null, phone || null, address || null, city || null, country || null, payment_terms || 'Net 30', lead_time_days || 14],
    });
    const newId = result.lastInsertRowid;
    if (c.env.KV) await cacheDelete(c.env.KV, 'admin:suppliers');
    return c.json({ id: newId });
  } catch {
    return c.json({ error: 'Failed to create supplier' }, 500);
  }
});

app.put('/api/suppliers/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    const { name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days, is_active } = await c.req.json();
    await db.execute({
      sql: `UPDATE suppliers SET name=COALESCE(?,name), contact_name=COALESCE(?,contact_name),
            email=COALESCE(?,email), phone=COALESCE(?,phone), address=COALESCE(?,address),
            city=COALESCE(?,city), country=COALESCE(?,country), payment_terms=COALESCE(?,payment_terms),
            lead_time_days=COALESCE(?,lead_time_days), is_active=COALESCE(?,is_active) WHERE id=?`,
      args: [name ?? null, contact_name ?? null, email ?? null, phone ?? null, address ?? null, city ?? null, country ?? null, payment_terms ?? null, lead_time_days ?? null, is_active ?? null, id],
    });
    if (c.env.KV) await cacheDelete(c.env.KV, 'admin:suppliers');
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update supplier' }, 500);
  }
});

app.delete('/api/suppliers/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    await db.execute({ sql: 'DELETE FROM supplier_products WHERE supplier_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM suppliers WHERE id = ?', args: [id] });
    if (c.env.KV) await cacheDelete(c.env.KV, 'admin:suppliers');
    return c.json({ message: 'Supplier deleted' });
  } catch {
    return c.json({ error: 'Failed to delete supplier' }, 500);
  }
});

app.get('/api/suppliers/:id/products', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const result = await db.execute({
      sql: `SELECT sp.*, p.name as product_name, p.image as product_image, p.price as retail_price
            FROM supplier_products sp JOIN products p ON sp.product_id = p.id WHERE sp.supplier_id = ?`,
      args: [c.req.param('id')],
    });
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch supplier products' }, 500);
  }
});

app.post('/api/suppliers/:id/products', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { product_id, unit_cost, min_order_qty, lead_time_days, supplier_sku, is_preferred } = await c.req.json();
    const result = await db.execute({
      sql: `INSERT INTO supplier_products (supplier_id, product_id, unit_cost, min_order_qty, lead_time_days, supplier_sku, is_preferred)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [c.req.param('id'), product_id, unit_cost, min_order_qty || 1, lead_time_days || null, supplier_sku || null, is_preferred || 0],
    });
    return c.json({ id: result.lastInsertRowid });
  } catch {
    return c.json({ error: 'Failed to add supplier product' }, 500);
  }
});

app.delete('/api/suppliers/:id/products/:productId', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    await db.execute({
      sql: 'DELETE FROM supplier_products WHERE supplier_id = ? AND product_id = ?',
      args: [c.req.param('id'), c.req.param('productId')],
    });
    return c.json({ message: 'Supplier product removed' });
  } catch {
    return c.json({ error: 'Failed to remove supplier product' }, 500);
  }
});

app.get('/api/suppliers/purchase-orders', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const status = c.req.query('status');
    let sql = `SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.name as creator_name
               FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id
               JOIN warehouses w ON po.warehouse_id = w.id LEFT JOIN users u ON po.created_by = u.id WHERE 1=1`;
    const args: any[] = [];
    if (status) { sql += ' AND po.status = ?'; args.push(status); }
    sql += ' ORDER BY po.created_at DESC';
    const result = await db.execute({ sql, args });
    const pos = await Promise.all(
      result.rows.map(async (po: any) => {
        const items = await db.execute({
          sql: `SELECT poi.*, p.name as product_name, p.image as product_image FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE poi.po_id = ?`,
          args: [po.id],
        });
        return { ...sanitizeRows([po])[0], items: sanitizeRows(items.rows) };
      })
    );
    return c.json(sanitizeRows(pos));
  } catch {
    return c.json({ error: 'Failed to fetch purchase orders' }, 500);
  }
});

app.get('/api/suppliers/purchase-orders/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const id = c.req.param('id');
    const result = await db.execute({
      sql: `SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.name as creator_name
            FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id
            JOIN warehouses w ON po.warehouse_id = w.id LEFT JOIN users u ON po.created_by = u.id
            WHERE po.id = ?`,
      args: [id],
    });
    if (result.rows.length === 0) return c.json({ error: 'Purchase order not found' }, 404);
    const po = result.rows[0] as any;
    const items = await db.execute({
      sql: `SELECT poi.*, p.name as product_name, p.image as product_image FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE poi.po_id = ?`,
      args: [id],
    });
    return c.json({ ...sanitizeRows([po])[0], items: sanitizeRows(items.rows) });
  } catch {
    return c.json({ error: 'Failed to fetch purchase order' }, 500);
  }
});

app.post('/api/suppliers/purchase-orders', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { supplier_id, warehouse_id, notes, expected_date, items } = await c.req.json();
    const total = (items || []).reduce((sum: number, i: any) => sum + (i.unit_cost * i.quantity), 0);
    const poResult = await db.execute({
      sql: `INSERT INTO purchase_orders (supplier_id, warehouse_id, total, notes, expected_date, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      args: [supplier_id, warehouse_id, total, notes || null, expected_date || null, user.id],
    });
    const poId = Number(poResult.lastInsertRowid);
    for (const item of items || []) {
      await db.execute({
        sql: `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)`,
        args: [poId, item.product_id, item.quantity, item.unit_cost],
      });
    }
    return c.json({ id: poId, total });
  } catch {
    return c.json({ error: 'Failed to create purchase order' }, 500);
  }
});

app.put('/api/suppliers/purchase-orders/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const { status } = await c.req.json();
    await db.execute({ sql: 'UPDATE purchase_orders SET status = ? WHERE id = ?', args: [status, id] });
    if (status === 'received') {
      await db.execute({ sql: "UPDATE purchase_orders SET received_date = datetime('now') WHERE id = ?", args: [id] });
      const po = await db.execute({ sql: 'SELECT warehouse_id FROM purchase_orders WHERE id = ?', args: [id] });
      const items = await db.execute({ sql: 'SELECT * FROM purchase_order_items WHERE po_id = ?', args: [id] });
      const warehouseId = (po.rows[0] as any)?.warehouse_id;
      for (const item of items.rows) {
        const inv = await db.execute({
          sql: 'SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?',
          args: [(item as any).product_id, warehouseId],
        });
        if (inv.rows.length > 0) {
          await db.execute({
            sql: 'UPDATE inventory SET quantity = quantity + ? WHERE id = ?',
            args: [(item as any).quantity, (inv.rows[0] as any).id],
          });
        } else {
          await db.execute({
            sql: 'INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES (?, ?, ?)',
            args: [(item as any).product_id, warehouseId, (item as any).quantity],
          });
        }
        await db.execute({
          sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
                VALUES (?, ?, 'inbound', ?, 'purchase_order', ?, ?, ?)`,
          args: [(item as any).product_id, warehouseId, (item as any).quantity, id, `PO #${id} received`, user.id],
        });
      }
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update PO' }, 500);
  }
});

app.get('/api/returns', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const status = c.req.query('status');
    let sql = `SELECT r.*, o.total as order_total, o.shipping_name as customer_name, u.name as user_name, u.email as user_email
               FROM returns r JOIN orders o ON r.order_id = o.id JOIN users u ON r.user_id = u.id WHERE 1=1`;
    const args: any[] = [];
    if (status) { sql += ' AND r.status = ?'; args.push(status); }
    sql += ' ORDER BY r.created_at DESC';
    const result = await db.execute({ sql, args });
    const returns = await Promise.all(
      result.rows.map(async (ret: any) => {
        const items = await db.execute({
          sql: `SELECT ri.*, oi.quantity as order_quantity, oi.price as order_price,
                       p.name as product_name, p.image as product_image
                FROM return_items ri JOIN order_items oi ON ri.order_item_id = oi.id
                JOIN products p ON oi.product_id = p.id WHERE ri.return_id = ?`,
          args: [ret.id],
        });
        return { ...sanitizeRows([ret])[0], items: sanitizeRows(items.rows) };
      })
    );
    return c.json(returns);
  } catch {
    return c.json({ error: 'Failed to fetch returns' }, 500);
  }
});

app.post('/api/returns', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const { order_id, reason, return_type, items } = await c.req.json();
    const order = await db.execute({ sql: 'SELECT * FROM orders WHERE id = ? AND user_id = ?', args: [order_id, user.id] });
    if (order.rows.length === 0) return c.json({ error: 'Order not found' }, 404);
    let refundAmount = 0;
    for (const item of items || []) {
      const orderItem = await db.execute({ sql: 'SELECT * FROM order_items WHERE id = ? AND order_id = ?', args: [item.order_item_id, order_id] });
      if (orderItem.rows.length > 0) refundAmount += (orderItem.rows[0] as any).price * item.quantity;
    }
    const result = await db.execute({
      sql: `INSERT INTO returns (order_id, user_id, reason, return_type, refund_amount) VALUES (?, ?, ?, ?, ?)`,
      args: [order_id, user.id, reason || null, return_type || 'refund', refundAmount],
    });
    const returnId = Number(result.lastInsertRowid);
    for (const item of items || []) {
      await db.execute({
        sql: `INSERT INTO return_items (return_id, order_item_id, quantity, reason, condition) VALUES (?, ?, ?, ?, ?)`,
        args: [returnId, item.order_item_id, item.quantity, item.reason || reason || null, item.condition || 'good'],
      });
    }
    return c.json({ id: returnId, refund_amount: refundAmount });
  } catch {
    return c.json({ error: 'Failed to request return' }, 500);
  }
});

app.get('/api/returns/my', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const result = await db.execute({
      sql: `SELECT r.*, o.total as order_total FROM returns r JOIN orders o ON r.order_id = o.id
            WHERE r.user_id = ? ORDER BY r.created_at DESC`,
      args: [user.id],
    });
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch returns' }, 500);
  }
});

app.put('/api/returns/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const { status, return_tracking, restock, notes } = await c.req.json();
    const updates: string[] = ['status = ?'];
    const args: any[] = [status];
    if (return_tracking) { updates.push('return_tracking = ?'); args.push(return_tracking); }
    if (restock !== undefined) { updates.push('restock = ?'); args.push(restock ? 1 : 0); }
    if (notes) { updates.push('notes = ?'); args.push(notes); }
    if (status === 'refunded' || status === 'rejected') updates.push("resolved_at = datetime('now')");
    args.push(id);
    await db.execute({ sql: `UPDATE returns SET ${updates.join(', ')} WHERE id = ?`, args });
    if (status === 'received' && restock !== false) {
      const returnItems = await db.execute({
        sql: `SELECT ri.*, oi.product_id FROM return_items ri JOIN order_items oi ON ri.order_item_id = oi.id WHERE ri.return_id = ?`,
        args: [id],
      });
      for (const item of returnItems.rows) {
        const wh = await db.execute({ sql: 'SELECT id FROM warehouses WHERE is_default = 1 LIMIT 1', args: [] });
        const whId = wh.rows.length > 0 ? (wh.rows[0] as any).id : 1;
        const inv = await db.execute({
          sql: 'SELECT * FROM inventory WHERE product_id = ? AND warehouse_id = ?',
          args: [(item as any).product_id, whId],
        });
        if (inv.rows.length > 0) {
          await db.execute({ sql: 'UPDATE inventory SET quantity = quantity + ? WHERE id = ?', args: [(item as any).quantity, (inv.rows[0] as any).id] });
        }
        await db.execute({
          sql: `INSERT INTO inventory_movements (product_id, warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
                VALUES (?, ?, 'return', ?, 'return', ?, ?, ?)`,
          args: [(item as any).product_id, whId, (item as any).quantity, id, `Return #${id} restocked`, user.id],
        });
      }
    }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to update return' }, 500);
  }
});

app.get('/api/notifications', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const type = c.req.query('type');
    const unread_only = c.req.query('unread_only');
    const cacheKey = userKey(user.id, 'notif', `${type || ''}:${unread_only || ''}`);
    const cached = await cachedQuery(c.env.KV, cacheKey, CACHE_TTL.notifications, async () => {
      let sql = 'SELECT * FROM notifications WHERE user_id = ?';
      const args: any[] = [user.id];
      if (type) { sql += ' AND type = ?'; args.push(type); }
      if (unread_only === '1') sql += " AND status != 'read'";
      sql += ' ORDER BY created_at DESC LIMIT 50';
      const result = await db.execute({ sql, args });
      return sanitizeRows(result.rows);
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch notifications' }, 500);
  }
});

app.put('/api/notifications/:id/read', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    await db.execute({ sql: "UPDATE notifications SET status = 'read' WHERE id = ? AND user_id = ?", args: [c.req.param('id'), user.id] });
    if (c.env.KV) { await cacheDelete(c.env.KV, userKey(user.id, 'notif', ':')); await cacheDelete(c.env.KV, userKey(user.id, 'notif-unread')); }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to mark notification' }, 500);
  }
});

app.put('/api/notifications/read-all', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    await db.execute({ sql: "UPDATE notifications SET status = 'read' WHERE user_id = ? AND status != 'read'", args: [user.id] });
    if (c.env.KV) { await cacheDelete(c.env.KV, userKey(user.id, 'notif', ':')); await cacheDelete(c.env.KV, userKey(user.id, 'notif-unread')); }
    return c.json({ success: true });
  } catch {
    return c.json({ error: 'Failed to mark notifications' }, 500);
  }
});

app.get('/api/notifications/unread-count', authMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const user = c.get('user');
    const cached = await cachedQuery(c.env.KV, userKey(user.id, 'notif-unread'), CACHE_TTL.notifications, async () => {
      const result = await db.execute({
        sql: "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND status != 'read'",
        args: [user.id],
      });
      return Number((result.rows[0] as any).count);
    });
    return c.json({ count: cached });
  } catch {
    return c.json({ error: 'Failed to get count' }, 500);
  }
});

app.get('/api/analytics/dashboard', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
    const [totalOrders, totalRevenue, ordersThisMonth, revenueThisMonth, avgOrderValue, topCarriers, recentOrders, lowStock] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE status != 'cancelled'", args: [] }),
      db.execute({ sql: "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE status != 'cancelled'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE created_at >= ? AND status != 'cancelled'", args: [thirtyDaysAgo] }),
      db.execute({ sql: "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE created_at >= ? AND status != 'cancelled'", args: [thirtyDaysAgo] }),
      db.execute({ sql: "SELECT COALESCE(AVG(total), 0) as avg FROM orders WHERE status != 'cancelled'", args: [] }),
      db.execute({ sql: `SELECT shipping_carrier as carrier, COUNT(*) as count, 0 as cost
                          FROM orders WHERE shipping_carrier IS NOT NULL GROUP BY shipping_carrier ORDER BY count DESC`, args: [] }),
      db.execute({ sql: `SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id
                          ORDER BY o.created_at DESC LIMIT 10`, args: [] }),
      db.execute({ sql: `SELECT i.*, p.name as product_name, w.name as warehouse_name, (i.quantity - i.reserved) as available
                          FROM inventory i JOIN products p ON i.product_id = p.id JOIN warehouses w ON i.warehouse_id = w.id
                          WHERE (i.quantity - i.reserved) <= i.reorder_point`, args: [] }),
    ]);
    const dailyOrders = await db.execute({
      sql: `SELECT date(created_at) as date, COUNT(*) as orders, SUM(total) as revenue
            FROM orders WHERE created_at >= ? AND status != 'cancelled'
            GROUP BY date(created_at) ORDER BY date`,
      args: [thirtyDaysAgo],
    });
    const pipeline = await db.execute({ sql: 'SELECT status, COUNT(*) as count FROM fulfillment_tasks GROUP BY status', args: [] });
    const returnStats = await db.execute({
      sql: `SELECT COUNT(*) as total_returns,
                   SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded,
                   COALESCE(SUM(refund_amount), 0) as total_refunded
            FROM returns WHERE created_at >= ?`,
      args: [thirtyDaysAgo],
    });
    return c.json({
      totalOrders: Number((totalOrders.rows[0] as any).count),
      totalRevenue: Number((totalRevenue.rows[0] as any).total),
      ordersThisMonth: Number((ordersThisMonth.rows[0] as any).count),
      revenueThisMonth: Number((revenueThisMonth.rows[0] as any).total),
      avgOrderValue: Number((avgOrderValue.rows[0] as any).avg),
      topCarriers: sanitizeRows(topCarriers.rows),
      recentOrders: recentOrders.rows.map((r: any) => ({
        id: Number(r.id),
        customer: r.user_name || 'Unknown',
        total: Number(r.total),
        status: r.status,
        date: r.created_at,
        items: 1,
      })),
      lowStock: lowStock.rows.map((r: any) => ({
        id: Number(r.id),
        name: r.product_name,
        stock: Number(r.available || (r.quantity - r.reserved)),
        reorderPoint: Number(r.reorder_point),
      })),
      dailyOrders: sanitizeRows(dailyOrders.rows),
      pipeline: sanitizeRows(pipeline.rows),
      returns: {
        total: Number((returnStats.rows[0] as any).total_returns || 0),
        refunded: Number((returnStats.rows[0] as any).refunded || 0),
        totalRefunded: Number((returnStats.rows[0] as any).total_refunded || 0),
      },
    });
  } catch {
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

app.get('/api/analytics/shipping', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const period = c.req.query('period');
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [byCarrier, byMethod, avgByCarrier] = await Promise.all([
      db.execute({
        sql: `SELECT shipping_carrier as carrier, COUNT(*) as shipments,
                     0 as total_cost, 0 as avg_cost
              FROM orders WHERE created_at >= ? AND shipping_carrier IS NOT NULL AND status != 'cancelled'
              GROUP BY shipping_carrier ORDER BY shipments DESC`,
        args: [since],
      }),
      db.execute({
        sql: `SELECT shipping_method as method, shipping_carrier as carrier, COUNT(*) as shipments,
                     0 as avg_cost
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
    const perfMap: Record<string, number> = {};
    for (const p of avgByCarrier.rows) { perfMap[(p as any).carrier] = Math.round((p as any).delivery_rate || 0); }
    const mergedCarriers = byCarrier.rows.map((r: any) => ({
      carrier: r.carrier,
      shipments: Number(r.shipments),
      totalCost: Number(r.total_cost),
      avgCost: Number(r.avg_cost),
      deliveryRate: perfMap[r.carrier] ?? 0,
    }));
    return c.json({ period: `${days} days`, carriers: mergedCarriers, byMethod: sanitizeRows(byMethod.rows), performance: sanitizeRows(avgByCarrier.rows) });
  } catch {
    return c.json({ error: 'Failed to fetch shipping analytics' }, 500);
  }
});

app.get('/api/analytics/inventory', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const [summary, movements, topProducts] = await Promise.all([
      db.execute({
        sql: `SELECT w.name as warehouse, COUNT(i.id) as products, SUM(i.quantity) as total_units,
                     SUM(i.reserved) as reserved_units, SUM(i.quantity - i.reserved) as available
              FROM warehouses w LEFT JOIN inventory i ON w.id = i.warehouse_id GROUP BY w.id`,
        args: [],
      }),
      db.execute({
        sql: `SELECT movement_type, COUNT(*) as count, SUM(quantity) as total_qty
              FROM inventory_movements WHERE created_at >= datetime('now', '-30 days') GROUP BY movement_type`,
        args: [],
      }),
      db.execute({
        sql: `SELECT p.name, p.image, SUM(i.quantity) as total_stock, SUM(i.reserved) as reserved
              FROM inventory i JOIN products p ON i.product_id = p.id
              GROUP BY p.id ORDER BY total_stock DESC LIMIT 10`,
        args: [],
      }),
    ]);
    const warehouseData = summary.rows.map((r: any) => ({
      warehouse: r.warehouse,
      products: r.products,
      totalUnits: r.total_units || 0,
      reserved: r.reserved_units || 0,
      available: r.available || 0,
    }));
    return c.json({ warehouses: warehouseData, movements: sanitizeRows(movements.rows), topProducts: sanitizeRows(topProducts.rows) });
  } catch {
    return c.json({ error: 'Failed to fetch inventory analytics' }, 500);
  }
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const cached = await cachedQuery(c.env.KV, 'admin:stats', CACHE_TTL.stats, async () => {
      const [users, products, orders, revenue] = await Promise.all([
        db.execute("SELECT COUNT(*) as count FROM users WHERE role='user'"),
        db.execute('SELECT COUNT(*) as count FROM products'),
        db.execute('SELECT COUNT(*) as count FROM orders'),
        db.execute("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status='confirmed'"),
      ]);
      return {
        totalUsers: Number((users.rows[0] as any).count),
        totalProducts: Number((products.rows[0] as any).count),
        totalOrders: Number((orders.rows[0] as any).count),
        totalRevenue: Number((revenue.rows[0] as any).total),
      };
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const cached = await cachedQuery(c.env.KV, 'admin:users', CACHE_TTL.stats, async () => {
      const result = await db.execute('SELECT id, name, email, role, avatar, phone, address, created_at FROM users ORDER BY created_at DESC');
      return sanitizeRows(result.rows);
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.get('/api/admin/categories', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const result = await db.execute('SELECT * FROM categories ORDER BY id');
    return c.json(sanitizeRows(result.rows));
  } catch {
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

app.post('/api/admin/categories', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { name, icon, color } = await c.req.json();
    if (!name || !icon) return c.json({ error: 'Name and icon required' }, 400);
    const result = await db.execute({ sql: 'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)', args: [name, icon, color || null] });
    if (c.env.KV) await cacheDelete(c.env.KV, 'categories:all');
    return c.json({ id: Number(result.lastInsertRowid), name, icon, color: color || null, count: 0 }, 201);
  } catch {
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

app.put('/api/admin/categories/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    const { name, icon, color } = await c.req.json();
    await db.execute({ sql: 'UPDATE categories SET name = COALESCE(?, name), icon = COALESCE(?, icon), color = COALESCE(?, color) WHERE id = ?', args: [name || null, icon || null, color || null, c.req.param('id')] });
    if (c.env.KV) await cacheDelete(c.env.KV, 'categories:all');
    return c.json({ message: 'Category updated' });
  } catch {
    return c.json({ error: 'Failed to update category' }, 500);
  }
});

app.delete('/api/admin/categories/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env);
  try {
    await db.execute({ sql: 'DELETE FROM categories WHERE id = ?', args: [c.req.param('id')] });
    if (c.env.KV) await cacheDelete(c.env.KV, 'categories:all');
    return c.json({ message: 'Category deleted' });
  } catch {
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

app.get('/api/categories', async (c) => {
  const db = createDb(c.env);
  try {
    const cached = await cachedQuery(c.env.KV, 'categories:all', CACHE_TTL.categories, async () => {
      const result = await db.execute('SELECT * FROM categories ORDER BY id');
      return sanitizeRows(result.rows);
    });
    return c.json(cached);
  } catch {
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

app.post('/api/admin/broadcast', authMiddleware, adminMiddleware, rateLimitMiddleware('broadcast'), async (c) => {
  const db = createDb(c.env);
  try {
    const { subject, title, message, target } = await c.req.json();
    if (!subject || !message) return c.json({ error: 'Subject and message required' }, 400);
    let query = 'SELECT email, name FROM users WHERE 1=1';
    const args: any[] = [];
    if (target === 'customers') { query += " AND role = 'user'"; }
    const users = await db.execute({ sql: query, args });
    let sent = 0;
    const errors: string[] = [];
    for (const u of users.rows) {
      const result = await smtpSend(c.env, (u as any).email, subject, broadcastEmail(title || subject, message));
      if (result.ok) sent++;
      else errors.push(`${(u as any).email}: ${result.error}`);
    }
    return c.json({ message: `Broadcast sent to ${sent}/${users.rows.length} users`, total: users.rows.length, sent, errors });
  } catch {
    return c.json({ error: 'Failed to send broadcast' }, 500);
  }
});

app.get('/api/admin/smtp-test', authMiddleware, adminMiddleware, async (c) => {
  const result = await smtpSend(c.env, c.env.GMAIL_USER || '', 'NOVA SMTP Test', '<h1>Test</h1><p>Gmail SMTP from NOVA</p>');
  return c.json(result);
});

export default app;
