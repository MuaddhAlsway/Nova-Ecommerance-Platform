# NOVA — Luxury Technology E-commerce Platform

A full-stack production e-commerce platform with complete logistics system. Built with React, Hono (Cloudflare Workers), Turso/SQLite, Stripe, and Shippo (40+ carriers).

## Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | [nova-ecommerce-cm7.pages.dev](https://nova-ecommerce-cm7.pages.dev) |
| **Backend API** | [nova-api.muaddhalsway.workers.dev](https://nova-api.muaddhalsway.workers.dev) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 7, Tailwind CSS 4, Radix UI, Recharts |
| Backend | Hono on Cloudflare Workers |
| Database | Turso (libSQL/SQLite edge replicas) |
| Payments | Stripe (test mode) |
| Shipping | Shippo API (USPS, UPS, FedEx, DHL + 37 carriers) |
| Email | Gmail API via OAuth2 (ready, needs refresh token) |
| Hosting | Cloudflare Pages (frontend) + Cloudflare Workers (backend) |

## Features

### Customer-Facing
- **Product Catalog** — Grid/list view with search, category filtering, sort options
- **Product Detail** — Full specs, image gallery, star ratings, related products
- **Shopping Cart** — Quantity management, persistent across sessions
- **Checkout** — Stripe payment, multiple shipping options with real-time rates from Shippo
- **User Accounts** — Registration, login, order history, profile management
- **Wishlist** — Save and manage favorite products
- **Reviews & Ratings** — Star ratings and text reviews on products
- **Newsletter Signup** — Email subscription
- **Infinite-scroll Testimonials** — Auto-scrolling customer review carousel
- **Static Pages** — About, Contact, FAQ, Careers, Press, Privacy, Terms, Cookies, Shipping

### Admin Dashboard (`/admin`)
| Tab | Capabilities |
|-----|-------------|
| **Overview** | Revenue, orders, users, products stats with visual cards |
| **Products** | Full CRUD — create, edit, delete products with categories, pricing, stock |
| **Orders** | View all orders, update status (pending → confirmed → shipped → delivered) |
| **Users** | View registered users, roles |
| **Categories** | Manage product categories |
| **Coupons** | Create discount codes (percent/fixed), min order, expiry, usage limits |
| **Testimonials** | CRUD customer testimonials displayed on homepage |
| **Notifications** | Email broadcast to all users or customers only |

### Operations & Logistics
- **Fulfillment Pipeline** — Pick → Pack → Ship workflow with task tracking
- **Inventory Management** — Multi-warehouse stock, bin locations, reorder points
- **Inventory Movements** — Track inbound, outbound, transfers, adjustments, returns
- **Suppliers** — Manage supplier directory with contact info, payment terms, ratings
- **Purchase Orders** — Create POs to suppliers with line items and status tracking
- **Shipping Labels** — Generate and purchase labels via Shippo (40+ carriers)
- **Carrier Pickups** — Schedule and manage carrier pickups
- **Returns (RMA)** — Full returns workflow: request → approve → transit → inspect → refund

### Shipping (Shippo Integration)
- Real-time rate calculation from 40+ carriers
- Pre-configured fallback rates (USPS, UPS, FedEx, DHL, Free Standard)
- Shipping label generation and tracking
- Carrier pickup scheduling

## Database Schema (20 tables)

```
users                  — Authentication, profiles, roles
categories             — Product categories with icons
products               — Full product catalog with specs, pricing, flags
cart_items             — Shopping cart per user
orders                 — Order lifecycle with shipping details
order_items            — Line items per order
wishlists              — User product favorites
newsletter_subscribers — Email subscribers
testimonials           — Customer quotes for homepage
reviews                — Product ratings and reviews
coupons                — Discount codes
warehouses            — Warehouse locations
inventory              — Stock levels per product per warehouse
inventory_movements    — Stock movement audit trail
suppliers              — Supplier directory
supplier_products      — Supplier-to-product pricing
purchase_orders        — POs to suppliers
purchase_order_items   — Line items per PO
fulfillment_tasks      — Pick/pack/ship task tracking
pick_lists             — Batch picking lists
pick_list_items        — Items in pick lists
returns                — RMA return requests
return_items           — Items being returned
notifications          — Email/notification queue
shipping_labels        — Generated shipping labels
carrier_pickups        — Scheduled carrier pickups
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (with search, category, sort) |
| GET | `/api/products/:id` | Product detail |
| POST | `/api/products` | Create product (admin) |
| PUT | `/api/products/:id` | Update product (admin) |
| DELETE | `/api/products/:id` | Delete product (admin) |
| GET | `/api/categories` | List categories |

### Cart & Checkout
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get cart items |
| POST | `/api/cart` | Add to cart |
| PUT | `/api/cart/:id` | Update quantity |
| DELETE | `/api/cart/:id` | Remove from cart |
| POST | `/api/checkout` | Stripe checkout session |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | User's orders |
| GET | `/api/orders/:id` | Order detail |
| GET | `/api/admin/orders` | All orders (admin) |
| PUT | `/api/admin/orders/:id` | Update order status (admin) |

### Wishlist & Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist` | Add to wishlist |
| DELETE | `/api/wishlist/:productId` | Remove from wishlist |
| GET | `/api/products/:id/reviews` | Get product reviews |
| POST | `/api/products/:id/reviews` | Submit review |

### Shipping
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/shipping/rates` | Get shipping rates (Shippo) |
| POST | `/api/shipping/label` | Create shipping label |
| POST | `/api/shipping/pickup` | Schedule carrier pickup |

### Coupons & Newsletter
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/coupons/validate` | Validate coupon code |
| POST | `/api/newsletter` | Subscribe to newsletter |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| GET/POST/PUT/DELETE | `/api/admin/categories/*` | Category management |
| GET/POST/PUT/DELETE | `/api/admin/coupons/*` | Coupon management |
| GET/POST/PUT/DELETE | `/api/admin/testimonials/*` | Testimonial management |
| POST | `/api/admin/broadcast` | Email broadcast |
| GET | `/api/admin/smtp-test` | Test email connectivity |

### Operations (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PUT | `/api/admin/fulfillment/*` | Fulfillment tasks |
| GET/POST/PUT | `/api/admin/inventory/*` | Inventory management |
| GET/POST/PUT/DELETE | `/api/admin/suppliers/*` | Supplier management |
| GET/POST/PUT | `/api/admin/purchase-orders/*` | Purchase orders |
| GET/POST/PUT | `/api/admin/warehouses/*` | Warehouse management |
| GET/POST/PUT | `/api/admin/returns/*` | Returns/RMA |

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Local Development

```bash
# Install dependencies
pnpm install

# Start frontend + backend dev servers
pnpm dev

# Or start individually
pnpm dev:frontend    # Vite dev server (http://localhost:5173)
pnpm dev:server      # Express backend (http://localhost:3001)
```

### Environment Variables

Create a `.env` file in the project root:

```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
STRIPE_SECRET_KEY=sk_test_your-stripe-key
SHIPPO_API_TOKEN=shippo_live_your-shippo-token
```

### Cloudflare Worker Deployment

The production backend runs as a Cloudflare Worker. Environment variables are set in `wrangler.toml`:

```bash
# Deploy worker
npx wrangler deploy

# The worker is configured with:
# - nodejs_compat flag (for crypto, buffer, etc.)
# - All env vars in wrangler.toml
```

### Database

The database runs on Turso (edge-hosted libSQL). Tables are auto-created on first request. To seed sample data:

```bash
pnpm db:seed
```

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── pages/           # 23 page components
│   │   │   ├── Home.tsx           # Landing page with hero, features, testimonials
│   │   │   ├── Products.tsx       # Product catalog with filters
│   │   │   ├── ProductDetail.tsx  # Single product view
│   │   │   ├── Cart.tsx           # Shopping cart
│   │   │   ├── Checkout.tsx       # Stripe checkout
│   │   │   ├── AdminDashboard.tsx # Admin panel (8 tabs)
│   │   │   ├── FulfillmentPage.tsx # Fulfillment workflow
│   │   │   ├── InventoryPage.tsx  # Inventory management
│   │   │   ├── SupplierPage.tsx   # Supplier management
│   │   │   ├── AnalyticsPage.tsx  # Analytics dashboard
│   │   │   ├── UserDashboard.tsx  # User account
│   │   │   ├── Login.tsx / Register.tsx
│   │   │   └── ... (About, Contact, FAQ, etc.)
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Authentication state
│   │   ├── config.ts              # API base URL
│   │   └── App.tsx                # Router + navigation
│   └── styles/
│       ├── index.css              # Tailwind imports + globals
│       └── globals.css            # Testimonial scroll animations
├── server/
│   ├── index.ts             # Express dev server
│   ├── schema.ts            # Database schema (20 tables)
│   ├── seed.ts              # Sample data seeder
│   ├── auth.ts              # Password hashing (scrypt)
│   ├── db.ts                # Turso client
│   ├── middleware.ts         # Auth middleware
│   └── routes/              # 17 route modules
│       ├── products.ts, orders.ts, cart.ts, auth.ts
│       ├── payments.ts (Stripe), shipping.ts (Shippo)
│       ├── fulfillment.ts, inventory.ts, suppliers.ts
│       ├── returns.ts, reviews.ts, wishlist.ts
│       └── coupons.ts, newsletter.ts, notifications.ts
├── worker/
│   └── index.ts             # Cloudflare Worker (Hono) — production backend
├── wrangler.toml            # CF Worker config + env vars
├── vite.config.ts           # Vite build config
├── postcss.config.mjs       # PostCSS + Tailwind
└── package.json             # Dependencies and scripts
```

## Design System

- **Theme:** Dark (`bg-[#080808]`)
- **Typography:** `font-display` (Glock serif) for headings, system sans-serif for body
- **Components:** Rounded corners (`rounded-2xl`), subtle borders (`border-white/[0.07]`)
- **Animations:** CSS keyframe infinite-scroll carousel, motion/react for page transitions
- **UI Library:** Radix UI primitives + Tailwind CSS

## Credentials (Test)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nova.com | admin123 |
| User | user@nova.com | user123 |

## Deployment

### Frontend (Cloudflare Pages)
```bash
pnpm build
# Deploy via Cloudflare Pages dashboard or Wrangler
```

### Backend (Cloudflare Workers)
```bash
cd worker
npx wrangler deploy
```

### Notes
- Frontend auto-detects environment: uses `localhost:3001` in dev, CF Worker URL in production
- Password hashing uses Node.js `crypto.scryptSync` (via `nodejs_compat` flag)
- Global `JSON.stringify` override in worker converts BigInt to Number for Turso compatibility
- Stripe is in test mode — use test card `4242 4242 4242 4242`

## License

Private — All rights reserved.
