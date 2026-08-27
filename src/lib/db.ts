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
      tagline TEXT NOT NULL DEFAULT 'Fresh, Hearty Fast Food & Char-Grill, Hot to Your Door',
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

    CREATE TABLE IF NOT EXISTS ad_placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      dimensions TEXT NOT NULL,
      location_description TEXT,
      daily_price_tsh INTEGER NOT NULL DEFAULT 15000,
      weekly_price_tsh INTEGER NOT NULL DEFAULT 85000,
      monthly_price_tsh INTEGER NOT NULL DEFAULT 300000,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ad_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement_key TEXT NOT NULL REFERENCES ad_placements(slot_key),
      sponsor_name TEXT NOT NULL,
      sponsor_email TEXT NOT NULL,
      sponsor_phone TEXT NOT NULL,
      banner_image_url TEXT NOT NULL,
      destination_url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT 'Sponsored Partner',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','PAUSED','REJECTED','EXPIRED')),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      amount_paid_tsh INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID','PAID','REFUNDED')),
      payment_reference TEXT,
      impressions_count INTEGER NOT NULL DEFAULT 0,
      clicks_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_ad_campaigns_placement ON ad_campaigns(placement_key);

    CREATE TABLE IF NOT EXISTS store_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      is_manual_override INTEGER NOT NULL DEFAULT 0,
      manual_status TEXT NOT NULL DEFAULT 'OPEN' CHECK(manual_status IN ('OPEN', 'CLOSED')),
      opening_time TEXT NOT NULL DEFAULT '08:00:00',
      closing_time TEXT NOT NULL DEFAULT '23:00:00',
      timezone TEXT NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
      default_fallback_text TEXT NOT NULL DEFAULT 'Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CONSTRAINT single_row CHECK (id = 1)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      highlight TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 1,
      start_time TEXT,
      end_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by INTEGER REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, priority);
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

  const settingsCols = db.prepare("PRAGMA table_info(restaurant_settings)").all() as { name: string }[];
  if (!settingsCols.some((c) => c.name === "promotions_enabled")) {
    db.exec("ALTER TABLE restaurant_settings ADD COLUMN promotions_enabled INTEGER NOT NULL DEFAULT 0");
  }
  if (!settingsCols.some((c) => c.name === "adsense_enabled")) {
    db.exec("ALTER TABLE restaurant_settings ADD COLUMN adsense_enabled INTEGER NOT NULL DEFAULT 0");
  }
  if (!settingsCols.some((c) => c.name === "adsense_client_id")) {
    db.exec("ALTER TABLE restaurant_settings ADD COLUMN adsense_client_id TEXT NOT NULL DEFAULT ''");
  }
  if (!settingsCols.some((c) => c.name === "adsense_slot_top")) {
    db.exec("ALTER TABLE restaurant_settings ADD COLUMN adsense_slot_top TEXT NOT NULL DEFAULT ''");
  }
  if (!settingsCols.some((c) => c.name === "adsense_slot_infeed")) {
    db.exec("ALTER TABLE restaurant_settings ADD COLUMN adsense_slot_infeed TEXT NOT NULL DEFAULT ''");
  }
  if (!settingsCols.some((c) => c.name === "adsense_slot_sidebar")) {
    db.exec("ALTER TABLE restaurant_settings ADD COLUMN adsense_slot_sidebar TEXT NOT NULL DEFAULT ''");
  }
  if (!settingsCols.some((c) => c.name === "direct_ads_enabled")) {
    db.exec("ALTER TABLE restaurant_settings ADD COLUMN direct_ads_enabled INTEGER NOT NULL DEFAULT 1");
  }

  seed(db);
  seedSettingsAndPromos(db);
  seedAdPlacements(db);
  seedStoreHoursAndAnnouncements(db);
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
      INSERT INTO restaurant_settings (id, name, tagline, phone, whatsapp, address, opening_hours, delivery_enabled, delivery_fee_tsh, min_order_tsh, promotions_enabled, adsense_enabled, direct_ads_enabled)
      VALUES (1, 'Sumaiyyah Fast Food', 'Fresh, Hearty Fast Food & Char-Grill, Hot to Your Door', '+255 700 000 000', '255700000000', 'Kariakoo, Dar es Salaam, Tanzania', 'Mon–Sun: 8:00 AM – 11:00 PM', 1, 2500, 5000, 0, 0, 1)
    `).run();
  }

  // Deactivate any legacy mock promo codes so the public app starts with 0 active mock promotions.
  // Promotions are disabled by default until manager configures and toggles promotions on.
  db.exec("UPDATE promotions SET active = 0 WHERE active = 1");
}

function seedAdPlacements(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as n FROM ad_placements").get() as { n: number };
  if (count.n === 0) {
    const placements = [
      {
        slot_key: "home_hero_top",
        name: "Home Header Leaderboard Banner",
        dimensions: "728x90 (Desktop) / 320x50 (Mobile)",
        location_description: "Prominent top placement right above customer culinary categories",
        daily_price_tsh: 20000,
        weekly_price_tsh: 120000,
        monthly_price_tsh: 450000,
      },
      {
        slot_key: "menu_infeed",
        name: "Menu In-Feed Native Card",
        dimensions: "Responsive Native Card / 300x250",
        location_description: "Seamlessly integrated between menu categories on active order screen",
        daily_price_tsh: 15000,
        weekly_price_tsh: 90000,
        monthly_price_tsh: 320000,
      },
      {
        slot_key: "order_confirmation",
        name: "Order Tracking Live Screen Banner",
        dimensions: "Fluid 728x90 / 468x60 Banner",
        location_description: "High dwell-time slot viewed by customers tracking live food prep and rider dispatch",
        daily_price_tsh: 18000,
        weekly_price_tsh: 100000,
        monthly_price_tsh: 380000,
      },
      {
        slot_key: "deals_top",
        name: "Deals & Combos Showcase Banner",
        dimensions: "728x90 / Responsive",
        location_description: "Displayed atop the deals and value combos page",
        daily_price_tsh: 12000,
        weekly_price_tsh: 70000,
        monthly_price_tsh: 250000,
      },
    ];

    const insert = db.prepare(`
      INSERT OR IGNORE INTO ad_placements (slot_key, name, dimensions, location_description, daily_price_tsh, weekly_price_tsh, monthly_price_tsh, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    for (const p of placements) {
      insert.run(p.slot_key, p.name, p.dimensions, p.location_description, p.daily_price_tsh, p.weekly_price_tsh, p.monthly_price_tsh);
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

function syncSwahiliMenu(db: Database.Database) {
  // Normalize any previous verbose category names
  try {
    db.exec(`
      UPDATE categories SET name = 'Milo Mikuu' WHERE name LIKE 'Milo Mikuu%';
      UPDATE categories SET name = 'Chipsi & Mshikaki' WHERE name LIKE 'Chipsi & Mshikaki%';
      UPDATE categories SET name = 'Vinywaji Baridi' WHERE name LIKE 'Vinywaji Baridi%';
      UPDATE categories SET name = 'Juisi & Matunda' WHERE name LIKE 'Juisi & Matunda%';
    `);
  } catch {}

  // Ensure the 4 primary Swahili categories exist with clean, concise names
  const requiredCategories = [
    { name: "Milo Mikuu", sort_order: 1 },
    { name: "Chipsi & Mshikaki", sort_order: 2 },
    { name: "Vinywaji Baridi", sort_order: 3 },
    { name: "Juisi & Matunda", sort_order: 4 },
  ];

  for (const cat of requiredCategories) {
    const existing = db.prepare("SELECT id FROM categories WHERE name = ?").get(cat.name) as { id: number } | undefined;
    if (!existing) {
      db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(cat.name, cat.sort_order);
    } else {
      db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").run(cat.sort_order, existing.id);
    }
  }

  const catMilo = (db.prepare("SELECT id FROM categories WHERE name = ?").get(requiredCategories[0].name) as { id: number }).id;
  const catChips = (db.prepare("SELECT id FROM categories WHERE name = ?").get(requiredCategories[1].name) as { id: number }).id;
  const catDrinks = (db.prepare("SELECT id FROM categories WHERE name = ?").get(requiredCategories[2].name) as { id: number }).id;
  const catJuice = (db.prepare("SELECT id FROM categories WHERE name = ?").get(requiredCategories[3].name) as { id: number }).id;

  // The 23 authentic restaurant menu items
  const menuItemsData = [
    // 1-8: Milo Mikuu
    {
      category_id: catMilo,
      name: "Wali Nyama",
      price_tsh: 2000,
      sort_order: 1,
      description: "Wali mweupe uliopikwa vizuri, ukiambatana na mchuzi mtamu wa nyama ya ng'ombe, maharage ya nazi na mbogamboga za majani.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 12,
      calories: 680,
      spiciness: "Mild",
      dietary_tags: ["Halal", "Mlo Kamili", "Pendwa la Wengi"],
      options: {
        variants: [
          { name: "Sahani ya Kawaida", price_diff: 0 },
          { name: "Sahani Kubwa (+TZS 1,000)", price_diff: 1000 },
        ],
        addons: [
          { name: "Nyama ya Ziada", price: 1000 },
          { name: "Maharage ya Ziada", price: 500 },
          { name: "Mboga za Majani", price: 500 },
          { name: "Kachumbari ya Pilipili", price: 500 },
        ],
      },
    },
    {
      category_id: catMilo,
      name: "Wali Kuku",
      price_tsh: 3500,
      sort_order: 2,
      description: "Wali mweupe safi ukiambatana na kuku wa kukaanga au rosti, maharage ya nazi na mbogamboga safi.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 720,
      spiciness: "Mild",
      dietary_tags: ["Halal", "Kuku Mtamu", "Mlo Kamili"],
      options: {
        variants: [
          { name: "Kuku wa Kukaanga", price_diff: 0 },
          { name: "Kuku wa Rosti", price_diff: 0 },
        ],
        addons: [
          { name: "Kipande cha Kuku cha Ziada", price: 2000 },
          { name: "Maharage ya Ziada", price: 500 },
          { name: "Mboga za Majani", price: 500 },
        ],
      },
    },
    {
      category_id: catMilo,
      name: "Pilau Nyama",
      price_tsh: 3000,
      sort_order: 3,
      description: "Pilau halisi ya Kiswahili iliyokolea viungo vya asili (iliki, karafuu, mdalasini), nyama laini ya ng'ombe, maharage, mbogamboga na kachumbari.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 740,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Pilau Halisi", "Pendwa"],
      options: {
        variants: [
          { name: "Sahani ya Kawaida", price_diff: 0 },
          { name: "Sahani Kubwa (+TZS 1,500)", price_diff: 1500 },
        ],
        addons: [
          { name: "Nyama ya Ziada", price: 1000 },
          { name: "Maharage ya Ziada", price: 500 },
          { name: "Kachumbari Maalum", price: 500 },
        ],
      },
    },
    {
      category_id: catMilo,
      name: "Pilau Kuku",
      price_tsh: 4000,
      sort_order: 4,
      description: "Pilau moto yenye viungo kamili vya pwani, ikisindikizwa na kuku wa kukaanga/rosto, maharage, mbogamboga na kachumbari.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 790,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Kuku Choma", "Ladha ya Pwani"],
      options: {
        variants: [
          { name: "Kuku wa Kukaanga", price_diff: 0 },
          { name: "Kuku wa Rosti", price_diff: 0 },
        ],
        addons: [
          { name: "Kipande cha Kuku cha Ziada", price: 2000 },
          { name: "Pilau ya Ziada", price: 1500 },
        ],
      },
    },
    {
      category_id: catMilo,
      name: "Biryan nyama",
      price_tsh: 4000,
      sort_order: 5,
      description: "Mchele safi wa basmati wenye nakshi za viungo na rosti nzito ya nyama ya ng'ombe iliyotiwa mtindi, ndimu na viungo vya biryani.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 760,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Biryani Halisi", "Chef Special"],
      options: {
        variants: [
          { name: "Sahani ya Kawaida", price_diff: 0 },
          { name: "Sahani ya Familia (+TZS 3,500)", price_diff: 3500 },
        ],
        addons: [
          { name: "Rosti ya Nyama ya Ziada", price: 1500 },
          { name: "Yai la Kuchemsha", price: 500 },
          { name: "Kachumbari ya Mtindi", price: 500 },
        ],
      },
    },
    {
      category_id: catMilo,
      name: "Biryan Kuku",
      price_tsh: 6000,
      sort_order: 6,
      description: "Biryani ya kifalme ya kuku aliyelainika kwenye mchuzi mzito wa viungo vya asili, basmati yenye harufu nzuri na kachumbari.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 840,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Mlo wa Kifalme", "Nyota ya Mgahawa"],
      options: {
        variants: [
          { name: "Portion Kamili", price_diff: 0 },
        ],
        addons: [
          { name: "Kuku wa Ziada", price: 2500 },
          { name: "Yai la Kuchemsha", price: 500 },
        ],
      },
    },
    {
      category_id: catMilo,
      name: "Ugali nyama choma",
      price_tsh: 3000,
      sort_order: 7,
      description: "Ugali wa moto uliosongwa kwa unga safi, ukisindikizwa na nyama choma laini ya ng'ombe, mboga za majani na kachumbari.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 690,
      spiciness: "Mild",
      dietary_tags: ["Halal", "Nyama Choma", "Asili"],
      options: {
        variants: [
          { name: "Ugali Sembe", price_diff: 0 },
          { name: "Ugali Dona", price_diff: 0 },
        ],
        addons: [
          { name: "Nyama Choma ya Ziada", price: 1500 },
          { name: "Mchuzi wa Rosti", price: 500 },
          { name: "Mboga za Majani", price: 500 },
        ],
      },
    },
    {
      category_id: catMilo,
      name: "Ugali samaki",
      price_tsh: 3000,
      sort_order: 8,
      description: "Ugali wa moto na samaki safi wa kukaanga au kupikwa rosti ya nyanya chungu na mboga za majani.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 20,
      calories: 620,
      spiciness: "Mild",
      dietary_tags: ["Halal", "Samaki Safi", "Afya"],
      options: {
        variants: [
          { name: "Samaki wa Kukaanga", price_diff: 0 },
          { name: "Samaki wa Rosti", price_diff: 0 },
        ],
        addons: [
          { name: "Samaki wa Ziada", price: 2000 },
          { name: "Mchuzi wa Nazi", price: 500 },
        ],
      },
    },

    // 9-14 & 19: Chips & Grill
    {
      category_id: catChips,
      name: "Chips plain",
      price_tsh: 2000,
      sort_order: 1,
      description: "Chipsi kavu za viazi vitamu vya mviringo vilivyokaangwa crispy na kugeuka rangi ya dhahabu.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 10,
      calories: 420,
      spiciness: "Mild",
      dietary_tags: ["Vegetarian", "Crispy", "Viazi Safi"],
      options: {
        variants: [
          { name: "Sahani ya Kawaida", price_diff: 0 },
          { name: "Sahani Kubwa (Jumbo) (+TZS 1,500)", price_diff: 1500 },
        ],
        addons: [
          { name: "Tomato & Pili Pili Sauce", price: 0 },
          { name: "Kachumbari", price: 500 },
        ],
      },
    },
    {
      category_id: catChips,
      name: "Chips yai(zege)",
      price_tsh: 3000,
      sort_order: 2,
      description: "Chipsi zege maarufu: Chips moto zilizopikwa na mayai mawili safi ya kienyeji, kachumbari na pili-pili.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 10,
      calories: 560,
      spiciness: "Medium",
      dietary_tags: ["Vegetarian", "Zege Tamu", "Pendwa la Vijana"],
      options: {
        variants: [
          { name: "Mayai 2 (Kawaida)", price_diff: 0 },
          { name: "Mayai 3 (+TZS 1,000)", price_diff: 1000 },
        ],
        addons: [
          { name: "Pilipili ya Kukaanga", price: 500 },
          { name: "Kachumbari ya Ziada", price: 500 },
        ],
      },
    },
    {
      category_id: catChips,
      name: "Chips Kuku 1/3",
      price_tsh: 5500,
      sort_order: 3,
      description: "Chipsi kavu moto zikiambatana na robo tatu (1/3) ya kuku wa kukaanga/kuchoma na kachumbari safi.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 15,
      calories: 790,
      spiciness: "Mild",
      dietary_tags: ["Halal", "Kuku 1/3", "Crispy"],
      options: {
        variants: [
          { name: "Kuku wa Kukaanga", price_diff: 0 },
          { name: "Kuku wa Kuchoma", price_diff: 0 },
        ],
        addons: [
          { name: "Kipande cha Kuku cha Ziada", price: 2500 },
          { name: "Chips za Ziada", price: 1000 },
        ],
      },
    },
    {
      category_id: catChips,
      name: "Chips yai Kuku 1/3",
      price_tsh: 6500,
      sort_order: 4,
      description: "Mchanganyiko kamili wa chipsi zege moto ya mayai 2 pamoja na robo tatu (1/3) ya kuku mtamu wa choma au kukaanga.",
      is_featured: 1,
      is_deal: 1,
      prep_time_min: 15,
      calories: 890,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Super Combo", "Mlo Kamili"],
      options: {
        variants: [
          { name: "Kuku Choma", price_diff: 0 },
          { name: "Kuku wa Kukaanga", price_diff: 0 },
        ],
        addons: [
          { name: "Yai la Ziada kwenye Zege", price: 1000 },
          { name: "Kachumbari ya Ziada", price: 500 },
        ],
      },
    },
    {
      category_id: catChips,
      name: "Mshkaki wa ng'ombe",
      price_tsh: 500,
      sort_order: 5,
      description: "Mshikaki mmoja wa nyama laini ya ng'ombe iliyokolea viungo vya tangawizi, vitunguu swaumu, ndimu na kuchomwa kwenye mkaa moto.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 8,
      calories: 120,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Mkaa Choma", "Kitafunwa"],
      options: {
        addons: [
          { name: "Pili Pili Kali ya Pembeni", price: 0 },
        ],
      },
    },
    {
      category_id: catChips,
      name: "mshkaki wa Kuku",
      price_tsh: 1000,
      sort_order: 6,
      description: "Mshikaki wa minofu safi ya kuku iliyolowekwa kwenye viungo maalum na kuchomwa kwa ustadi.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 8,
      calories: 150,
      spiciness: "Medium",
      dietary_tags: ["Halal", "Minofu ya Kuku", "Moto"],
      options: {
        addons: [
          { name: "Pili Pili Kali", price: 0 },
        ],
      },
    },
    {
      category_id: catJuice,
      name: "Ndizi",
      price_tsh: 500,
      sort_order: 3,
      description: "Ndizi mbivu tamu ya asili au ndizi ya kukaanga/kuchoma ya kuongeza nguvu.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 90,
      spiciness: "Mild",
      dietary_tags: ["Tunda Safi", "Asili"],
      options: {
        variants: [
          { name: "Ndizi Mbivu", price_diff: 0 },
          { name: "Ndizi ya Kuchoma", price_diff: 0 },
          { name: "Ndizi ya Kukaanga", price_diff: 0 },
        ],
      },
    },

    // 15-18 & 22-23: Vinywaji Baridi
    {
      category_id: catDrinks,
      name: "Maji 1l.",
      price_tsh: 500,
      sort_order: 1,
      description: "Maji safi ya asili ya kunywa ya chupa ya Lita 1 (1L), yaliyopozwa vizuri.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 0,
      spiciness: "Mild",
      dietary_tags: ["Maji Safi", "Baridi"],
      options: {
        variants: [
          { name: "Maji ya Baridi", price_diff: 0 },
          { name: "Maji ya Kawaida (Room Temp)", price_diff: 0 },
        ],
      },
    },
    {
      category_id: catDrinks,
      name: "maji 1.6l",
      price_tsh: 800,
      sort_order: 2,
      description: "Chupa kubwa ya maji safi ya kunywa ya Lita 1.6 (1.6L) ya kuburudisha kiu yako na timu.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 0,
      spiciness: "Mild",
      dietary_tags: ["Maji Safi", "Chupa Kubwa"],
      options: {
        variants: [
          { name: "Maji ya Baridi", price_diff: 0 },
          { name: "Maji ya Kawaida (Room Temp)", price_diff: 0 },
        ],
      },
    },
    {
      category_id: catDrinks,
      name: "Soda (Pepsi products,and coca-cola products,",
      price_tsh: 700,
      sort_order: 3,
      description: "Soda baridi ya chupa ya kioo (Coca-Cola, Fanta, Sprite, Pepsi, Mirinda, Sparletta).",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 140,
      spiciness: "Mild",
      dietary_tags: ["Kinywaji Baridi", "Chupa ya Kioo"],
      options: {
        variants: [
          { name: "Coca-Cola", price_diff: 0 },
          { name: "Pepsi", price_diff: 0 },
          { name: "Fanta Orange", price_diff: 0 },
          { name: "Sprite", price_diff: 0 },
          { name: "Mirinda", price_diff: 0 },
          { name: "Sparletta", price_diff: 0 },
        ],
      },
    },
    {
      category_id: catDrinks,
      name: "Soda take away",
      price_tsh: 1000,
      sort_order: 4,
      description: "Soda ya chupa ya plastiki (PET) au kopo ya kuchukua popote bila kurejesha chupa.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 150,
      spiciness: "Mild",
      dietary_tags: ["Take Away", "Kopo / PET"],
      options: {
        variants: [
          { name: "Coca-Cola PET 500ml", price_diff: 0 },
          { name: "Pepsi PET 500ml", price_diff: 0 },
          { name: "Fanta PET 500ml", price_diff: 0 },
          { name: "Sprite PET 500ml", price_diff: 0 },
        ],
      },
    },
    {
      category_id: catDrinks,
      name: "Azam cola (soda products)",
      price_tsh: 500,
      sort_order: 5,
      description: "Soda baridi ya Azam (Azam Cola, Azam Orange, Azam Embe, Azam Malti).",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 130,
      spiciness: "Mild",
      dietary_tags: ["Azam Products", "Kinywaji Baridi"],
      options: {
        variants: [
          { name: "Azam Cola", price_diff: 0 },
          { name: "Azam Orange", price_diff: 0 },
          { name: "Azam Embe", price_diff: 0 },
          { name: "Azam Malti", price_diff: 0 },
        ],
      },
    },
    {
      category_id: catDrinks,
      name: "Afiya (soda products)",
      price_tsh: 500,
      sort_order: 6,
      description: "Kinywaji baridi na kitamu cha matunda cha chapa ya Afya.",
      is_featured: 0,
      is_deal: 0,
      prep_time_min: 1,
      calories: 110,
      spiciness: "Mild",
      dietary_tags: ["Afya Drink", "Kuburudisha"],
      options: {
        variants: [
          { name: "Afya Mango", price_diff: 0 },
          { name: "Afya Passion", price_diff: 0 },
          { name: "Afya Orange", price_diff: 0 },
        ],
      },
    },

    // 20-21: Juisi Freshi & Smoothies
    {
      category_id: catJuice,
      name: "Fresh fruits smoothy Juice",
      price_tsh: 1000,
      sort_order: 1,
      description: "Juisi freshi ya asili ya matunda mchanganyiko (embe, parachichi, nanasi, passion) iliyotengenezwa bila maji ya ziada.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 4,
      calories: 160,
      spiciness: "Mild",
      dietary_tags: ["100% Asili", "Matunda Freshi", "Bila Sukari"],
      options: {
        variants: [
          { name: "Mchanganyiko (Embe, Parachichi, Nanasi)", price_diff: 0 },
          { name: "Embe & Passion", price_diff: 0 },
          { name: "Parachichi Safi", price_diff: 0 },
        ],
      },
    },
    {
      category_id: catJuice,
      name: "special fruits smoothy juice",
      price_tsh: 1500,
      sort_order: 2,
      description: "Juisi maalum yenye nguvu: Matunda freshi, asali mbichi ya nyuki, tende, maziwa freshi na karanga.",
      is_featured: 1,
      is_deal: 0,
      prep_time_min: 5,
      calories: 280,
      spiciness: "Mild",
      dietary_tags: ["Special Energy", "Virutubisho", "Pendwa la Ofisi"],
      options: {
        variants: [
          { name: "Special Mix Kamili", price_diff: 0 },
          { name: "Special Bila Maziwa", price_diff: 0 },
        ],
      },
    },
  ];

  // Insert or update each menu item
  const upsertStmt = db.prepare(`
    INSERT INTO menu_items (
      category_id, name, price_tsh, sort_order, active, deleted,
      description, is_featured, is_deal, prep_time_min, calories,
      spiciness, dietary_tags, options_json
    ) VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE menu_items SET
      category_id = ?, price_tsh = ?, sort_order = ?,
      description = ?, is_featured = ?, is_deal = ?, prep_time_min = ?, calories = ?,
      spiciness = ?, dietary_tags = ?, options_json = ?
    WHERE id = ?
  `);

  for (const item of menuItemsData) {
    const existing = db.prepare("SELECT id FROM menu_items WHERE LOWER(name) = LOWER(?)").get(item.name) as { id: number } | undefined;
    if (existing) {
      updateStmt.run(
        item.category_id,
        item.price_tsh,
        item.sort_order,
        item.description,
        item.is_featured,
        item.is_deal,
        item.prep_time_min,
        item.calories,
        item.spiciness,
        JSON.stringify(item.dietary_tags),
        JSON.stringify(item.options),
        existing.id
      );
    } else {
      upsertStmt.run(
        item.category_id,
        item.name,
        item.price_tsh,
        item.sort_order,
        item.description,
        item.is_featured,
        item.is_deal,
        item.prep_time_min,
        item.calories,
        item.spiciness,
        JSON.stringify(item.dietary_tags),
        JSON.stringify(item.options)
      );
    }
  }

  // Deactivate old placeholder burger items if they still exist so user only sees their real 23 items
  const legacyNames = ["Classic Burger", "Spicy Chicken Burger", "Double Beef Burger", "French Fries", "Coleslaw", "Onion Rings", "Burger + Fries Combo", "Family Meal Deal", "Mango Juice", "Water", "Coca-Cola"];
  for (const legacy of legacyNames) {
    db.prepare("UPDATE menu_items SET active = 0, deleted = 1 WHERE name = ?").run(legacy);
  }
}

