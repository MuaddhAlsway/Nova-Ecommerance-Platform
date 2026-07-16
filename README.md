<div align="center">

# ✨ NOVA

### Luxury Technology E-commerce Platform

A full-stack production e-commerce platform with complete logistics system.

![License](https://img.shields.io/badge/license-private-red?style=flat-square&color=474747)
![Stars](https://img.shields.io/badge/⭐-stars-blue?style=flat-square&color=fbbf24)
![Status](https://img.shields.io/badge/status-active-brightgreen?style=flat-square)
![Deployed](https://img.shields.io/badge/deployed-cloudflare-orange?style=flat-square&color=f48120)

---

**🌐 [Live Frontend](https://nova-ecommerce-cm7.pages.dev)** · **⚙️ [Live API](https://nova-api.muaddhalsway.workers.dev)**

---

</div>

<br>

## 🛠️ Tech Stack

<div align="center">

**Frontend**

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Radix UI](https://img.shields.io/badge/Radix_UI-MUI-1E1E1E?style=for-the-badge&logo=mui&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-2-FF6384?style=for-the-badge&logo=recharts&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide-Icons-7C3AED?style=for-the-badge&logo=lucide&logoColor=white)

<br>

**Backend & Infrastructure**

![Hono](https://img.shields.io/badge/Hono-Framework-FF6B35?style=for-the-badge&logo=hono&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F48120?style=for-the-badge&logo=cloudflareworkers&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F48120?style=for-the-badge&logo=cloudflare&logoColor=white)
![Turso](https://img.shields.io/badge/Turso-Database-4FF8D2?style=for-the-badge&logo=turso&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

<br>

**Services & APIs**

![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Shippo](https://img.shields.io/badge/Shippo-Shipping-111111?style=for-the-badge&logo=shippo&logoColor=white)
![Gmail API](https://img.shields.io/badge/Gmail_API-Email-EA4335?style=for-the-badge&logo=google&logoColor=white)
![Google OAuth](https://img.shields.io/badge/Google_OAuth-Auth-4285F4?style=for-the-badge&logo=google&logoColor=white)

</div>

<br>

## 🚀 Features

### 🛍️ Customer Experience

| Feature | Description |
|---------|------------|
| 🏪 **Product Catalog** | Grid/list view with search, category filtering, sort options |
| 📦 **Product Detail** | Full specs, image gallery, star ratings, related products |
| 🛒 **Smart Cart** | Quantity management, persistent across sessions |
| 💳 **Checkout** | Stripe payment with real-time shipping rates from Shippo |
| 👤 **User Accounts** | Registration, login, order history, profile management |
| ❤️ **Wishlist** | Save and manage favorite products |
| ⭐ **Reviews & Ratings** | Star ratings and text reviews on products |
| 📧 **Newsletter** | Email subscription |
| 💬 **Testimonials** | Auto-scrolling infinite carousel on homepage |
| 📄 **Static Pages** | About, Contact, FAQ, Careers, Press, Privacy, Terms, Cookies, Shipping |

### 🎛️ Admin Dashboard

<table>
<tr>
<td width="50%">

**📊 Overview**
- Revenue, orders, users, products stats
- Visual stat cards with icons

**📦 Products**
- Full CRUD operations
- Categories, pricing, stock management

**🧾 Orders**
- View all orders
- Status tracking (pending → delivered)

**👥 Users**
- User directory with roles

</td>
<td width="50%">

**🏷️ Categories**
- Manage product categories

**🎫 Coupons**
- Discount codes (percent/fixed)
- Min order, expiry, usage limits

**💬 Testimonials**
- CRUD customer quotes

**📢 Notifications**
- Email broadcast to all users

</td>
</tr>
</table>

### ⚙️ Operations & Logistics

| Module | What It Does |
|--------|-------------|
| 📋 **Fulfillment Pipeline** | Pick → Pack → Ship workflow with task tracking |
| 📊 **Inventory Management** | Multi-warehouse stock, bin locations, reorder points |
| 🔄 **Inventory Movements** | Track inbound, outbound, transfers, adjustments, returns |
| 🏭 **Suppliers** | Directory with contact info, payment terms, ratings |
| 📄 **Purchase Orders** | Create POs to suppliers with line items and status |
| 🏷️ **Shipping Labels** | Generate and purchase labels via Shippo (40+ carriers) |
| 🚚 **Carrier Pickups** | Schedule and manage carrier pickups |
| ↩️ **Returns (RMA)** | Full workflow: request → approve → transit → inspect → refund |

### 🚚 Shipping (Shippo Integration)

```
📦 40+ carriers — USPS, UPS, FedEx, DHL + more
💰 Real-time rate calculation
🏷️ Shipping label generation
📍 Tracking & delivery updates
🚚 Carrier pickup scheduling
```

<br>

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│  20 Tables · Turso (Edge-Hosted SQLite)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 Users              🏷️ Categories          📦 Products   │
│  🛒 Cart Items         🧾 Orders              📋 Order Items│
│  ❤️ Wishlists          📧 Newsletter          💬 Testimonials│
│  ⭐ Reviews            🎫 Coupons             🏭 Warehouses │
│  📊 Inventory          🔄 Inventory Movements 🏭 Suppliers  │
│  🔗 Supplier Products  📄 Purchase Orders     📋 PO Items   │
│  📋 Fulfillment Tasks  📋 Pick Lists          📋 Pick Items │
│  ↩️ Returns            ↩️ Return Items         📢 Notifications│
│  🏷️ Shipping Labels    🚚 Carrier Pickups                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

<br>

## 🌐 API Reference

<details>
<summary><strong>🔐 Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login (returns JWT) |
| `GET` | `/api/auth/me` | Get current user |

</details>

<details>
<summary><strong>📦 Products</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List products (search, category, sort) |
| `GET` | `/api/products/:id` | Product detail |
| `POST` | `/api/products` | Create product *(admin)* |
| `PUT` | `/api/products/:id` | Update product *(admin)* |
| `DELETE` | `/api/products/:id` | Delete product *(admin)* |
| `GET` | `/api/categories` | List categories |

</details>

<details>
<summary><strong>🛒 Cart & Checkout</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/cart` | Get cart items |
| `POST` | `/api/cart` | Add to cart |
| `PUT` | `/api/cart/:id` | Update quantity |
| `DELETE` | `/api/cart/:id` | Remove from cart |
| `POST` | `/api/checkout` | Stripe checkout session |

</details>

<details>
<summary><strong>🧾 Orders</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/orders` | User's orders |
| `GET` | `/api/orders/:id` | Order detail |
| `GET` | `/api/admin/orders` | All orders *(admin)* |
| `PUT` | `/api/admin/orders/:id` | Update order status *(admin)* |

</details>

<details>
<summary><strong>❤️ Wishlist & Reviews</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/wishlist` | Get wishlist |
| `POST` | `/api/wishlist` | Add to wishlist |
| `DELETE` | `/api/wishlist/:productId` | Remove from wishlist |
| `GET` | `/api/products/:id/reviews` | Get product reviews |
| `POST` | `/api/products/:id/reviews` | Submit review |

</details>

<details>
<summary><strong>🚚 Shipping</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/shipping/rates` | Get shipping rates (Shippo) |
| `POST` | `/api/shipping/label` | Create shipping label |
| `POST` | `/api/shipping/pickup` | Schedule carrier pickup |

</details>

<details>
<summary><strong>🎫 Coupons & Newsletter</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/coupons/validate` | Validate coupon code |
| `POST` | `/api/newsletter` | Subscribe to newsletter |

</details>

<details>
<summary><strong>⚙️ Admin Panel</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Dashboard statistics |
| `GET/POST/PUT/DELETE` | `/api/admin/categories/*` | Category management |
| `GET/POST/PUT/DELETE` | `/api/admin/coupons/*` | Coupon management |
| `GET/POST/PUT/DELETE` | `/api/admin/testimonials/*` | Testimonial management |
| `POST` | `/api/admin/broadcast` | Email broadcast |
| `GET` | `/api/admin/smtp-test` | Test email connectivity |

</details>

<details>
<summary><strong>🏭 Operations (Admin)</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST/PUT` | `/api/admin/fulfillment/*` | Fulfillment tasks |
| `GET/POST/PUT` | `/api/admin/inventory/*` | Inventory management |
| `GET/POST/PUT/DELETE` | `/api/admin/suppliers/*` | Supplier management |
| `GET/POST/PUT` | `/api/admin/purchase-orders/*` | Purchase orders |
| `GET/POST/PUT` | `/api/admin/warehouses/*` | Warehouse management |
| `GET/POST/PUT` | `/api/admin/returns/*` | Returns/RMA |

</details>

<br>

## 🏗️ Project Structure

```
luxury-tech-ecommerce/
├── 📂 src/
│   ├── 📂 app/
│   │   ├── 📂 pages/              23 page components
│   │   │   ├── 🏠 Home.tsx              Landing page with hero + testimonials
│   │   │   ├── 🛍️ Products.tsx          Product catalog with filters
│   │   │   ├── 📦 ProductDetail.tsx     Single product view
│   │   │   ├── 🛒 Cart.tsx              Shopping cart
│   │   │   ├── 💳 Checkout.tsx          Stripe checkout
│   │   │   ├── 🎛️ AdminDashboard.tsx    Admin panel (8 tabs)
│   │   │   ├── 📋 FulfillmentPage.tsx   Fulfillment workflow
│   │   │   ├── 📊 InventoryPage.tsx     Inventory management
│   │   │   ├── 🏭 SupplierPage.tsx      Supplier management
│   │   │   ├── 📈 AnalyticsPage.tsx     Analytics dashboard
│   │   │   ├── 👤 UserDashboard.tsx     User account
│   │   │   ├── 🔐 Login.tsx / Register.tsx
│   │   │   └── 📄 ... (About, Contact, FAQ, etc.)
│   │   ├── 📂 context/
│   │   │   └── 🔑 AuthContext.tsx       Authentication state
│   │   ├── ⚙️ config.ts                 API base URL
│   │   └── 🚀 App.tsx                   Router + navigation
│   └── 📂 styles/
│       ├── 🎨 index.css                 Tailwind imports + globals
│       └── ✨ globals.css               Testimonial scroll animations
├── 📂 server/
│   ├── 🖥️ index.ts                Express dev server
│   ├── 🗄️ schema.ts               Database schema (20 tables)
│   ├── 🌱 seed.ts                 Sample data seeder
│   ├── 🔐 auth.ts                 Password hashing (scrypt)
│   ├── 🔌 db.ts                   Turso client
│   ├── 🛡️ middleware.ts            Auth middleware
│   └── 📂 routes/                 17 route modules
│       ├── 📦 products.ts, 🧾 orders.ts, 🛒 cart.ts, 🔐 auth.ts
│       ├── 💳 payments.ts (Stripe), 🚚 shipping.ts (Shippo)
│       ├── 📋 fulfillment.ts, 📊 inventory.ts, 🏭 suppliers.ts
│       ├── ↩️ returns.ts, ⭐ reviews.ts, ❤️ wishlist.ts
│       └── 🎫 coupons.ts, 📧 newsletter.ts, 📢 notifications.ts
├── ⚡ worker/
│   └── 📦 index.ts                Cloudflare Worker (Hono) — production backend
├── 📋 wrangler.toml.example        CF Worker config template
├── 🌍 .env.example                 Environment variables template
├── ⚡ vite.config.ts                Vite build config
├── 🎨 postcss.config.mjs           PostCSS + Tailwind
└── 📦 package.json                 Dependencies and scripts
```

<br>

## 🎨 Design System

<div align="center">

| Element | Value |
|---------|-------|
| 🌑 **Theme** | Dark (`bg-[#080808]`) |
| 🔤 **Typography** | `font-display` (Glock serif) headings, system sans body |
| 🔲 **Components** | `rounded-2xl`, `border-white/[0.07]` |
| ✨ **Animations** | CSS keyframe infinite-scroll carousel, motion/react transitions |
| 🧩 **UI Library** | Radix UI primitives + Tailwind CSS |

</div>

<br>

## 🚀 Getting Started

### 📋 Prerequisites

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-Recommended-FF6900?style=flat-square&logo=pnpm&logoColor=white)

### 🏃 Local Development

```bash
# 📥 Install dependencies
pnpm install

# 🚀 Start frontend + backend
pnpm dev

# Or start individually
pnpm dev:frontend    # Vite dev server (http://localhost:5173)
pnpm dev:server      # Express backend (http://localhost:3001)
```

### 🔑 Environment Variables

Create a `.env` file in the project root (see `.env.example`):

```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
STRIPE_SECRET_KEY=sk_test_your-stripe-key
SHIPPO_API_TOKEN=shippo_live_your-shippo-token
```

### ☁️ Cloudflare Worker Deployment

```bash
# ⚡ Deploy worker
npx wrangler deploy

# Configured with:
# - nodejs_compat flag (for crypto, buffer, etc.)
# - All env vars in wrangler.toml (see wrangler.toml.example)
```

### 🗄️ Database

Runs on **Turso** (edge-hosted libSQL). Tables auto-created on first request.

```bash
# 🌱 Seed sample data
pnpm db:seed
```

<br>

## 🔐 Test Credentials

<div align="center">

| Role | Email | Password |
|------|-------|----------|
| 👑 **Admin** | `admin@nova.com` | `admin123` |
| 👤 **User** | `user@nova.com` | `user123` |

**💳 Stripe Test Card:** `4242 4242 4242 4242`

</div>

<br>

## 📦 Deployment

<div align="center">

| Service | How to Deploy |
|---------|--------------|
| 🌐 **Frontend** | Cloudflare Pages — `pnpm build` |
| ⚙️ **Backend** | Cloudflare Workers — `npx wrangler deploy` |

</div>

> **Note:** Frontend auto-detects environment: uses `localhost:3001` in dev, CF Worker URL in production.

<br>

---

<div align="center">

Built with ❤️ by **Muadh Al-Sway**

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F48120?style=for-the-badge&logo=cloudflare&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Turso](https://img.shields.io/badge/Turso-4FF8D2?style=for-the-badge&logo=turso&logoColor=black)

</div>
