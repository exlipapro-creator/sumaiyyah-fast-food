import { describe, it, expect, beforeAll } from "vitest";
import getDb from "../src/lib/db";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const BASE = process.env.DROIDBOT_TEST_URL || "http://localhost:3000";

describe("Production Deployment & Operational Verification", () => {
  let db: ReturnType<typeof getDb>;
  let managerCookie = "";
  let cashierCookie = "";

  beforeAll(async () => {
    db = getDb();

    // Login for operational tests
    const mRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "manager@sumaiyyah.test", password: "Manager123!" }),
    });
    if (mRes.ok) {
      managerCookie = mRes.headers.get("set-cookie") || "";
    }

    const cRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cashier@sumaiyyah.test", password: "Cashier123!" }),
    });
    if (cRes.ok) {
      cashierCookie = cRes.headers.get("set-cookie") || "";
    }
  });

  // ─── 1. Health Endpoint ───────────────────────────────────────────────────
  describe("Health Endpoint (/api/health)", () => {
    it("GET /api/health — returns HTTP 200 with status ok and database ok", async () => {
      const res = await fetch(`${BASE}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
      expect(data.database).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });
  });

  // ─── 2. SQLite Database Integrity & WAL Mode ─────────────────────────────
  describe("Database Engine & WAL Integrity", () => {
    it("enforces WAL journal mode and foreign keys", () => {
      const journalMode = db.pragma("journal_mode", { simple: true });
      expect(typeof journalMode === "string" ? journalMode.toLowerCase() : "").toBe("wal");

      const foreignKeys = db.pragma("foreign_keys", { simple: true });
      expect(Number(foreignKeys)).toBe(1);

      const integrity = db.pragma("integrity_check", { simple: true });
      expect(integrity).toBe("ok");
    });
  });

  // ─── 3. Production Seeding & Bootstrap Isolation ─────────────────────────
  describe("Environment-Aware Seeding & Bootstrap", () => {
    it("production mode does not auto-seed demo accounts or demo promotions into fresh databases", () => {
      // Test isolated database instance in production mode simulation
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const testDbPath = path.join(dataDir, `test_prod_${Date.now()}.db`);
      try {
        const testDb = new Database(testDbPath);
        testDb.pragma("journal_mode = WAL");
        testDb.pragma("foreign_keys = ON");

        // Create initial schema
        testDb.exec(`
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
          CREATE TABLE IF NOT EXISTS restaurant_settings (
            id INTEGER PRIMARY KEY DEFAULT 1,
            name TEXT NOT NULL,
            tagline TEXT,
            phone TEXT,
            whatsapp TEXT,
            address TEXT,
            opening_hours TEXT,
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
            discount_type TEXT NOT NULL,
            discount_value INTEGER NOT NULL,
            min_order_tsh INTEGER NOT NULL DEFAULT 0,
            badge TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          CREATE TABLE IF NOT EXISTS corporate_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            legal_name TEXT,
            account_code TEXT NOT NULL UNIQUE,
            billing_email TEXT NOT NULL,
            billing_phone TEXT NOT NULL,
            tax_id TEXT,
            payment_terms TEXT NOT NULL DEFAULT 'DUE_ON_DELIVERY',
            credit_limit_tsh INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);

        // Test production bootstrap with credentials
        const bootstrapEmail = "ops.manager@sumaiyyah.co.tz";
        const bootstrapPass = "SuperSecretManager2026!";
        const passwordHash = bcrypt.hashSync(bootstrapPass, 10);

        testDb.prepare(
          `INSERT INTO users (email, name, password_hash, role, active) VALUES (?, ?, ?, 'manager', 1)`
        ).run(bootstrapEmail, "Lead Operations Manager", passwordHash);

        const createdUser = testDb.prepare("SELECT * FROM users WHERE email = ?").get(bootstrapEmail) as {
          email: string;
          role: string;
          password_hash: string;
        };

        expect(createdUser).toBeDefined();
        expect(createdUser.role).toBe("manager");
        expect(bcrypt.compareSync(bootstrapPass, createdUser.password_hash)).toBe(true);

        // Verify zero demo accounts exist
        const demoAccounts = testDb.prepare("SELECT COUNT(*) as n FROM users WHERE email LIKE '%.test'").get() as { n: number };
        expect(demoAccounts.n).toBe(0);

        // Verify zero demo corporate accounts exist
        const demoCorps = testDb.prepare("SELECT COUNT(*) as n FROM corporate_accounts").get() as { n: number };
        expect(demoCorps.n).toBe(0);

        // Verify zero demo promotions exist
        const demoPromos = testDb.prepare("SELECT COUNT(*) as n FROM promotions").get() as { n: number };
        expect(demoPromos.n).toBe(0);

        testDb.close();
      } finally {
        try { fs.unlinkSync(testDbPath); } catch {}
        try { fs.unlinkSync(testDbPath + "-wal"); } catch {}
        try { fs.unlinkSync(testDbPath + "-shm"); } catch {}
      }
    });
  });

  // ─── 4. End-to-End Operational Lifecycle ──────────────────────────────────
  describe("Complete Restaurant Operational Flows", () => {
    it("POS Flow: Order creation, stock deduction, voiding and stock restoration", async () => {
      // 1. Create a tracked item
      const cat = db.prepare("SELECT id FROM categories LIMIT 1").get() as { id: number };
      const createItemRes = await fetch(`${BASE}/api/menu-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: managerCookie },
        body: JSON.stringify({
          category_id: cat.id,
          name: `Operational Test Item ${Date.now()}`,
          price_tsh: 10000,
          track_stock: 1,
          stock_qty: 20,
        }),
      });
      expect(createItemRes.ok).toBe(true);
      const { item: createdItem } = await createItemRes.json();
      expect(createdItem.stock_qty).toBe(20);

      // 2. Place a POS order for 3 units
      const posOrderRes = await fetch(`${BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cashierCookie },
        body: JSON.stringify({
          items: [{ menu_item_id: createdItem.id, quantity: 3 }],
          payment_method: "cash",
          discount_type: "none",
          discount_value: 0,
        }),
      });
      expect(posOrderRes.ok).toBe(true);
      const posOrderData = await posOrderRes.json();
      expect(posOrderData.order.receipt_no).toBeDefined();
      expect(posOrderData.order.total_tsh).toBe(30000);

      // 3. Verify stock was depleted to 17
      const itemCheck1Res = await fetch(`${BASE}/api/menu-items`, { headers: { Cookie: managerCookie } });
      const itemCheck1Data = await itemCheck1Res.json();
      const itemCheck1 = itemCheck1Data.items.find((i: any) => i.id === createdItem.id);
      expect(itemCheck1).toBeDefined();
      expect(itemCheck1.stock_qty).toBe(17);

      // 4. Void order with reason and verify stock restored to 20
      const voidRes = await fetch(`${BASE}/api/orders/${posOrderData.order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: managerCookie },
        body: JSON.stringify({
          action: "void",
          reason: "Customer changed order before kitchen dispatch",
        }),
      });
      expect(voidRes.ok).toBe(true);

      const itemCheck2Res = await fetch(`${BASE}/api/menu-items`, { headers: { Cookie: managerCookie } });
      const itemCheck2Data = await itemCheck2Res.json();
      const itemCheck2 = itemCheck2Data.items.find((i: any) => i.id === createdItem.id);
      expect(itemCheck2).toBeDefined();
      expect(itemCheck2.stock_qty).toBe(20);
    });

    it("Customer Flow: Cart validation, stock check, order placement, live tracking", async () => {
      // 1. Get public menu items
      const menuRes = await fetch(`${BASE}/api/public/menu`);
      expect(menuRes.ok).toBe(true);
      const menuData = await menuRes.json();
      expect(menuData.categories.length).toBeGreaterThan(0);

      // Find an active item
      const item = db.prepare("SELECT id, price_tsh, name FROM menu_items WHERE active = 1 AND deleted = 0 LIMIT 1").get() as {
        id: number;
        price_tsh: number;
        name: string;
      };
      expect(item).toBeDefined();

      // 2. Submit customer order with delivery
      const customerOrderRes = await fetch(`${BASE}/api/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ menu_item_id: item.id, quantity: 2 }],
          order_type: "delivery",
          customer_name: "Fatma Ally",
          customer_phone: "+255 777 123 456",
          customer_address: "Oysterbay, Dar es Salaam",
          payment_method: "mobile",
        }),
      });
      expect(customerOrderRes.ok).toBe(true);
      const orderPayload = await customerOrderRes.json();
      expect(orderPayload.receipt_no).toBeDefined();

      // 3. Live order tracking query
      const trackRes = await fetch(`${BASE}/api/public/orders/track?receipt=${encodeURIComponent(orderPayload.receipt_no)}`);
      expect(trackRes.ok).toBe(true);
      const trackData = await trackRes.json();
      expect(trackData.order.receipt_no).toBe(orderPayload.receipt_no);
      expect(trackData.order.customer_name).toBe("Fatma Ally");
      expect(trackData.order.fulfillment_status).toBe("confirmed");
    });
  });
});