function seed(db: Database.Database) {
  const existing = db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number };
  if (existing.n === 0) {
    if (isProduction()) {
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

  // Synchronize authentic 23-item Swahili menu
  syncSwahiliMenu(db);
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

  // Seed / Refresh Corporate Menu Packages tailored to the authentic Swahili menu
  const biryaniNyama = db.prepare("SELECT id FROM menu_items WHERE name = 'Biryan nyama' AND deleted = 0").get() as { id: number } | undefined;
  const biryaniKuku = db.prepare("SELECT id FROM menu_items WHERE name = 'Biryan Kuku' AND deleted = 0").get() as { id: number } | undefined;
  const pilauNyama = db.prepare("SELECT id FROM menu_items WHERE name = 'Pilau Nyama' AND deleted = 0").get() as { id: number } | undefined;
  const waliKuku = db.prepare("SELECT id FROM menu_items WHERE name = 'Wali Kuku' AND deleted = 0").get() as { id: number } | undefined;
  const chipsKuku = db.prepare("SELECT id FROM menu_items WHERE name = 'Chips Kuku 1/3' AND deleted = 0").get() as { id: number } | undefined;
  const chipsZegeKuku = db.prepare("SELECT id FROM menu_items WHERE name = 'Chips yai Kuku 1/3' AND deleted = 0").get() as { id: number } | undefined;
  const mshikakiNgombe = db.prepare("SELECT id FROM menu_items WHERE name = 'Mshkaki wa ng''ombe' AND deleted = 0").get() as { id: number } | undefined;
  const maji1L = db.prepare("SELECT id FROM menu_items WHERE name = 'Maji 1l.' AND deleted = 0").get() as { id: number } | undefined;
  const sodaGlass = db.prepare("SELECT id FROM menu_items WHERE name LIKE 'Soda (Pepsi%' AND deleted = 0").get() as { id: number } | undefined;
  const freshJuice = db.prepare("SELECT id FROM menu_items WHERE name = 'Fresh fruits smoothy Juice' AND deleted = 0").get() as { id: number } | undefined;
  const specialJuice = db.prepare("SELECT id FROM menu_items WHERE name = 'special fruits smoothy juice' AND deleted = 0").get() as { id: number } | undefined;

  // Safely seed or update Corporate Packages
  const existingP1 = db.prepare("SELECT id FROM corporate_menu_packages WHERE sort_order = 1 OR name LIKE '%Executive%'").get() as { id: number } | undefined;
  if (!existingP1) {
    const p1 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      "Individual Executive Swahili Lunch Box",
      "Curated premium single-portion office lunch box",
      "Each box includes 1 Biryani Nyama au Pilau Kuku (pamoja na mbogamboga & maharage), 1 Fresh Fruits Smoothie Juice, na 1 Maji 1L pamoja na vifaa vya kulia & serviette.",
      6500,
      5,
      5,
      2,
      "Most Popular"
    );
    const p1Id = p1.lastInsertRowid as number;
    if (biryaniNyama) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(p1Id, biryaniNyama.id);
    if (freshJuice) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(p1Id, freshJuice.id);
    if (maji1L) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(p1Id, maji1L.id);
  } else {
    db.prepare(`
      UPDATE corporate_menu_packages
      SET name = ?, tagline = ?, description = ?, price_tsh = ?, minimum_quantity = 5, serves_people_min = 5
      WHERE id = ?
    `).run(
      "Individual Executive Swahili Lunch Box",
      "Curated premium single-portion office lunch box",
      "Each box includes 1 Biryani Nyama au Pilau Kuku (pamoja na mbogamboga & maharage), 1 Fresh Fruits Smoothie Juice, na 1 Maji 1L pamoja na vifaa vya kulia & serviette.",
      6500,
      existingP1.id
    );
    db.prepare("DELETE FROM corporate_menu_package_items WHERE package_id = ?").run(existingP1.id);
    if (biryaniNyama) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(existingP1.id, biryaniNyama.id);
    if (freshJuice) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(existingP1.id, freshJuice.id);
    if (maji1L) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 1)").run(existingP1.id, maji1L.id);
  }

  const existingP2 = db.prepare("SELECT id FROM corporate_menu_packages WHERE sort_order = 2 OR name LIKE '%Team%'").get() as { id: number } | undefined;
  if (!existingP2) {
    const p2 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2)
    `).run(
      "Team Swahili Feast (Serves 10)",
      "Chakula cha pamoja kwa ajili ya timu nzima ofisini",
      "Inajumuisha milo 10 mikubwa: 4x Pilau Nyama, 3x Wali Kuku, 3x Chips Yai Kuku 1/3, ikisindikizwa na 10x Soda baridi, maharage na mbogamboga.",
      50000,
      1,
      10,
      2,
      "Team Value"
    );
    const p2Id = p2.lastInsertRowid as number;
    if (pilauNyama) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p2Id, pilauNyama.id);
    if (waliKuku) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 3)").run(p2Id, waliKuku.id);
    if (chipsZegeKuku) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 3)").run(p2Id, chipsZegeKuku.id);
    if (sodaGlass) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 10)").run(p2Id, sodaGlass.id);
  } else {
    db.prepare(`
      UPDATE corporate_menu_packages
      SET name = ?, tagline = ?, description = ?, price_tsh = ?, minimum_quantity = 1, serves_people_min = 10
      WHERE id = ?
    `).run(
      "Team Swahili Feast (Serves 10)",
      "Chakula cha pamoja kwa ajili ya timu nzima ofisini",
      "Inajumuisha milo 10 mikubwa: 4x Pilau Nyama, 3x Wali Kuku, 3x Chips Yai Kuku 1/3, ikisindikizwa na 10x Soda baridi, maharage na mbogamboga.",
      50000,
      existingP2.id
    );
    db.prepare("DELETE FROM corporate_menu_package_items WHERE package_id = ?").run(existingP2.id);
    if (pilauNyama) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(existingP2.id, pilauNyama.id);
    if (waliKuku) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 3)").run(existingP2.id, waliKuku.id);
    if (chipsZegeKuku) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 3)").run(existingP2.id, chipsZegeKuku.id);
    if (sodaGlass) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 10)").run(existingP2.id, sodaGlass.id);
  }

  const existingP3 = db.prepare("SELECT id FROM corporate_menu_packages WHERE sort_order = 3 OR name LIKE '%VIP%'").get() as { id: number } | undefined;
  if (!existingP3) {
    const p3 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3)
    `).run(
      "Boardroom VIP Biryani Banquet (Serves 8–10)",
      "Karamu maalum ya Biryani na juisi za asili kwa wageni maalum",
      "Inajumuisha 5x Biryani Kuku, 4x Biryani Nyama, mbogamboga na maharage, 10x Special Fruits Smoothie Juices, na 10x Maji 1L.",
      68000,
      1,
      8,
      3,
      "Executive Choice"
    );
    const p3Id = p3.lastInsertRowid as number;
    if (biryaniKuku) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 5)").run(p3Id, biryaniKuku.id);
    if (biryaniNyama) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 4)").run(p3Id, biryaniNyama.id);
    if (specialJuice) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 10)").run(p3Id, specialJuice.id);
    if (maji1L) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 10)").run(p3Id, maji1L.id);
  }

  const existingP4 = db.prepare("SELECT id FROM corporate_menu_packages WHERE sort_order = 4 OR name LIKE '%Quick%'").get() as { id: number } | undefined;
  if (!existingP4) {
    const p4 = db.prepare(`
      INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4)
    `).run(
      "Quick Energy Mshikaki & Chips Pack (Serves 5)",
      "Finger-food supplement for meetings & workshops",
      "Inajumuisha 5x Chips Kuku 1/3, 10x Mishikaki ya Ng'ombe, na 5x Fresh Fruits Smoothie Juice.",
      25000,
      1,
      5,
      1,
      "Quick Pack"
    );
    const p4Id = p4.lastInsertRowid as number;
    if (chipsKuku) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 5)").run(p4Id, chipsKuku.id);
    if (mshikakiNgombe) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 10)").run(p4Id, mshikakiNgombe.id);
    if (freshJuice) db.prepare("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, 5)").run(p4Id, freshJuice.id);
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

