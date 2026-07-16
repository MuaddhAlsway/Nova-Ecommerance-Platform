# 🏗️ NOVA — System Design & Software Architecture

A deep dive into the architecture patterns, system design concepts, and engineering decisions behind the NOVA e-commerce platform.

---

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  React SPA (Cloudflare Pages)                                    │   │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────────┐  │   │
│  │  │ React   │ │ React    │ │ Tailwind  │ │ Zustand / Context  │  │   │
│  │  │ Router  │ │ Components│ │ CSS      │ │ State Management   │  │   │
│  │  └─────────┘ └──────────┘ └───────────┘ └────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │ HTTPS (REST API)                         │
├──────────────────────────────┼──────────────────────────────────────────┤
│                        API GATEWAY LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Cloudflare Worker (Hono Framework)                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │   │
│  │  │ CORS     │ │ Auth     │ │ Rate     │ │ Request          │    │   │
│  │  │ Handler  │ │ Middleware│ │ Limiter │ │ Validation       │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
├──────────────────────────────┼──────────────────────────────────────────┤
│                       APPLICATION LAYER                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ 🔐 Auth    │ │ 📦 Products│ │ 🛒 Cart    │ │ 🧾 Orders          │   │
│  │ Service    │ │ Service    │ │ Service    │ │ Service            │   │
│  ├────────────┤ ├────────────┤ ├────────────┤ ├────────────────────┤   │
│  │ 💳 Payment │ │ 🚚 Shipping│ │ 📊 Inv.   │ │ 🏭 Suppliers       │   │
│  │ Service    │ │ Service    │ │ Service    │ │ Service            │   │
│  ├────────────┤ ├────────────┤ ├────────────┤ ├────────────────────┤   │
│  │ ↩️ Returns │ │ 📋 Fulfill │ │ 📢 Notify │ │ 📈 Analytics       │   │
│  │ Service    │ │ Service    │ │ Service    │ │ Service            │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘   │
│                              │                                          │
├──────────────────────────────┼──────────────────────────────────────────┤
│                        DATA ACCESS LAYER                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Turso Client (@libsql/client)                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │   │
│  │  │ Query    │ │ Connection│ │ Read     │ │ Write            │    │   │
│  │  │ Builder  │ │ Pool     │ │ Replica  │ │ Primary          │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
├──────────────────────────────┼──────────────────────────────────────────┤
│                         DATABASE LAYER                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Turso (Edge-Hosted libSQL)                                      │   │
│  │  ┌────────────────────────────────────────────────────────────┐  │   │
│  │  │ 20 Tables: Users, Products, Orders, Cart, Reviews,        │  │   │
│  │  │ Inventory, Suppliers, Purchase Orders, Returns,           │  │   │
│  │  │ Warehouses, Fulfillment, Pick Lists, Shipping Labels,     │  │   │
│  │  │ Coupons, Wishlists, Newsletters, Notifications, etc.      │  │   │
│  │  └────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
├──────────────────────────────┼──────────────────────────────────────────┤
│                    EXTERNAL SERVICES LAYER                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐   │
│  │ 💳 Stripe  │ │ 🚚 Shippo  │ │ 📧 Gmail   │ │ 🔐 Google OAuth    │   │
│  │ Payments   │ │ Shipping   │ │ API        │ │                    │   │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Architecture Pattern: Modular Monolith

This project uses a **Modular Monolith** architecture — a single deployable unit with clearly separated modules.

### Why Not Microservices?

| Factor | Monolith ✅ | Microservices |
|--------|------------|---------------|
| **Team Size** | Solo/small team | Large distributed team |
| **Complexity** | Manageable | High operational overhead |
| **Deployment** | Single deploy | Multiple independent deploys |
| **Data** | Shared database | Database per service |
| **Latency** | In-process calls | Network calls between services |
| **Cost** | Low | Higher (more infrastructure) |

For a startup/SaaS product, a **Modular Monolith** is the right call. You get clean separation without the overhead.

### How We Achieve Separation

