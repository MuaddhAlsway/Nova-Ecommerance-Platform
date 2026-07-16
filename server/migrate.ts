import "dotenv/config";
import db from "./db";
import { initDatabase } from "./schema";

async function migrate() {
  console.log("Dropping old tables...");
  await db.executeMultiple(`
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS cart_items;
    DROP TABLE IF EXISTS wishlists;
    DROP TABLE IF EXISTS newsletter_subscribers;
    DROP TABLE IF EXISTS testimonials;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS users;
  `);
  console.log("Tables dropped. Creating new schema...");
  await initDatabase();
  console.log("Seeding data...");
  const { seed } = await import("./seed");
  await seed();
  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