export interface StoreSettings {
  id: number;
  is_manual_override: number; // 0 or 1
  manual_status: "OPEN" | "CLOSED";
  opening_time: string; // "08:00:00"
  closing_time: string; // "23:00:00"
  timezone: string; // "Africa/Dar_es_Salaam"
  default_fallback_text: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  text: string;
  highlight?: string | null;
  is_active: number; // 0 or 1
  priority: number;
  start_time?: string | null;
  end_time?: string | null;
  created_at: string;
  created_by?: number | null;
}

export interface HeaderTickerData {
  is_open: boolean;
  status_label: "LIVE" | "CLOSED";
  default_fallback_text: string;
  opening_time: string;
  closing_time: string;
  timezone: string;
  is_manual_override: boolean;
  manual_status: "OPEN" | "CLOSED";
  current_local_time: string;
  promotions_enabled: boolean;
  promotions_count: number;
  announcements: {
    id: string;
    text: string;
    highlight?: string | null;
    priority: number;
    is_active: boolean;
    start_time?: string | null;
    end_time?: string | null;
  }[];
}

function seedStoreHoursAndAnnouncements(db: Database.Database) {
  // Ensure store_settings row 1 exists
  const settingsRow = db.prepare("SELECT * FROM store_settings WHERE id = 1").get() as StoreSettings | undefined;
  if (!settingsRow) {
    db.prepare(`
      INSERT INTO store_settings (id, is_manual_override, manual_status, opening_time, closing_time, timezone, default_fallback_text)
      VALUES (1, 0, 'OPEN', '08:00:00', '23:00:00', 'Africa/Dar_es_Salaam', 'Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam')
    `).run();
  }

  // Seed default high-value announcements if none exist
  const annCount = db.prepare("SELECT COUNT(*) as n FROM announcements").get() as { n: number };
  if (annCount.n === 0) {
    const initialAnnouncements = [
      {
        id: "ann_1_grill_live",
        text: "TOP KITCHEN LIVE: Grill & Tandoori Wazi Sasa",
        highlight: "Moto & Safi",
        priority: 1,
      },
      {
        id: "ann_2_express_delivery",
        text: "Express Bike Delivery: Kariakoo, Posta, Upanga, Ilala, Kisutu & Magomeni",
        highlight: "10-25 Mins",
        priority: 2,
      },
      {
        id: "ann_3_operating_hours",
        text: "Jiko Operating Hours: 8:00 AM – 11:00 PM Kila Siku",
        highlight: "Dar es Salaam CBD",
        priority: 3,
      },
      {
        id: "ann_4_corporate_catering",
        text: "Corporate Office Catering & Scheduled Lunch Subsidy Accounts",
        highlight: "B2B Portal Active",
        priority: 4,
      },
      {
        id: "ann_5_karibu_discount",
        text: "Special Welcome Offer: 10% OFF Discount on Your First Order",
        highlight: "Promo: KARIBU10",
        priority: 5,
      },
      {
        id: "ann_6_whatsapp_hotline",
        text: "Direct Kitchen WhatsApp & Fast Rider Dispatch Line",
        highlight: "+255 700 000 000",
        priority: 6,
      },
    ];

    const insertAnn = db.prepare(`
      INSERT INTO announcements (id, text, highlight, is_active, priority, start_time, end_time, created_at)
      VALUES (?, ?, ?, 1, ?, datetime('now'), NULL, datetime('now'))
    `);

    for (const ann of initialAnnouncements) {
      insertAnn.run(ann.id, ann.text, ann.highlight, ann.priority);
    }
  }
}

