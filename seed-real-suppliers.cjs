const { createClient } = require('@libsql/client');
const db = createClient({ url: 'libsql://nova-muaddhalsway.aws-ap-south-1.turso.io', authToken: process.env.TURSO_AUTH_TOKEN });

async function seed() {
  // Disable FK checks for cleanup
  await db.execute({ sql: 'PRAGMA foreign_keys = OFF', args: [] });

  await db.execute({ sql: 'DELETE FROM purchase_order_items', args: [] });
  await db.execute({ sql: 'DELETE FROM purchase_orders', args: [] });
  await db.execute({ sql: 'DELETE FROM supplier_products', args: [] });
  await db.execute({ sql: 'DELETE FROM suppliers', args: [] });

  // Reset autoincrement
  await db.execute({ sql: "DELETE FROM sqlite_sequence WHERE name IN ('suppliers','supplier_products','purchase_orders','purchase_order_items')", args: [] });

  await db.execute({ sql: 'PRAGMA foreign_keys = ON', args: [] });

  const suppliers = [
    ['TD SYNNEX', 'Apple US Sales Team', 'AppleUS@tdsynnex.com', '+1-800-237-8931', '7625 Technology Way, Fremont, CA 94538', 'Fremont', 'US', 'Net 30', 5],
    ['Connect Distributors', 'Sales Team', 'sales@connectdist.com', '+1-646-688-4841', '228 Park Ave S, New York, NY 10003', 'New York', 'US', 'Net 30', 7],
    ['SM Distribution', 'Sales Dept', 'sales@smdistribution.co', '+1-732-414-2929', '1000 Towbin Ave, Lakewood, NJ 08701', 'Lakewood', 'US', 'Net 30', 5],
    ['Vast Inc.', 'Accounts Dept', 'accounts@vastvideogames.com', '+1-603-598-8900', '30 Temple Dr, Salisbury, MA 01952', 'Salisbury', 'US', 'Net 15', 3],
    ['Regal Distributor', 'Wholesale Team', 'wholesale@regaldistributor.com', '+1-212-555-0100', '20 W 34th Street, New York, NY 10001', 'New York', 'US', 'Net 30', 7],
  ];

  const supplierIds = {};
  for (const s of suppliers) {
    const r = await db.execute({
      sql: 'INSERT INTO suppliers (name, contact_name, email, phone, address, city, country, payment_terms, lead_time_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: s,
    });
    supplierIds[s[0]] = Number(r.lastInsertRowid);
  }
  console.log('Seeded suppliers:', JSON.stringify(supplierIds));

  const td = supplierIds['TD SYNNEX'];
  const cd = supplierIds['Connect Distributors'];
  const sm = supplierIds['SM Distribution'];
  const vi = supplierIds['Vast Inc.'];
  const rd = supplierIds['Regal Distributor'];

  // supplier_products: [supplier_id, product_id, unit_cost, min_order_qty, lead_time_days, supplier_sku, is_preferred]
  const sp = [
    [td, 1, 2199.00, 1, 5, 'TD-MBP16-M4', 1],
    [td, 2, 749.00, 2, 5, 'TD-AWU2', 1],
    [td, 4, 1099.00, 5, 5, 'TD-IP15PM', 1],
    [td, 5, 1099.00, 2, 5, 'TD-IPADPM4', 1],
    [td, 7, 499.00, 3, 5, 'TD-AIRPODSMAX', 1],
    [td, 12, 299.00, 5, 5, 'TD-MAGICKEYBOARD', 0],
    [cd, 3, 278.00, 10, 7, 'CD-WH1000XM5', 1],
    [cd, 11, 379.00, 5, 7, 'CD-QCULTRA', 1],
    [sm, 6, 1099.00, 3, 5, 'SM-GS25U', 1],
    [sm, 9, 299.00, 10, 5, 'SM-SGCW6', 1],
    [vi, 10, 249.00, 10, 3, 'VI-NSWOLED', 1],
    [vi, 8, 1899.00, 2, 7, 'VI-ROGZEPHY', 1],
    [rd, 3, 269.00, 20, 7, 'RD-WH1000XM5', 0],
    [rd, 11, 369.00, 10, 7, 'RD-QCULTRA', 0],
    [rd, 9, 289.00, 15, 7, 'RD-SGCW6', 0],
  ];

  for (const s of sp) {
    await db.execute({
      sql: 'INSERT INTO supplier_products (supplier_id, product_id, unit_cost, min_order_qty, lead_time_days, supplier_sku, is_preferred) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: s,
    });
  }
  console.log('Seeded 15 supplier products');

  const pos = [
    [td, 1, 32985.00, 'TD SYNNEX Q3 Apple bulk order - MacBooks, iPhones, iPads, Watches', '2026-08-15', 1, 'confirmed'],
    [vi, 1, 2490.00, 'Vast Inc. Nintendo Switch OLED restock', '2026-07-30', 1, 'received'],
    [cd, 1, 4570.00, 'Connect Distributors audio equipment order - Sony & Bose headphones', '2026-08-01', 1, 'sent'],
    [sm, 1, 6294.00, 'SM Distribution Samsung phones & watches', '2026-08-10', 1, 'draft'],
    [rd, 1, 9060.00, 'Regal Distributor mixed electronics order', '2026-08-20', 1, 'draft'],
  ];

  const poIds = [];
  for (const po of pos) {
    const r = await db.execute({
      sql: 'INSERT INTO purchase_orders (supplier_id, warehouse_id, total, notes, expected_date, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: po,
    });
    poIds.push(Number(r.lastInsertRowid));
  }
  console.log('Seeded 5 POs:', poIds);

  // PO items: [po_id, product_id, quantity, unit_cost]
  const poItems = [
    [poIds[0], 1, 10, 2199.00], [poIds[0], 4, 10, 1099.00], [poIds[0], 5, 10, 1099.00], [poIds[0], 2, 5, 749.00],
    [poIds[1], 10, 10, 249.00],
    [poIds[2], 3, 10, 278.00], [poIds[2], 11, 5, 379.00],
    [poIds[3], 6, 3, 1099.00], [poIds[3], 9, 10, 299.00],
    [poIds[4], 3, 15, 269.00], [poIds[4], 11, 10, 369.00], [poIds[4], 9, 5, 289.00],
  ];

  for (const item of poItems) {
    await db.execute({
      sql: 'INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost) VALUES (?, ?, ?, ?)',
      args: item,
    });
  }
  console.log('Seeded PO items');

  process.exit(0);
}
seed().catch(function(e) { console.error(e); process.exit(1); });