```
server/routes/
├── auth.ts              ← Authentication module
├── products.ts          ← Product catalog module
├── cart.ts              ← Shopping cart module
├── orders.ts            ← Order management module
├── payments.ts          ← Payment processing module
├── shipping.ts          ← Shipping integration module
├── inventory.ts         ← Inventory management module
├── fulfillment.ts       ← Fulfillment workflow module
├── suppliers.ts         ← Supplier management module
├── returns.ts           ← Returns/RMA module
├── reviews.ts           ← Reviews & ratings module
├── wishlist.ts          ← Wishlist module
├── coupons.ts           ← Discount/coupon module
├── newsletter.ts        ← Newsletter module
├── notifications.ts     ← Notification module
├── analytics.ts         ← Analytics module
└── warehouses.ts        ← Warehouse management module
```

Each route module is a **self-contained domain** with its own:
- Business logic
- Database queries
- API endpoints
- Validation

---

## 🔐 Authentication & Authorization

### JWT-Based Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │  Server  │         │ Database │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │  POST /auth/login   │                    │
     │  {email, password}  │                    │
     │────────────────────>│                    │
     │                     │  SELECT user       │
     │                     │───────────────────>│
     │                     │  user data         │
     │                     │<───────────────────│
     │                     │  verify password   │
     │                     │  generate token    │
     │  {token, user}      │  UPDATE token      │
     │<────────────────────│───────────────────>│
     │                     │                    │
     │  GET /products      │                    │
     │  Authorization:     │                    │
     │  Bearer <token>     │                    │
     │────────────────────>│  SELECT user       │
     │                     │  WHERE token = ?   │
     │                     │───────────────────>│
     │  products data      │                    │
     │<────────────────────│                    │
```

### Role-Based Access Control (RBAC)

```typescript
// server/middleware.ts
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  // Verify token → attach user to request
}

export async function adminMiddleware(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
}
```

**Routes use layered middleware:**
```
/api/products          → Public (no auth)
/api/cart              → authMiddleware
/api/admin/orders      → authMiddleware + adminMiddleware
/api/admin/broadcast   → authMiddleware + adminMiddleware
```

---

## 💳 Payment Processing: Stripe Integration

### Payment Flow (Stripe PaymentIntents)

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │ Frontend│     │ Backend │     │ Stripe  │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │  Checkout     │              │               │
     │──────────────>│              │               │
     │               │ POST /checkout               │
     │               │─────────────>│               │
     │               │              │ paymentIntent │
     │               │              │──────────────>│
     │               │  clientSecret│               │
     │               │<─────────────│               │
     │               │              │               │
     │  Card Details │              │               │
     │<──────────────│              │               │
     │  Submit       │              │               │
     │──────────────>│  confirm()   │               │
     │               │─────────────────────────────>│
     │               │              │  Webhook      │
     │               │              │<──────────────│
     │               │              │  Process order│
     │               │  Success     │               │
     │<──────────────│<─────────────│               │
```

### Key Design Decisions

1. **PaymentIntents API** — Handles SCA/3D Secure automatically
2. **Server-side amount calculation** — Prevents client-side price manipulation
3. **Metadata linking** — Ties payment to user_id and order details
4. **Test mode** — `sk_test_` keys for development, `sk_live_` for production

```typescript
// server/routes/payments.ts
const paymentIntent = await stripe.paymentIntents.create({
  amount: Math.round(amount * 100),  // Cents
  currency: "usd",
  automatic_payment_methods: { enabled: true },
  metadata: { user_id: String(req.user!.id) },
});
```

---

## 🚚 Shipping: Multi-Carrier Integration

### Shippo API Integration Pattern

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │ Backend │     │ Shippo  │     │ Carriers│
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │  Get rates    │              │               │
     │──────────────>│  Rate req    │               │
     │               │─────────────>│  Rate query   │
     │               │              │──────────────>│
     │               │  Rates[]     │  Rates[]      │
     │               │<─────────────│<──────────────│
     │  rates[]      │              │               │
     │<──────────────│              │               │
     │               │              │               │
     │  Buy label    │  Label req   │               │
     │──────────────>│─────────────>│  Create label │
     │               │  label_url   │──────────────>│
     │               │<─────────────│               │
     │  label_url    │              │               │
     │<──────────────│              │               │
