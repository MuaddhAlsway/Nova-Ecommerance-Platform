import db from "./db";
import { hashPassword } from "./auth";

const CATEGORIES = [
  { name: "Laptops", icon: "Laptop", count: 124, color: "from-blue-500/10" },
  { name: "Smartwatches", icon: "Watch", count: 89, color: "from-purple-500/10" },
  { name: "Smartphones", icon: "Smartphone", count: 156, color: "from-emerald-500/10" },
  { name: "Audio", icon: "Headphones", count: 203, color: "from-rose-500/10" },
  { name: "Gaming", icon: "Gamepad2", count: 178, color: "from-orange-500/10" },
  { name: "Accessories", icon: "Package", count: 445, color: "from-cyan-500/10" },
];

const PRODUCTS = [
  { name: 'MacBook Pro 16"', subtitle: "M3 Max · 36GB RAM · 1TB SSD", description: "The most powerful MacBook Pro ever. With M3 Max chip, up to 128GB unified memory, and up to 22 hours of battery life. Built for demanding pro workflows.", price: 3499, original_price: 3899, rating: 4.9, reviews: 2847, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=800&fit=crop","https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=800&fit=crop"]', badge: "Best Seller", category_name: "Laptops", is_best_seller: 1, stock: 50, specs: '{"Chip":"M3 Max","RAM":"36GB","Storage":"1TB SSD","Display":"16.2-inch Liquid Retina XDR","Battery":"Up to 22 hours","Weight":"2.14 kg"}' },
  { name: "Apple Watch Ultra 2", subtitle: "49mm · Titanium · GPS + Cellular", description: "The most rugged and capable Apple Watch. Featuring the brightest display ever, precision dual-frequency GPS, and up to 36 hours of battery life.", price: 799, original_price: null, rating: 4.8, reviews: 1923, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&h=800&fit=crop"]', badge: "Top Rated", category_name: "Smartwatches", is_best_seller: 1, stock: 75, specs: '{"Case":"49mm Titanium","Display":"Always-On Retina","GPS":"Precision dual-frequency","Water":"100m WR","Battery":"Up to 36 hours","Chip":"S9 SiP"}' },
  { name: "Sony WH-1000XM5", subtitle: "Wireless Noise Cancelling", description: "Industry-leading noise cancellation with Auto NC Optimizer. Crystal clear hands-free calling with 4 beamforming microphones. Up to 30 hours battery.", price: 349, original_price: 399, rating: 4.9, reviews: 4521, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&h=800&fit=crop"]', badge: "Staff Pick", category_name: "Audio", is_best_seller: 1, is_featured: 1, stock: 120, specs: '{"Driver":"30mm","ANC":"Industry Leading","Battery":"30 hours","Bluetooth":"5.2","Codec":"LDAC, AAC","Weight":"250g"}' },
  { name: "iPhone 15 Pro Max", subtitle: "256GB · Natural Titanium", description: "Titanium design. A17 Pro chip. Customizable Action button. The most powerful iPhone camera system ever for incredible photos and videos.", price: 1199, original_price: null, rating: 4.8, reviews: 8234, image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=1200&h=800&fit=crop"]', badge: null, category_name: "Smartphones", is_best_seller: 1, stock: 200, specs: '{"Chip":"A17 Pro","Display":"6.7-inch Super Retina XDR","Camera":"48MP Main","Storage":"256GB","Battery":"Up to 29 hours video","Frame":"Titanium"}' },
  { name: "iPad Pro M4", subtitle: "13-inch · 256GB · Wi-Fi", description: "The ultimate iPad experience with the blazing M4 chip. Ultra Retina XDR display. Supports Apple Pencil Pro and Magic Keyboard.", price: 1299, original_price: null, rating: 4.9, reviews: 743, image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&h=800&fit=crop"]', badge: "New", category_name: "Laptops", is_new_arrival: 1, stock: 60, specs: '{"Chip":"M4","Display":"13-inch Ultra Retina XDR","Storage":"256GB","Camera":"12MP Wide","Apple Pencil":"Pro supported","Weight":"579g"}' },
  { name: "Samsung Galaxy S25 Ultra", subtitle: "512GB · Titanium Silver", description: "The next leap in AI-powered mobile computing. Galaxy AI helps you search, create, and communicate in entirely new ways.", price: 1399, original_price: null, rating: 4.7, reviews: 1056, image: "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1567581935884-3349723552ca?w=1200&h=800&fit=crop"]', badge: "New", category_name: "Smartphones", is_new_arrival: 1, stock: 90, specs: '{"Chip":"Snapdragon 8 Elite","Display":"6.9-inch QHD+ AMOLED","Camera":"200MP Main","Storage":"512GB","Battery":"5000mAh","S Pen":"Built-in"}' },
  { name: "Apple AirPods Max", subtitle: "USB-C · Midnight", description: "Stunning high-fidelity audio. Active Noise Cancellation blocks outside noise. Transparency mode lets ambient sound in. Computational audio magic.", price: 549, original_price: null, rating: 4.6, reviews: 892, image: "https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=1200&h=800&fit=crop"]', badge: "New", category_name: "Audio", is_new_arrival: 1, stock: 85, specs: '{"Driver":"40mm Apple-designed","ANC":"Active","Transparency":"Yes","Battery":"20 hours","Connector":"USB-C","Spatial Audio":"Yes"}' },
  { name: "ASUS ROG Zephyrus G16", subtitle: "RTX 4090 · AMD Ryzen 9", description: "Ultra-slim powerhouse gaming laptop with ROG Nebula Display, NVIDIA GeForce RTX 4090, and AMD Ryzen 9 processor for uncompromising performance.", price: 2799, original_price: null, rating: 4.8, reviews: 334, image: "https://images.unsplash.com/photo-1593640408182-31c228e2c7d2?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1593640408182-31c228e2c7d2?w=1200&h=800&fit=crop"]', badge: "New", category_name: "Gaming", is_new_arrival: 1, stock: 30, specs: '{"GPU":"NVIDIA RTX 4090","CPU":"AMD Ryzen 9 7945HX","RAM":"32GB DDR5","Storage":"2TB NVMe","Display":"16-inch QHD 240Hz","Weight":"1.85 kg"}' },
  { name: "Samsung Galaxy Watch 6 Classic", subtitle: "47mm · Bluetooth · Black", description: "The iconic rotating bezel is back. Advanced sleep coaching, BioActive Sensor for heart rate, and sapphire crystal glass.", price: 399, original_price: 429, rating: 4.5, reviews: 1234, image: "https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=1200&h=800&fit=crop"]', badge: null, category_name: "Smartwatches", is_new_arrival: 0, stock: 100, specs: '{"Display":"1.47-inch Super AMOLED","Processor":"Exynos W930","Storage":"16GB","Battery":"425mAh","Water":"5ATM + IP68","Glass":"Sapphire Crystal"}' },
  { name: "Nintendo Switch OLED", subtitle: "White · 64GB", description: "Play at home on the TV or on the go with a vibrant 7-inch OLED screen. Enhanced audio and a wide adjustable stand for comfortable tabletop play.", price: 349, original_price: null, rating: 4.7, reviews: 15678, image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=1200&h=800&fit=crop"]', badge: null, category_name: "Gaming", is_best_seller: 0, stock: 150, specs: '{"Display":"7-inch OLED","Storage":"64GB","Resolution":"1280x720","Audio":"Enhanced","Stand":"Adjustable wide","Battery":"4.5-9 hours"}' },
  { name: "Bose QuietComfort Ultra", subtitle: "Wireless Noise Cancelling Earbuds", description: "World-class noise cancellation with Immersive Audio. CustomTune technology calibrates sound to your ears. Up to 6 hours battery life.", price: 299, original_price: null, rating: 4.7, reviews: 2341, image: "https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=1200&h=800&fit=crop"]', badge: null, category_name: "Audio", is_new_arrival: 0, stock: 200, specs: '{"ANC":"World-class","Audio":"Immersive Spatial","Battery":"6 hours (24 with case)","Fit":"Stability Bands","Water":"IPX4","Bluetooth":"5.3"}' },
  { name: "Apple Magic Keyboard", subtitle: "for iPad Pro 13-inch · Black", description: "The ultimate keyboard experience for iPad Pro. Built-in trackpad, USB-C charging port, and a sleek floating cantilever design.", price: 349, original_price: null, rating: 4.4, reviews: 567, image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop&auto=format", images: '["https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&h=800&fit=crop"]', badge: null, category_name: "Accessories", is_new_arrival: 0, stock: 300, specs: '{"Connectivity":"Smart Connector","Trackpad":"Multi-touch","Charging":"USB-C","Backlight":"Yes","Angle":"Adjustable","Weight":"710g"}' },
];

export async function seed() {
  const existing = await db.execute("SELECT COUNT(*) as count FROM categories");
  if ((existing.rows[0] as any).count > 0) {
    console.log("Database already seeded");
    return;
  }

  console.log("Seeding database...");

  // Seed admin user (password: admin123)
  const adminHash = hashPassword("admin123");
  await db.execute({
    sql: "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
    args: ["Admin", "admin@nova.com", adminHash],
  });

  // Seed demo user (password: user123)
  const userHash = hashPassword("user123");
  await db.execute({
    sql: "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'user')",
    args: ["Demo User", "user@nova.com", userHash],
  });

  for (const cat of CATEGORIES) {
    await db.execute({
      sql: "INSERT INTO categories (name, icon, count, color) VALUES (?, ?, ?, ?)",
      args: [cat.name, cat.icon, cat.count, cat.color],
    });
  }

  for (const p of PRODUCTS) {
    const cat = await db.execute({ sql: "SELECT id FROM categories WHERE name = ?", args: [p.category_name] });
    const categoryId = cat.rows[0]?.id ?? null;
    await db.execute({
      sql: `INSERT INTO products (name, subtitle, description, price, original_price, rating, reviews, image, images, badge, stock, specs, category_id, is_best_seller, is_new_arrival, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.name, p.subtitle, p.description, p.price, p.original_price, p.rating, p.reviews, p.image, p.images, p.badge, p.stock, p.specs, categoryId, p.is_best_seller || 0, p.is_new_arrival || 0, p.is_featured || 0],
    });
  }

  const TESTIMONIALS = [
    { name: "Alexandra Chen", role: "Creative Director", avatar: "https://images.unsplash.com/photo-1494790108755-2616b332e234?w=80&h=80&fit=crop&auto=format", quote: "NOVA has completely transformed how I shop for technology. The curation is impeccable.", rating: 5 },
    { name: "Marcus Reynolds", role: "Software Engineer", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format", quote: "The level of service is unmatched. I had a question at 11pm and received a response within minutes.", rating: 5 },
    { name: "Isabelle Fontaine", role: "Architect", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format", quote: "NOVA is in a different league — the attention to detail is truly extraordinary.", rating: 5 },
  ];

  for (const t of TESTIMONIALS) {
    await db.execute({
      sql: "INSERT INTO testimonials (name, role, avatar, quote, rating) VALUES (?, ?, ?, ?, ?)",
      args: [t.name, t.role, t.avatar, t.quote, t.rating],
    });
  }

  // Seed coupons
  const COUPONS = [
    { code: "WELCOME10", discount_type: "percent", discount_value: 10, min_order: 0, max_uses: 0, expires_at: null },
    { code: "SAVE50", discount_type: "fixed", discount_value: 50, min_order: 200, max_uses: 100, expires_at: null },
    { code: "VIP20", discount_type: "percent", discount_value: 20, min_order: 500, max_uses: 50, expires_at: null },
  ];

  for (const c of COUPONS) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_order, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [c.code, c.discount_type, c.discount_value, c.min_order, c.max_uses, c.expires_at],
    });
  }

  // Seed default warehouse
  await db.execute({
    sql: `INSERT OR IGNORE INTO warehouses (name, address, city, state, zip, country, is_default)
          VALUES ('NOVA Fulfillment Center', '100 Commerce Blvd', 'Newark', 'NJ', '07102', 'US', 1)`,
    args: [],
  });

  // Seed inventory for all products in default warehouse
  const products = await db.execute({ sql: "SELECT id, stock FROM products", args: [] });
  const wh = await db.execute({ sql: "SELECT id FROM warehouses WHERE is_default = 1", args: [] });
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

  console.log("Database seeded successfully");
}