/**
 * Computes live store status and returns active announcements
 * Mirroring the Supabase Postgres RPC function `get_header_ticker_data()`
 */
export function getHeaderTickerData(db: Database.Database): HeaderTickerData {
  let settings = db.prepare("SELECT * FROM store_settings WHERE id = 1").get() as StoreSettings | undefined;
  if (!settings) {
    db.prepare(`
      INSERT INTO store_settings (id, is_manual_override, manual_status, opening_time, closing_time, timezone, default_fallback_text)
      VALUES (1, 0, 'OPEN', '08:00:00', '23:00:00', 'Africa/Dar_es_Salaam', 'Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam')
    `).run();
    settings = db.prepare("SELECT * FROM store_settings WHERE id = 1").get() as StoreSettings;
  }

  const timezone = settings.timezone || "Africa/Dar_es_Salaam";

  // Calculate current time in the configured timezone
  const now = new Date();
  let localTimeString = "12:00:00";
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const hour = parts.find((p) => p.type === "hour")?.value || "12";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    const second = parts.find((p) => p.type === "second")?.value || "00";
    localTimeString = `${hour}:${minute}:${second}`;
  } catch (err) {
    // Fallback to UTC+3 (Dar es Salaam standard time)
    const utcHours = now.getUTCHours() + 3;
    const hours = (utcHours % 24).toString().padStart(2, "0");
    const minutes = now.getUTCMinutes().toString().padStart(2, "0");
    const seconds = now.getUTCSeconds().toString().padStart(2, "0");
    localTimeString = `${hours}:${minutes}:${seconds}`;
  }

  // Normalize time strings to HH:MM:SS for robust string comparison
  const normalizeTime = (t: string) => {
    const p = t.trim().split(":");
    const h = (p[0] || "0").padStart(2, "0");
    const m = (p[1] || "0").padStart(2, "0");
    const s = (p[2] || "0").padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const curTime = normalizeTime(localTimeString);
  const openTime = normalizeTime(settings.opening_time || "08:00:00");
  const closeTime = normalizeTime(settings.closing_time || "23:00:00");

  let isOpen = false;
  if (Boolean(settings.is_manual_override)) {
    isOpen = settings.manual_status === "OPEN";
  } else {
    if (openTime <= closeTime) {
      // Standard daytime schedule (e.g. 08:00:00 to 23:00:00)
      isOpen = curTime >= openTime && curTime < closeTime;
    } else {
      // Overnight schedule (e.g. 20:00:00 to 04:00:00)
      isOpen = curTime >= openTime || curTime < closeTime;
    }
  }

  // Query active announcements valid right now
  const rawAnnouncements = db.prepare(`
    SELECT id, text, highlight, priority, is_active, start_time, end_time
    FROM announcements
    WHERE is_active = 1
      AND (start_time IS NULL OR start_time <= datetime('now'))
      AND (end_time IS NULL OR end_time >= datetime('now'))
    ORDER BY priority ASC, created_at DESC
  `).all() as (Announcement & { is_active: number })[];

  const formattedAnnouncements = rawAnnouncements.map((a) => ({
    id: a.id,
    text: a.text,
    highlight: a.highlight || null,
    priority: a.priority,
    is_active: Boolean(a.is_active),
    start_time: a.start_time || null,
    end_time: a.end_time || null,
  }));

  // Check restaurant settings for master promotion switch
  const rawRestSettings = db.prepare("SELECT promotions_enabled FROM restaurant_settings WHERE id = 1").get() as { promotions_enabled?: number } | undefined;
  const isPromosEnabled = rawRestSettings?.promotions_enabled === 1;
  const activePromosCount = isPromosEnabled
    ? ((db.prepare("SELECT COUNT(*) as cnt FROM promotions WHERE active = 1").get() as { cnt: number })?.cnt || 0)
    : 0;

  return {
    is_open: isOpen,
    status_label: isOpen ? "LIVE" : "CLOSED",
    default_fallback_text: settings.default_fallback_text || "Top Kitchen Live — Fresh Meals & Juices Delivered Daily",
    opening_time: settings.opening_time,
    closing_time: settings.closing_time,
    timezone: settings.timezone,
    is_manual_override: Boolean(settings.is_manual_override),
    manual_status: settings.manual_status,
    current_local_time: localTimeString,
    promotions_enabled: isPromosEnabled,
    promotions_count: activePromosCount,
    announcements: formattedAnnouncements,
  };
}

export default getDb;