```

### Fallback Strategy

```typescript
// When Shippo is unavailable, return pre-configured rates
const FALLBACK_RATES = [
  { carrier: "USPS", name: "Priority Mail", price: 12.99 },
  { carrier: "UPS", name: "Ground", price: 19.99 },
  { carrier: "FedEx", name: "Ground", price: 18.99 },
  { carrier: "DHL", name: "Express", price: 39.99 },
];
```

---

## 🗄️ Database Design

### Entity Relationship Diagram (Simplified)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │   products   │     │  categories  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ name         │     │ name         │     │ name         │
│ email        │     │ price        │     │ icon         │
│ password_hash│     │ stock        │     │ color        │
│ token        │     │ category_id ─│────>│              │
│ role         │     │ rating       │     └──────────────┘
└──────┬───────┘     │ reviews      │
       │             │ is_best_seller│
       │             └──────┬───────┘
       │                    │
       │  ┌─────────────────┼─────────────────┐
       │  │                 │                 │
       ▼  ▼                 ▼                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  cart_items  │     │   orders     │     │  wishlists   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ user_id (FK) │     │ user_id (FK) │     │ user_id (FK) │
│ product_id   │     │ total        │     │ product_id   │
│ quantity     │     │ status       │     └──────────────┘
└──────────────┘     │ shipping_*   │
                     │ stripe_*     │
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ order_items  │     │   returns    │
                     ├──────────────┤     ├──────────────┤
                     │ order_id(FK) │     │ order_id(FK) │
                     │ product_id   │     │ user_id(FK)  │
                     │ quantity     │     │ status       │
                     │ price        │     │ return_type  │
                     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  suppliers   │     │  warehouses  │     │  inventory   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ name         │     │ name         │     │ product_id   │
│ contact_*    │     │ address      │     │ warehouse_id │
│ payment_terms│     │ city, state  │     │ quantity     │
│ rating       │     │ is_default   │     │ reorder_pt   │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ supplier_    │     │  purchase_   │
│ products     │     │  orders      │
├──────────────┤     ├──────────────┤
│ supplier_id  │     │ supplier_id  │
│ product_id   │     │ warehouse_id │
│ unit_cost    │     │ status       │
│ min_order    │     │ total        │
└──────────────┘     └──────────────┘
```

### Database Design Patterns Used

| Pattern | Example | Why |
|---------|---------|-----|
| **Normalization (3NF)** | Separate `categories`, `products`, `order_items` | Eliminate data redundancy |
| **Soft Deletes** | `is_active` flags instead of DELETE | Preserve data integrity |
| **Audit Trail** | `inventory_movements`, `created_at` timestamps | Track all changes |
| **Junction Tables** | `supplier_products`, `order_items` | Many-to-many relationships |
| **Status Enums** | `orders.status`, `returns.status` | Enforce valid state transitions |
| **Computed Fields** | `products.rating`, `products.reviews` | Cache aggregated data |
| **Unique Constraints** | `UNIQUE(user_id, product_id)` on reviews | Prevent duplicates |

---

## 🌐 REST API Design

### API Design Principles

```
┌─────────────────────────────────────────────────────────────────┐
│                    REST API DESIGN RULES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣  Resource-Based URLs                                        │
│     GET    /api/products          ← List all products           │
│     GET    /api/products/:id      ← Get one product             │
│     POST   /api/products          ← Create product              │
│     PUT    /api/products/:id      ← Update product              │
│     DELETE /api/products/:id      ← Delete product              │
│                                                                 │
│  2️⃣  HTTP Methods = CRUD Operations                             │
│     GET    = Read (safe, idempotent)                            │
│     POST   = Create (not idempotent)                            │
│     PUT    = Update (idempotent)                                │
│     DELETE = Remove (idempotent)                                │
│                                                                 │
│  3️⃣  Status Codes                                               │
│     200 = Success                                               │
│     201 = Created                                              │
│     400 = Bad Request (validation error)                        │
│     401 = Unauthorized (no token)                               │
│     403 = Forbidden (wrong role)                                │
│     404 = Not Found                                             │
│     500 = Internal Server Error                                 │
│                                                                 │
│  4️⃣  Consistent Response Format                                 │
│     { "data": [...], "total": 100 }                             │
│     { "error": "message" }                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pagination Pattern

```typescript
// GET /api/products?page=1&limit=12&category=laptops&sort=price_asc
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 12;
const offset = (page - 1) * limit;

