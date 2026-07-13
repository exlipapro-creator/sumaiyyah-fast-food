import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DROIDBOT_DB_PATH ?? path.join(process.cwd(), "data", "app.db");

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = openDb();
  return _db;
}

function openDb(): Database.Database {
  try {
    const db = new Database(DB_PATH);
    db.pragma("busy_timeout = 5000");
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
    return db;
  } catch (err) {
    // If the DB has a corrupted WAL/SHM (e.g. from an unclean shutdown or a
    // previous process having left stale shared-memory files), attempt recovery
    // by removing the -shm file and retrying. The WAL data is not lost; SQLite
    // will reconstruct the shared-memory index from the WAL on re-open.
    const shmPath = DB_PATH + "-shm";
    if (fs.existsSync(shmPath)) {
      console.warn("[db] Opening DB failed; removing stale -shm and retrying:", (err as Error).message);
      try { fs.unlinkSync(shmPath); } catch {}
      const db = new Database(DB_PATH);
      db.pragma("busy_timeout = 5000");
      db.pragma("journal_mode = WAL");
      db.pragma("foreign_keys = ON");
      initSchema(db);
      return db;
    }
    throw err;
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('cashier','manager')),
      active INTEGER NOT NULL DEFAULT 1,
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      price_tsh INTEGER NOT NULL CHECK(price_tsh >= 0),
      image_url TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      deleted INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      track_stock INTEGER NOT NULL DEFAULT 0,
      stock_qty INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT NOT NULL UNIQUE,
      cashier_id INTEGER NOT NULL REFERENCES users(id),
      subtotal_tsh INTEGER NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'none' CHECK(discount_type IN ('none','percent','fixed')),
      discount_value INTEGER NOT NULL DEFAULT 0,
      discount_amount_tsh INTEGER NOT NULL DEFAULT 0,
      total_tsh INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','mobile','card')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','voided')),
      voided_at TEXT,
      voided_by INTEGER REFERENCES users(id),
      void_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      name_snapshot TEXT NOT NULL,
      unit_price_tsh INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      line_total_tsh INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_name TEXT NOT NULL,
      amount_tsh INTEGER NOT NULL CHECK(amount_tsh > 0),
      paid_on TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('produce','packaging','utilities','other')),
      notes TEXT,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_paid_on ON supplier_payments(paid_on);

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
  `);

  // Migrate existing databases that predate later columns/tables.
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some((c) => c.name === "token_version")) {
    db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
  }

  const menuItemCols = db.prepare("PRAGMA table_info(menu_items)").all() as { name: string }[];
  if (!menuItemCols.some((c) => c.name === "track_stock")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN track_stock INTEGER NOT NULL DEFAULT 0");
  }
  if (!menuItemCols.some((c) => c.name === "stock_qty")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN stock_qty INTEGER NOT NULL DEFAULT 0");
  }

  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderCols.some((c) => c.name === "status")) {
    db.exec("ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'");
  }
  if (!orderCols.some((c) => c.name === "voided_at")) {
    db.exec("ALTER TABLE orders ADD COLUMN voided_at TEXT");
  }
  if (!orderCols.some((c) => c.name === "voided_by")) {
    db.exec("ALTER TABLE orders ADD COLUMN voided_by INTEGER REFERENCES users(id)");
  }
  if (!orderCols.some((c) => c.name === "void_reason")) {
    db.exec("ALTER TABLE orders ADD COLUMN void_reason TEXT");
  }

  seed(db);
}

function seed(db: Database.Database) {
  const existing = db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number };
  if (existing.n > 0) return;

  const managerHash = bcrypt.hashSync("Manager123!", 10);
  const cashierHash = bcrypt.hashSync("Cashier123!", 10);

  db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)`).run(
    "manager@sumaiyyah.test", "Admin Manager", managerHash, "manager"
  );
  db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)`).run(
    "cashier@sumaiyyah.test", "Default Cashier", cashierHash, "cashier"
  );

  const cats = [
    { name: "Burgers", sort_order: 1 },
    { name: "Sides", sort_order: 2 },
    { name: "Drinks", sort_order: 3 },
    { name: "Specials", sort_order: 4 },
  ];
  const catIds: number[] = [];
  for (const cat of cats) {
    const r = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(cat.name, cat.sort_order);
    catIds.push(r.lastInsertRowid as number);
  }

  const items = [
    { category_id: catIds[0], name: "Classic Burger", price_tsh: 8500, sort_order: 1 },
    { category_id: catIds[0], name: "Spicy Chicken Burger", price_tsh: 9500, sort_order: 2 },
    { category_id: catIds[0], name: "Double Beef Burger", price_tsh: 12000, sort_order: 3 },
    { category_id: catIds[1], name: "French Fries", price_tsh: 3500, sort_order: 1 },
    { category_id: catIds[1], name: "Coleslaw", price_tsh: 2500, sort_order: 2 },
    { category_id: catIds[1], name: "Onion Rings", price_tsh: 4000, sort_order: 3 },
    { category_id: catIds[2], name: "Coca-Cola", price_tsh: 2000, sort_order: 1 },
    { category_id: catIds[2], name: "Mango Juice", price_tsh: 2500, sort_order: 2 },
    { category_id: catIds[2], name: "Water", price_tsh: 1000, sort_order: 3 },
    { category_id: catIds[3], name: "Burger + Fries Combo", price_tsh: 11000, sort_order: 1 },
    { category_id: catIds[3], name: "Family Meal Deal", price_tsh: 35000, sort_order: 2 },
  ];

  for (const item of items) {
    db.prepare("INSERT INTO menu_items (category_id, name, price_tsh, sort_order) VALUES (?, ?, ?, ?)").run(
      item.category_id, item.name, item.price_tsh, item.sort_order
    );
  }
}

export default getDb;
