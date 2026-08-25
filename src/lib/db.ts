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
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','mobile','card','bank_transfer','invoice')),
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

    CREATE TABLE IF NOT EXISTS customer_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT,
      default_address TEXT,
      favorites_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restaurant_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT NOT NULL DEFAULT 'Sumaiyyah Fast Food',
      tagline TEXT NOT NULL DEFAULT 'Authentic Swahili Street Food, Hot & Fresh',
      phone TEXT NOT NULL DEFAULT '+255 700 000 000',
      whatsapp TEXT NOT NULL DEFAULT '255700000000',
      address TEXT NOT NULL DEFAULT 'Kariakoo, Dar es Salaam, Tanzania',
      opening_hours TEXT NOT NULL DEFAULT 'Mon–Sun: 8:00 AM – 11:00 PM',
      delivery_enabled INTEGER NOT NULL DEFAULT 1,
      delivery_fee_tsh INTEGER NOT NULL DEFAULT 2500,
      min_order_tsh INTEGER NOT NULL DEFAULT 5000,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed')),
      discount_value INTEGER NOT NULL CHECK(discount_value > 0),
      min_order_tsh INTEGER NOT NULL DEFAULT 0,
      badge TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

    CREATE TABLE IF NOT EXISTS corporate_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      legal_name TEXT,
      account_code TEXT NOT NULL UNIQUE,
      billing_email TEXT NOT NULL,
      billing_phone TEXT NOT NULL,
      tax_id TEXT,
      payment_terms TEXT NOT NULL DEFAULT 'DUE_ON_DELIVERY' CHECK(payment_terms IN ('PREPAID','DUE_ON_DELIVERY','NET_7','NET_14','NET_30')),
      credit_limit_tsh INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED','INACTIVE')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_corp_accounts_code ON corporate_accounts(account_code);

    CREATE TABLE IF NOT EXISTS corporate_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      area TEXT NOT NULL,
      building_name TEXT NOT NULL,
      address TEXT NOT NULL,
      floor TEXT,
      office_number TEXT,
      delivery_instructions TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS corporate_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'order_contact' CHECK(role IN ('order_contact','billing_contact','approver','administrator')),
      is_primary INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS corporate_order_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      corporate_account_id INTEGER REFERENCES corporate_accounts(id),
      corporate_location_id INTEGER REFERENCES corporate_locations(id),
      corporate_contact_id INTEGER REFERENCES corporate_contacts(id),
      guest_company_name TEXT,
      guest_contact_name TEXT,
      guest_contact_phone TEXT,
      guest_contact_email TEXT,
      attendee_count INTEGER NOT NULL DEFAULT 1,
      service_context TEXT NOT NULL DEFAULT 'office_lunch' CHECK(service_context IN ('office_lunch','meeting_event','team_celebration','custom_bulk')),
      delivery_date TEXT NOT NULL,
      delivery_window TEXT NOT NULL,
      delivery_window_start TEXT,
      delivery_window_end TEXT,
      target_dispatch_time TEXT,
      building_name TEXT,
      floor_office TEXT,
      delivery_instructions TEXT,
      po_reference_number TEXT,
      invoice_required INTEGER NOT NULL DEFAULT 0,
      billing_status TEXT NOT NULL DEFAULT 'unbilled' CHECK(billing_status IN ('unbilled','invoiced','paid','waived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_corp_order_date ON corporate_order_details(delivery_date);
    CREATE INDEX IF NOT EXISTS idx_corp_order_account ON corporate_order_details(corporate_account_id);

    CREATE TABLE IF NOT EXISTS corporate_menu_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tagline TEXT,
      description TEXT,
      price_tsh INTEGER NOT NULL CHECK(price_tsh > 0),
      minimum_quantity INTEGER NOT NULL DEFAULT 5,
      serves_people_min INTEGER NOT NULL DEFAULT 5,
      lead_time_hours INTEGER NOT NULL DEFAULT 2,
      badge TEXT,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS corporate_menu_package_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL REFERENCES corporate_menu_packages(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      quantity INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS corporate_order_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      default_location_id INTEGER REFERENCES corporate_locations(id),
      default_attendee_count INTEGER NOT NULL DEFAULT 10,
      created_by_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS corporate_order_template_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL REFERENCES corporate_order_templates(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES menu_items(id),
      package_id INTEGER REFERENCES corporate_menu_packages(id),
      name_snapshot TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      options_snapshot TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id),
      order_id INTEGER REFERENCES orders(id),
      status TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','VOID')),
      subtotal_tsh INTEGER NOT NULL,
      tax_amount_tsh INTEGER NOT NULL DEFAULT 0,
      total_amount_tsh INTEGER NOT NULL,
      amount_paid_tsh INTEGER NOT NULL DEFAULT 0,
      issued_at TEXT NOT NULL DEFAULT (datetime('now')),
      due_date TEXT NOT NULL,
      paid_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_account ON invoices(corporate_account_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

    CREATE TABLE IF NOT EXISTS invoice_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount_tsh INTEGER NOT NULL CHECK(amount_tsh > 0),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('bank_transfer','mobile_money','cash','card','cheque')),
      reference_number TEXT,
      paid_at TEXT NOT NULL DEFAULT (datetime('now')),
      recorded_by INTEGER REFERENCES users(id),
      notes TEXT
    );
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
  if (!menuItemCols.some((c) => c.name === "description")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN description TEXT");
  }
  if (!menuItemCols.some((c) => c.name === "is_featured")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0");
  }
  if (!menuItemCols.some((c) => c.name === "is_deal")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN is_deal INTEGER NOT NULL DEFAULT 0");
  }
  if (!menuItemCols.some((c) => c.name === "prep_time_min")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN prep_time_min INTEGER NOT NULL DEFAULT 15");
  }
  if (!menuItemCols.some((c) => c.name === "calories")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN calories INTEGER NOT NULL DEFAULT 0");
  }
  if (!menuItemCols.some((c) => c.name === "spiciness")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN spiciness TEXT NOT NULL DEFAULT 'Mild'");
  }
  if (!menuItemCols.some((c) => c.name === "dietary_tags")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN dietary_tags TEXT DEFAULT '[]'");
  }
  if (!menuItemCols.some((c) => c.name === "options_json")) {
    db.exec("ALTER TABLE menu_items ADD COLUMN options_json TEXT");
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
  if (!orderCols.some((c) => c.name === "order_type")) {
    db.exec("ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'pos'");
  }
  if (!orderCols.some((c) => c.name === "customer_name")) {
    db.exec("ALTER TABLE orders ADD COLUMN customer_name TEXT");
  }
  if (!orderCols.some((c) => c.name === "customer_phone")) {
    db.exec("ALTER TABLE orders ADD COLUMN customer_phone TEXT");
  }
  if (!orderCols.some((c) => c.name === "customer_address")) {
    db.exec("ALTER TABLE orders ADD COLUMN customer_address TEXT");
  }
  if (!orderCols.some((c) => c.name === "special_notes")) {
    db.exec("ALTER TABLE orders ADD COLUMN special_notes TEXT");
  }
  if (!orderCols.some((c) => c.name === "fulfillment_status")) {
    db.exec("ALTER TABLE orders ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'completed'");
  }
  if (!orderCols.some((c) => c.name === "estimated_delivery_at")) {
    db.exec("ALTER TABLE orders ADD COLUMN estimated_delivery_at TEXT");
  }
  if (!orderCols.some((c) => c.name === "customer_id")) {
    db.exec("ALTER TABLE orders ADD COLUMN customer_id INTEGER");
  }
  if (!orderCols.some((c) => c.name === "order_channel")) {
    db.exec("ALTER TABLE orders ADD COLUMN order_channel TEXT NOT NULL DEFAULT 'pos'");
  }
  if (!orderCols.some((c) => c.name === "is_scheduled")) {
    db.exec("ALTER TABLE orders ADD COLUMN is_scheduled INTEGER NOT NULL DEFAULT 0");
  }
  if (!orderCols.some((c) => c.name === "scheduled_date")) {
    db.exec("ALTER TABLE orders ADD COLUMN scheduled_date TEXT");
  }
  if (!orderCols.some((c) => c.name === "delivery_window_start")) {
    db.exec("ALTER TABLE orders ADD COLUMN delivery_window_start TEXT");
  }
  if (!orderCols.some((c) => c.name === "delivery_window_end")) {
    db.exec("ALTER TABLE orders ADD COLUMN delivery_window_end TEXT");
  }
  if (!orderCols.some((c) => c.name === "target_dispatch_at")) {
    db.exec("ALTER TABLE orders ADD COLUMN target_dispatch_at TEXT");
  }
  if (!orderCols.some((c) => c.name === "company_name")) {
    db.exec("ALTER TABLE orders ADD COLUMN company_name TEXT");
  }
  if (!orderCols.some((c) => c.name === "attendee_count")) {
    db.exec("ALTER TABLE orders ADD COLUMN attendee_count INTEGER");
  }
  if (!orderCols.some((c) => c.name === "corporate_account_id")) {
    db.exec("ALTER TABLE orders ADD COLUMN corporate_account_id INTEGER REFERENCES corporate_accounts(id)");
  }

  // Check if existing orders table has legacy check constraint without invoice
  try {
    const tableSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'").get() as { sql: string } | undefined)?.sql || "";
    if (tableSql && !tableSql.includes("invoice")) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE orders_upgrade_pm (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          receipt_no TEXT NOT NULL UNIQUE,
          cashier_id INTEGER NOT NULL REFERENCES users(id),
          subtotal_tsh INTEGER NOT NULL,
          discount_type TEXT NOT NULL DEFAULT 'none' CHECK(discount_type IN ('none','percent','fixed')),
          discount_value INTEGER NOT NULL DEFAULT 0,
          discount_amount_tsh INTEGER NOT NULL DEFAULT 0,
          total_tsh INTEGER NOT NULL,
          payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','mobile','card','bank_transfer','invoice')),
          status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','voided')),
          voided_at TEXT,
          voided_by INTEGER REFERENCES users(id),
          void_reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          order_type TEXT NOT NULL DEFAULT 'pos',
          customer_name TEXT,
          customer_phone TEXT,
          customer_address TEXT,
          special_notes TEXT,
          fulfillment_status TEXT NOT NULL DEFAULT 'completed',
          estimated_delivery_at TEXT,
          customer_id INTEGER,
          order_channel TEXT NOT NULL DEFAULT 'pos',
          is_scheduled INTEGER NOT NULL DEFAULT 0,
          scheduled_date TEXT,
          delivery_window_start TEXT,
          delivery_window_end TEXT,
          target_dispatch_at TEXT,
          company_name TEXT,
          attendee_count INTEGER,
          corporate_account_id INTEGER REFERENCES corporate_accounts(id)
        );
        INSERT INTO orders_upgrade_pm SELECT 
          id, receipt_no, cashier_id, subtotal_tsh, discount_type, discount_value, discount_amount_tsh, total_tsh,
          payment_method, status, voided_at, voided_by, void_reason, created_at,
          order_type, customer_name, customer_phone, customer_address, special_notes,
          fulfillment_status, estimated_delivery_at, customer_id, order_channel,
          is_scheduled, scheduled_date, delivery_window_start, delivery_window_end, target_dispatch_at,
          company_name, attendee_count, corporate_account_id
        FROM orders;
        DROP TABLE orders;
        ALTER TABLE orders_upgrade_pm RENAME TO orders;
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
        CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(order_channel, fulfillment_status);
        CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON orders(is_scheduled, scheduled_date);
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (e) {
    console.warn("Orders table payment_method check migration note:", e);
  }

  // Create additional lookup indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(order_channel, fulfillment_status);
    CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON orders(is_scheduled, scheduled_date);
  `);

  const orderItemCols = db.prepare("PRAGMA table_info(order_items)").all() as { name: string }[];
  if (!orderItemCols.some((c) => c.name === "options_snapshot")) {
    db.exec("ALTER TABLE order_items ADD COLUMN options_snapshot TEXT");
  }
  if (!orderItemCols.some((c) => c.name === "notes")) {
    db.exec("ALTER TABLE order_items ADD COLUMN notes TEXT");
  }

  seed(db);
  seedSettingsAndPromos(db);
  enrichMenuItems(db);
  seedCorporateData(db);
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function seedSettingsAndPromos(db: Database.Database) {
  const settingsCount = db.prepare("SELECT COUNT(*) as n FROM restaurant_settings").get() as { n: number };
  if (settingsCount.n === 0) {
    db.prepare(`
      INSERT INTO restaurant_settings (id, name, tagline, phone, whatsapp, address, opening_hours, delivery_enabled, delivery_fee_tsh, min_order_tsh)
      VALUES (1, 'Sumaiyyah Fast Food', 'Authentic Swahili Street Food, Hot & Fresh', '+255 700 000 000', '255700000000', 'Kariakoo, Dar es Salaam, Tanzania', 'Mon–Sun: 8:00 AM – 11:00 PM', 1, 2500, 5000)
    `).run();
  }

  // In production, promotions are managed exclusively by authorized managers; do not auto-seed demo vouchers.
  if (isProduction()) {
    return;
  }

  const promoCount = db.prepare("SELECT COUNT(*) as n FROM promotions").get() as { n: number };
  if (promoCount.n === 0) {
    const defaultPromos = [
      {
        code: "KARIBU10",
        title: "Karibu Welcome Discount",
        description: "Get 10% off your first online order",
        discount_type: "percent",
        discount_value: 10,
        min_order_tsh: 10000,
        badge: "10% OFF",
      },
      {
        code: "BONGO5K",
        title: "Dar City Feast Deal",
        description: "Save TZS 5,000 on family orders over TZS 30,000",
        discount_type: "fixed",
        discount_value: 5000,
        min_order_tsh: 30000,
        badge: "TZS 5,000 OFF",
      },
      {
        code: "SUMAIYYAHVIP",
        title: "VIP Weekend Crave",
        description: "Enjoy 15% discount on all burger and combo platters",
        discount_type: "percent",
        discount_value: 15,
        min_order_tsh: 20000,
        badge: "VIP 15%",
      },
    ];
    for (const p of defaultPromos) {
      db.prepare(`
        INSERT OR IGNORE INTO promotions (code, title, description, discount_type, discount_value, min_order_tsh, badge, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(p.code, p.title, p.description, p.discount_type, p.discount_value, p.min_order_tsh, p.badge);
    }
  }
}

function enrichMenuItems(db: Database.Database) {
  // Update existing menu items with rich descriptions, dietary tags, customization variants and addons
  const items = db.prepare("SELECT id, name FROM menu_items WHERE description IS NULL OR description = ''").all() as { id: number; name: string }[];
  if (items.length === 0) return;

  const metadataMap: Record<string, {
    description: string;
    is_featured: number;
    is_deal: number;
    prep_time_min: number;
    calories: number;
    spiciness: string;
    dietary_tags: string[];
    options: {
      variants?: { name: string; price_diff: number }[];
      addons?: { name: string; price: number }[];
    };
  }> = {
    "Classic Burger": {
      description: "Char-grilled 100% prime beef patty, melted cheddar, crisp lettuce, ripe tomatoes, and signature house burger relish on a toasted brioche bun.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 12,
      calories: 580,
      spiciness: "Mild",
      dietary_tags: ["Halal", "Popular", "Signature"],
      options: {
        variants: [
          { name: "Single Patty (Regular)", price_diff: 0 },
          { name: "Double Patty (+TZS 3,500)", price_diff: 3500 },
        ],
        addons: [
          { name: "Extra Melted Cheddar", price: 1500 },
          { name: "Crispy Beef Bacon", price: 2000 },
          { name: "Fried Farm Egg", price: 1000 },
          { name: "Extra House Sauce", price: 1000 },
          { name: "Pickled Jalapeños", price: 1000 },
        ],
      },
    },
    "Spicy Chicken Burger": {
      description: "Buttermilk marinated crispy chicken breast dunked in Swahili chili glaze, topped with tangy red cabbage slaw and chipotle mayo.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 620,
      spiciness: "Spicy",
      dietary_tags: ["Halal", "Hot & Spicy", "Chef Pick"],
      options: {
        variants: [
          { name: "Crispy Fried Chicken", price_diff: 0 },
          { name: "Flame Grilled Chicken", price_diff: 500 },
        ],
        addons: [
          { name: "Extra Chili Glaze", price: 1000 },
          { name: "Pepper Jack Cheese", price: 1500 },
          { name: "Pickled Jalapeños", price: 1000 },
          { name: "Extra Slaw", price: 1000 },
        ],
      },
    },
    "Double Beef Burger": {
      description: "Two 150g beef patties smashed with caramelized onions, double cheddar, pickles, and smoky barbecue aioli on a glossy sesame bun.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 14,
      calories: 840,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Heavyweight", "Best Seller"],
      options: {
        variants: [
          { name: "Double Beef (Standard)", price_diff: 0 },
          { name: "Triple Beef Monster (+TZS 4,500)", price_diff: 4500 },
        ],
        addons: [
          { name: "Extra Melted Cheddar", price: 1500 },
          { name: "Fried Farm Egg", price: 1000 },
          { name: "Caramelized Onions", price: 1000 },
          { name: "Smoky BBQ Sauce", price: 1000 },
        ],
      },
    },
    "French Fries": {
      description: "Crisp hand-cut Tanzanian potatoes tossed in rosemary sea salt and paprika seasoning.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 8,
      calories: 340,
      spiciness: "Mild",
      dietary_tags: ["Vegetarian", "Vegan", "Gluten-Free"],
      options: {
        variants: [
          { name: "Regular Portion", price_diff: 0 },
          { name: "Large / Jumbo (+TZS 2,000)", price_diff: 2000 },
        ],
        addons: [
          { name: "Loaded Cheese Sauce", price: 1500 },
          { name: "Pili Pili Seasoning", price: 500 },
          { name: "Garlic Mayo Dip", price: 1000 },
        ],
      },
    },
    "Coleslaw": {
      description: "Freshly shredded green & purple cabbage, crisp carrots, and raisins folded in creamy tangy house dressing.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 5,
      calories: 180,
      spiciness: "Mild",
      dietary_tags: ["Vegetarian", "Healthy"],
      options: {
        addons: [
          { name: "Extra Dressing", price: 500 },
        ],
      },
    },
    "Onion Rings": {
      description: "Thick-cut sweet onion slices double-dipped in seasoned batter and fried till golden and shatteringly crunchy.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 9,
      calories: 380,
      spiciness: "Mild",
      dietary_tags: ["Vegetarian", "Crispy"],
      options: {
        addons: [
          { name: "Sweet Chili Sauce", price: 1000 },
          { name: "Garlic Herb Dip", price: 1000 },
        ],
      },
    },
    "Coca-Cola": {
      description: "Chilled classic Coca-Cola served ice-cold with fresh lime slice upon request.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 2,
      calories: 140,
      spiciness: "Mild",
      dietary_tags: ["Refreshing"],
      options: {
        variants: [
          { name: "Can 330ml", price_diff: 0 },
          { name: "Bottle 500ml (+TZS 500)", price_diff: 500 },
        ],
      },
    },
    "Mango Juice": {
      description: "Freshly blended ripe coastal mango nectar with a hint of passion and crushed ice.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 4,
      calories: 190,
      spiciness: "Mild",
      dietary_tags: ["100% Fresh", "No Added Sugar", "Vegetarian"],
      options: {
        variants: [
          { name: "Standard 400ml", price_diff: 0 },
          { name: "Large 600ml (+TZS 1,500)", price_diff: 1500 },
        ],
      },
    },
    "Water": {
      description: "Pure natural spring mineral water, purified and chilled.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 0,
      spiciness: "Mild",
      dietary_tags: ["Zero Calorie"],
      options: {},
    },
    "Burger + Fries Combo": {
      description: "Classic Burger paired with golden crispy fries and an ice-cold soft drink of your choice.",
      is_featured: 1,
      is_deal: 1,
      prep_time_min: 14,
      calories: 920,
      spiciness: "Mild",
      dietary_tags: ["Halal", "Value Combo", "Best Deal"],
      options: {
        variants: [
          { name: "Classic Beef Combo", price_diff: 0 },
          { name: "Spicy Chicken Combo (+TZS 1,500)", price_diff: 1500 },
          { name: "Double Beef Combo (+TZS 3,500)", price_diff: 3500 },
        ],
        addons: [
          { name: "Upgrade to Large Fries", price: 1500 },
          { name: "Extra Cheese on Burger", price: 1500 },
          { name: "Add Coleslaw Side", price: 2000 },
        ],
      },
    },
    "Family Meal Deal": {
      description: "Huge feast: 2 Classic Burgers, 2 Crispy Chicken Burgers, 3 Large Fries, 4 Soft Drinks, and a jumbo tub of coleslaw.",
      is_featured: 1,
      is_deal: 1,
      prep_time_min: 20,
      calories: 2400,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Feast for 4-5", "Mega Savings"],
      options: {
        variants: [
          { name: "Standard Family Box (4 Burgers + 3 Fries + 4 Drinks)", price_diff: 0 },
          { name: "Deluxe Feast (+ Double Patties & Extra Wings) (+TZS 12,000)", price_diff: 12000 },
        ],
        addons: [
          { name: "Add Onion Rings Platter", price: 3500 },
          { name: "Add 4 Fresh Juices Upgrade", price: 4000 },
        ],
      },
    },
  };

  const updateStmt = db.prepare(`
    UPDATE menu_items 
    SET description = ?, is_featured = ?, is_deal = ?, prep_time_min = ?, calories = ?, spiciness = ?, dietary_tags = ?, options_json = ?
    WHERE id = ?
  `);

  for (const item of items) {
    const meta = metadataMap[item.name] || {
      description: `Fresh, piping hot ${item.name} prepared to order with premium ingredients.`,
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 10,
      calories: 300,
      spiciness: "Mild",
      dietary_tags: ["Halal"],
      options: {},
    };

    updateStmt.run(
      meta.description,
      meta.is_featured,
      meta.is_deal,
      meta.prep_time_min,
      meta.calories,
      meta.spiciness,
      JSON.stringify(meta.dietary_tags),
      JSON.stringify(meta.options),
      item.id
    );
  }
}

function seedMenuCategoriesAndItems(db: Database.Database) {
  const existingCats = db.prepare("SELECT COUNT(*) as n FROM categories").get() as { n: number };
  if (existingCats.n > 0) return;

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

function seed(db: Database.Database) {
  const existing = db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number };
  if (existing.n === 0) {
    if (isProduction()) {
      // Production mode: never create known test accounts.
      // Use environment variables for secure initial manager bootstrap.
      const initEmail = process.env.INITIAL_MANAGER_EMAIL?.trim();
      const initPassword = process.env.INITIAL_MANAGER_PASSWORD;
      const initName = process.env.INITIAL_MANAGER_NAME?.trim() || "Operations Manager";

      if (initEmail && initPassword && initPassword.length >= 8) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(initEmail)) {
          const managerHash = bcrypt.hashSync(initPassword, 10);
          db.prepare(
            `INSERT INTO users (email, name, password_hash, role, active) VALUES (?, ?, ?, 'manager', 1)`
          ).run(initEmail, initName, managerHash);
          console.log(`[bootstrap] Initial production manager account provisioned for ${initEmail}`);
        } else {
          console.warn(`[bootstrap] INITIAL_MANAGER_EMAIL is not a valid email address.`);
        }
      } else {
        console.warn(
          `[bootstrap] Production database initialized with 0 users. Provide INITIAL_MANAGER_EMAIL and INITIAL_MANAGER_PASSWORD (min 8 characters) to provision the initial manager.`
        );
      }
    } else {
      // Development & Automated Test mode: seed standard dev accounts
      const managerHash = bcrypt.hashSync("Manager123!", 10);
      const cashierHash = bcrypt.hashSync("Cashier123!", 10);

      db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)`).run(
        "manager@sumaiyyah.test", "Admin Manager", managerHash, "manager"
      );
      db.prepare(`INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)`).run(
        "cashier@sumaiyyah.test", "Default Cashier", cashierHash, "cashier"
      );
    }
  }

  // Seed restaurant menu items if empty
  seedMenuCategoriesAndItems(db);
}

function seedCorporateData(db: Database.Database) {
  // Only seed demo corporate accounts and templates in development/test environments
  if (!isProduction()) {
    const accountsCount = db.prepare("SELECT COUNT(*) as n FROM corporate_accounts").get() as { n: number };
    if (accountsCount.n === 0) {
      const acc1 = db.prepare(`
        INSERT INTO corporate_accounts (company_name, legal_name, account_code, billing_email, billing_phone, tax_id, payment_terms, credit_limit_tsh, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
      `).run(
        "Vodacom Tanzania PLC",
        "Vodacom Tanzania Public Limited Company",
        "VODA-HQ",
        "procurement@vodacom.co.tz",
        "+255 754 000 111",
        "100-245-890",
        "NET_30",
        5000000,
        "Key enterprise account. Regular Friday team lunches & executive meetings."
      );
      const acc1Id = acc1.lastInsertRowid as number;

      db.prepare(`
        INSERT INTO corporate_locations (corporate_account_id, label, area, building_name, address, floor, office_number, delivery_instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        acc1Id,
        "Vodacom Tower (Headquarters)",
        "Mlimani / Ubungo",
        "Vodacom Tower",
        "Sam Nujoma Rd, Dar es Salaam",
        "7th Floor",
        "Executive & Tech Hub",
        "Check in at Gate 2 security. Security will phone receptionist on 7th floor."
      );

      db.prepare(`
        INSERT INTO corporate_locations (corporate_account_id, label, area, building_name, address, floor, office_number, delivery_instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        acc1Id,
        "Vodacom Innovation Lab",
        "Masaki / Oysterbay",
        "Peninsula Plaza",
        "Toure Drive, Masaki",
        "3rd Floor",
        "Innovation Suite 302",
        "Drop off at 3rd Floor tech hub entrance."
      );

      db.prepare(`
        INSERT INTO corporate_contacts (corporate_account_id, full_name, email, phone, role, is_primary)
        VALUES (?, ?, ?, ?, 'administrator', 1)
      `).run(acc1Id, "Amina Juma", "amina.j@vodacom.co.tz", "+255 754 112 233");

      db.prepare(`
        INSERT INTO corporate_contacts (corporate_account_id, full_name, email, phone, role, is_primary)
        VALUES (?, ?, ?, ?, 'order_contact', 0)
      `).run(acc1Id, "David Mwakipesile", "david.m@vodacom.co.tz", "+255 754 445 566");

      const acc2 = db.prepare(`
        INSERT INTO corporate_accounts (company_name, legal_name, account_code, billing_email, billing_phone, tax_id, payment_terms, credit_limit_tsh, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
      `).run(
        "CRDB Bank Towers",
        "CRDB Bank PLC",
        "CRDB-HQ",
        "admin.meals@crdbbank.co.tz",
        "+255 713 000 222",
        "102-554-321",
        "NET_14",
        3500000,
        "Corporate branch lunch supplier. Board meetings and staff training events."
      );
      const acc2Id = acc2.lastInsertRowid as number;

      db.prepare(`
        INSERT INTO corporate_locations (corporate_account_id, label, area, building_name, address, floor, office_number, delivery_instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        acc2Id,
        "CRDB Head Office Tower",
        "Posta / CBD",
        "CRDB HQ Tower",
        "Azikiwe Street, Posta",
        "12th Floor",
        "Executive Boardroom Suite",
        "Deliver through Posta entrance cargo lift, security badge required."
      );

      db.prepare(`
        INSERT INTO corporate_contacts (corporate_account_id, full_name, email, phone, role, is_primary)
        VALUES (?, ?, ?, ?, 'order_contact', 1)
      `).run(acc2Id, "Baraka Mwangi", "baraka.m@crdbbank.co.tz", "+255 713 998 877");

      const acc3 = db.prepare(`
        INSERT INTO corporate_accounts (company_name, legal_name, account_code, billing_email, billing_phone, tax_id, payment_terms, credit_limit_tsh, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
      `).run(
        "Swahili Tech Labs",
        "Swahili Tech Labs Ltd",
        "SW-TECH",
        "ops@swahilitech.co.tz",
        "+255 784 555 666",
        "119-998-223",
        "DUE_ON_DELIVERY",
        1500000,
        "Startup studio. Bi-weekly demo day catering."
      );
      const acc3Id = acc3.lastInsertRowid as number;

      db.prepare(`
        INSERT INTO corporate_locations (corporate_account_id, label, area, building_name, address, floor, office_number, delivery_instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        acc3Id,
        "Tech Hub Studio",
        "Mikocheni",
        "Silicon Dar Building",
        "Old Bagamoyo Rd, Mikocheni",
        "2nd Floor",
        "Suite 204",
        "Ring bell at reception."
      );

      db.prepare(`
        INSERT INTO corporate_contacts (corporate_account_id, full_name, email, phone, role, is_primary)
        VALUES (?, ?, ?, ?, 'administrator', 1)
      `).run(acc3Id, "Zuhura Salum", "zuhura@swahilitech.co.tz", "+255 784 555 666");
    }
  }

  // Seed Corporate Menu Packages (Product Offerings) in all environments if none exist
  const pkgCount = db.prepare("SELECT COUNT(*) as n FROM corporate_menu_packages").get() as { n: number };
  if (pkgCount.n === 0) {
    const burgerItem = db.prepare("SELECT id FROM menu_items WHERE name = 'Classic Burger'").get() as { id: number } | undefined;
    const spicyBurgerItem = db.prepare("SELECT id FROM menu_items WHERE name = 'Spicy Chicken Burger'").get() as { id: number } | undefined;
    const doubleBurgerItem = db.prepare("SELECT id FROM menu_items WHERE name = 'Double Beef Burger'").get() as { id: number } | undefined;
    const friesItem = db.prepare("SELECT id FROM menu_items WHERE name = 'French Fries'").get() as { id: number } | undefined;
    const slawItem = db.prepare("SELECT id FROM menu_items WHERE name = 'Coleslaw'").get() as { id: number } | undefined;
    const ringsItem = db.prepare("SELECT id FROM menu_items WHERE name = 'Onion Rings'").get() as { id: number } | undefined;
    const cokeItem = db.prepare("SELECT id FROM menu_items WHERE name = 'Coca-Cola'").get() as { id: number } | undefined;
    const juiceItem = db.prepare("SELECT id FROM menu_items WHERE name = 'Mango Juice'").get() as { id: number } | undefined;

    // Package 1: Individual Executive Lunch Box
    const p1 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      "Individual Executive Lunch Box",
      "Complete curated meal box per attendee",
      "Each box includes 1 Prime Burger of choice (Classic Beef or Crispy Chicken), 1 portion Hot Crispy Fries, 1 Fresh Coleslaw, and 1 Chilled Beverage with cutlery & serviette.",
      14500,
      5,
      5,
      2,
      "Most Popular"
    );
    const p1Id = p1.lastInsertRowid as number;
    if (burgerItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(p1Id, burgerItem.id);
    if (friesItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(p1Id, friesItem.id);
    if (slawItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(p1Id, slawItem.id);
    if (cokeItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(p1Id, cokeItem.id);

    // Package 2: Team Lunch Feast (Serves 10)
    const p2 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2)
    `).run(
      "Team Burger Feast (Serves 10)",
      "Office group sharing banquet",
      "Includes 10 Assorted Char-Grilled Burgers (6 Classic Beef, 4 Crispy Spicy Chicken), 5 Jumbo Fries Trays, 10 Chilled Soft Drinks, and 4 Signature Dip Sauces.",
      120000,
      1,
      10,
      2,
      "Team Value"
    );
    const p2Id = p2.lastInsertRowid as number;
    if (burgerItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 6)").run(p2Id, burgerItem.id);
    if (spicyBurgerItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p2Id, spicyBurgerItem.id);
    if (friesItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 5)").run(p2Id, friesItem.id);
    if (cokeItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 10)").run(p2Id, cokeItem.id);

    // Package 3: Boardroom Mixed Platter (Serves 8-10)
    const p3 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3)
    `).run(
      "Boardroom VIP Mixed Platter (Serves 8–10)",
      "Premium meeting & executive catering",
      "Includes 8 Double Beef & Crispy Chicken Sliders, 3 Large Fries Trays, 2 Golden Onion Rings Platters, 2 Coleslaw Bowls, and 8 Coastal Mango Juices.",
      115000,
      1,
      8,
      3,
      "Executive Choice"
    );
    const p3Id = p3.lastInsertRowid as number;
    if (doubleBurgerItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p3Id, doubleBurgerItem.id);
    if (spicyBurgerItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p3Id, spicyBurgerItem.id);
    if (friesItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 3)").run(p3Id, friesItem.id);
    if (ringsItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 2)").run(p3Id, ringsItem.id);
    if (juiceItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 8)").run(p3Id, juiceItem.id);

    // Package 4: Bulk Office Sides Tray
    const p4 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4)
    `).run(
      "Bulk Sides & Appetizer Sharing Tray",
      "Finger-food supplement for meetings & workshops",
      "Includes 4 Large Hand-Cut Fries, 4 Crunchy Onion Rings, 4 Fresh Coleslaw Bowls, and 6 Assorted House Dips.",
      42000,
      1,
      6,
      1,
      "Sides Bundle"
    );
    const p4Id = p4.lastInsertRowid as number;
    if (friesItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p4Id, friesItem.id);
    if (ringsItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p4Id, ringsItem.id);
    if (slawItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p4Id, slawItem.id);

    // Package 5: Chilled Drink Crate (12 Drinks)
    const p5 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 5)
    `).run(
      "Chilled Refreshment Crate (Pack of 12)",
      "Assorted sodas & fresh coastal juices",
      "Includes 6 Fresh Mango Juices and 6 Classic Coca-Colas, iced and insulated for office delivery.",
      24000,
      1,
      12,
      1,
      "Drinks Pack"
    );
    const p5Id = p5.lastInsertRowid as number;
    if (juiceItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 6)").run(p5Id, juiceItem.id);
    if (cokeItem) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 6)").run(p5Id, cokeItem.id);
  }

  // Seed Sample Order Templates (Development/Test only)
  if (!isProduction()) {
    const templateCount = db.prepare("SELECT COUNT(*) as n FROM corporate_order_templates").get() as { n: number };
    if (templateCount.n === 0) {
      const vodaAccount = db.prepare("SELECT id FROM corporate_accounts WHERE account_code = 'VODA-HQ'").get() as { id: number } | undefined;
      const vodaLocation = db.prepare("SELECT id FROM corporate_locations WHERE corporate_account_id = ?").get(vodaAccount?.id) as { id: number } | undefined;
      const pkg1 = db.prepare("SELECT id, name FROM corporate_menu_packages WHERE name LIKE '%Executive%'").get() as { id: number; name: string } | undefined;

      if (vodaAccount && pkg1) {
        const t1 = db.prepare(`
          INSERT INTO corporate_order_templates (corporate_account_id, name, default_location_id, default_attendee_count, created_by_name)
          VALUES (?, 'Friday Engineering All-Hands Lunch', ?, 15, 'Amina Juma')
        `).run(vodaAccount.id, vodaLocation?.id || null);
        const t1Id = t1.lastInsertRowid as number;

        db.prepare(`
          INSERT INTO corporate_order_template_items (template_id, package_id, name_snapshot, quantity)
          VALUES (?, ?, ?, 15)
        `).run(t1Id, pkg1.id, pkg1.name);
      }
    }
  }
}

export default getDb;