const products = await db.execute({
  sql: "SELECT * FROM products WHERE category_id = ? LIMIT ? OFFSET ?",
  args: [categoryId, limit, offset],
});

const total = await db.execute({
  sql: "SELECT COUNT(*) as count FROM products WHERE category_id = ?",
  args: [categoryId],
});

res.json({ data: products.rows, total: total.rows[0].count });
```

---

## ⚡ Edge Computing: Cloudflare Workers

### Why Edge Computing?

```
┌─────────────────────────────────────────────────────────────┐
│                    TRADITIONAL SERVER                        │
│  ┌─────────┐                                                │
│  │  User   │ ──────── 200ms ──────── ┌──────────┐          │
│  │ (Tokyo) │                          │  Server  │          │
│  └─────────┘                          │ (Virginia)│          │
│                                       └──────────┘          │
├─────────────────────────────────────────────────────────────┤
│                    EDGE COMPUTING                           │
│  ┌─────────┐                                                │
│  │  User   │ ──── 15ms ──── ┌──────────────┐               │
│  │ (Tokyo) │                │ Edge Worker  │               │
│  └─────────┘                │ (Tokyo POP)  │               │
│                             └──────────────┘               │
│  ⚡ 93% faster response time                                │
└─────────────────────────────────────────────────────────────┘
```

### Cloudflare Worker Architecture

```typescript
// worker/index.ts
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

// Middleware runs at the edge
app.use('*', cors());
app.use('/api/*', authMiddleware);
app.use('/api/admin/*', adminMiddleware);

// Routes execute at the nearest Cloudflare POP
app.get('/api/products', async (c) => { ... });
app.post('/api/checkout', async (c) => { ... });

export default app;
```

**Benefits:**
- 🌍 **Global distribution** — Runs in 300+ cities
- ⚡ **Sub-millisecond cold starts** — V8 isolates, not containers
- 💰 **Pay-per-request** — No idle server costs
- 🔒 **Built-in DDoS protection** — Cloudflare's network

---

## 🔄 State Management

### React Context + API Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE FLOW                                │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐               │
│  │  Auth    │    │  Cart    │    │ Products │               │
│  │ Context  │    │ (API)    │    │ (API)    │               │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘               │
│       │               │               │                      │
│       ▼               ▼               ▼                      │
│  ┌──────────────────────────────────────────┐               │
│  │           React Component Tree            │               │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │               │
│  │  │  Home    │ │ Products │ │  Cart    │  │               │
│  │  │  Page    │ │  Page    │ │  Page    │  │               │
│  │  └──────────┘ └──────────┘ └──────────┘  │               │
│  └──────────────────────────────────────────┘               │
│       │               │               │                      │
│       ▼               ▼               ▼                      │
│  ┌──────────────────────────────────────────┐               │
│  │              REST API Layer               │               │
│  │  GET /api/products  POST /api/cart        │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// src/app/context/AuthContext.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, { ... });
    const data = await res.json();
    setUser(data.user);
    localStorage.setItem('token', data.token);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## 🔒 Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: TRANSPORT                                         │
│  ───────────────────────────────────────────────────────────│
│  • HTTPS everywhere (Cloudflare SSL/TLS)                    │
│  • HSTS headers                                              │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: AUTHENTICATION                                    │
│  ───────────────────────────────────────────────────────────│
│  • Bearer token authentication                              │
│  • Token stored in DB (not JWT claims)                      │
│  • Password hashing: scrypt with random salt                │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3: AUTHORIZATION                                     │
│  ───────────────────────────────────────────────────────────│
│  • Role-Based Access Control (RBAC)                         │
│  • Admin vs User middleware chain                           │
│  • Resource-level ownership checks                          │
├─────────────────────────────────────────────────────────────┤
│  LAYER 4: INPUT VALIDATION                                  │
│  ───────────────────────────────────────────────────────────│
│  • Server-side validation on all inputs                     │
│  • Parameterized queries (SQL injection prevention)         │
│  • Amount calculation on server (not client)                │
├─────────────────────────────────────────────────────────────┤
│  LAYER 5: EXTERNAL SECRETS                                  │
│  ───────────────────────────────────────────────────────────│
│  • API keys in environment variables (never in code)        │
│  • .gitignore for .env files                                │
│  • Wrangler secrets for production                          │
└─────────────────────────────────────────────────────────────┘
```

### Password Hashing

```typescript
// server/auth.ts
import crypto from 'crypto';

const KEY_LEN = 64;
const SALT_LEN = 32;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const key = crypto.scryptSync(password, salt, KEY_LEN);
  return `${salt}:${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const key = crypto.scryptSync(password, salt, KEY_LEN);
  return key.toString('hex') === hash;
}
```

**Why scrypt?**
- Memory-hard (resistant to GPU/ASIC attacks)
- Built into Node.js (no external dependencies)
- Parameters tunable for future-proofing

---

## 📊 Order State Machine

### Order Status Transitions

```
                    ┌──────────┐
                    │  PENDING │
                    └────┬─────┘
                         │ Payment confirmed
                         ▼
                    ┌──────────┐
                    │CONFIRMED │
                    └────┬─────┘
                         │ Shipped
                         ▼
                    ┌──────────┐
                    │ SHIPPED  │──── Exception ────┐
                    └────┬─────┘                    │
                         │ Delivered                ▼
                         ▼                    ┌──────────┐
                    ┌──────────┐              │EXCEPTION │
                    │DELIVERED │              └──────────┘
                    └──────────┘

   Any status ──── User cancels ────► ┌───────────┐
                                      │ CANCELLED │
                                      └───────────┘
```

### Return/RMA State Machine

```
                    ┌──────────┐
                    │ REQUESTED│
                    └────┬─────┘
                         │ Admin approves
                         ▼
                    ┌──────────┐
                    │ APPROVED │
                    └────┬─────┘
                         │ User ships back
                         ▼
                    ┌──────────┐
                    │IN_TRANSIT│
                    └────┬─────┘
                         │ Warehouse receives
                         ▼
                    ┌──────────┐
                    │ RECEIVED │
                    └────┬─────┘
                         │ QC inspection
                         ▼
                    ┌──────────┐
                    │INSPECTED │
                    └────┬─────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      ┌─────────┐  ┌─────────┐  ┌──────────┐
      │ REFUNDED│  │EXCHANGED│  │ REJECTED │
      └─────────┘  └─────────┘  └──────────┘
```

---

## 🏭 Fulfillment Pipeline

### Warehouse Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    FULFILLMENT PIPELINE                      │
│                                                              │
│  ORDER RECEIVED                                              │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  PICK   │───>│  PACK   │───>│  SHIP   │───>│DELIVER  │  │
│  │         │    │         │    │         │    │         │  │
│  │• Pick   │    │• Box    │    │• Label  │    │• Confirm│  │
│  │  items  │    │  items  │    │  create │    │• Rate   │  │
│  │• Update │    │• Weight │    │• Track  │    │         │  │
│  │  pick   │    │• QC     │    │  number │    │         │  │
│  │  list   │    │         │    │• Carrier│    │         │  │
│  └─────────┘    └─────────┘    │  pickup │    └─────────┘  │
│                                └─────────┘                  │
│                                                              │
│  Each step:                                                  │
│  • Updates fulfillment_task status                           │
│  • Records timestamp (pick_started_at, etc.)                 │
│  • Creates inventory_movement (outbound)                     │
│  • Triggers notification to customer                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Integration Patterns

### Third-Party Service Integration

```
┌─────────────────────────────────────────────────────────────┐
│               ADAPTER PATTERN                                │
│                                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │ Internal │     │ Adapter  │     │ External │            │
│  │ Service  │────>│  Layer   │────>│   API    │            │
│  └──────────┘     └──────────┘     └──────────┘            │
│                                                              │
│  Benefits:                                                   │
│  • Swap providers without changing business logic            │
│  • Add fallback/degradation gracefully                       │
│  • Test with mocks easily                                   │
└─────────────────────────────────────────────────────────────┘
```

### Stripe Adapter

```typescript
// Abstract payment interface
interface PaymentProvider {
  createIntent(amount, metadata): Promise<PaymentIntent>;
  confirmPayment(intentId): Promise<PaymentResult>;
}

// Stripe implementation
class StripeProvider implements PaymentProvider {
  async createIntent(amount, metadata) {
    return stripe.paymentIntents.create({ amount, metadata });
  }
}
```

### Shippo Adapter

```typescript
// Abstract shipping interface
interface ShippingProvider {
  getRates(origin, destination, parcel): Promise<ShippingRate[]>;
  createLabel(rateId, addressFrom, addressTo): Promise<ShippingLabel>;
}

// Shippo implementation + Fallback
class ShippoProvider implements ShippingProvider {
  async getRates(...) {
    try {
      return await shippoApi.getRates(...);
    } catch {
      return FALLBACK_RATES; // Graceful degradation
    }
  }
}
```

---

## 📈 Scalability Considerations

### Current Architecture Limits & Solutions

```
┌─────────────────────────────────────────────────────────────┐
│  BOTTLENECK          │  SOLUTION                             │
├──────────────────────┼───────────────────────────────────────┤
│  Database reads      │  Turso read replicas (edge cache)    │
│  API response time   │  Cloudflare Workers (edge compute)   │
│  Static assets       │  Cloudflare Pages (CDN)              │
│  Payment processing  │  Stripe handles PCI compliance       │
│  Shipping rates      │  Shippo handles carrier APIs         │
│  File storage        │  R2 or S3 for product images         │
│  Email sending       │  Gmail API / Resend (queue-based)    │
└──────────────────────┴───────────────────────────────────────┘
```

### Horizontal Scaling Path

```
Phase 1 (Now):     Modular Monolith → Cloudflare Workers
                    ✅ Auto-scales to traffic
                    ✅ No server management

Phase 2 (Growth):  Add background jobs → Cloudflare Queues
                    ✅ Email notifications
                    ✅ Inventory sync
                    ✅ Analytics aggregation

Phase 3 (Scale):   Extract hot modules → Separate Workers
                    ✅ Payment Worker (isolated)
                    ✅ Shipping Worker (isolated)
                    ✅ Notification Worker (isolated)
```

---

## 🧪 Design Patterns Used

| Pattern | Where | Purpose |
|---------|-------|---------|
| **MVC** | Express routes | Separation of concerns |
| **Repository** | DB queries in routes | Data access abstraction |
| **Middleware** | Auth, CORS, validation | Request processing pipeline |
| **Adapter** | Stripe, Shippo, Gmail | External service integration |
| **Strategy** | Shipping rate fallback | Algorithm selection at runtime |
| **Observer** | Notification triggers | Event-driven side effects |
| **State Machine** | Order/Return status | Valid state transitions |
| **Builder** | SQL query construction | Complex query composition |
| **Singleton** | DB client, Stripe client | Single instance per process |
| **Factory** | `createDb(env)` | Environment-aware instantiation |

---

## 🎯 System Design Interview Topics Covered

This project demonstrates understanding of:

1. **📐 System Architecture** — Client-server, layered architecture
2. **🗄️ Database Design** — Schema design, normalization, indexing
3. **🔐 Security** — Auth, RBAC, input validation, secrets management
4. **💳 Payment Systems** — PCI compliance via Stripe, idempotency
5. **🚚 Third-Party Integration** — Adapter pattern, graceful degradation
6. **⚡ Performance** — Edge computing, CDN, caching strategies
7. **🔄 State Management** — Order lifecycle, finite state machines
8. **📊 Scalability** — Horizontal scaling, microservice extraction path
9. **🧪 Reliability** — Fallback strategies, error handling
10. **🌍 Deployment** — CI/CD, environment management, secrets

---

<div align="center">

**Built as a production-grade reference architecture**

![Architecture](https://img.shields.io/badge/Architecture-Modular_Monolith-6366f1?style=for-the-badge)
![Edge](https://img.shields.io/badge/Compute-Edge_(Cloudflare)-f48120?style=for-the-badge)
![Database](https://img.shields.io/badge/Database-Edge_(Turso)-4FF8D2?style=for-the-badge)
![API](https://img.shields.io/badge/API-REST-22c55e?style=for-the-badge)

</div>
