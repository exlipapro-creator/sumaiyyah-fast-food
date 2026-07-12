import { describe, it, expect, beforeAll } from "vitest";

const BASE = process.env.DROIDBOT_TEST_URL || "http://localhost:3000";

let managerCookie = "";
let cashierCookie = "";

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  expect(res.ok, `Login failed for ${email}: ${await res.text()}`).toBe(true);
  const setCookie = res.headers.get("set-cookie") || "";
  return setCookie;
}

beforeAll(async () => {
  managerCookie = await login("manager@sumaiyyah.test", "Manager123!");
  cashierCookie = await login("cashier@sumaiyyah.test", "Cashier123!");
});

// ─── Auth ────────────────────────────────────────────────────────────────────

describe("Auth", () => {
  it("POST /api/auth/login — wrong password returns 401", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "manager@sumaiyyah.test", password: "wrongpassword" }),
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me — returns current user", async () => {
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: managerCookie },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.user.role).toBe("manager");
  });

  it("GET /api/auth/me — 401 without session", async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    expect(res.status).toBe(401);
  });
});

// ─── Menu Items ──────────────────────────────────────────────────────────────

describe("Menu Items", () => {
  it("GET /api/menu-items — returns seeded items", async () => {
    const res = await fetch(`${BASE}/api/menu-items`, {
      headers: { Cookie: managerCookie },
    });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.items.length).toBeGreaterThan(0);
  });

  it("POST /api/menu-items — creates an item (manager)", async () => {
    // First get a category
    const catRes = await fetch(`${BASE}/api/categories`, { headers: { Cookie: managerCookie } });
    const catData = await catRes.json();
    const catId = catData.categories[0].id;

    const res = await fetch(`${BASE}/api/menu-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ name: "Test Item", price_tsh: 5000, category_id: catId, active: true }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.item.name).toBe("Test Item");
  });

  it("POST /api/menu-items — 400 for negative price", async () => {
    const catRes = await fetch(`${BASE}/api/categories`, { headers: { Cookie: managerCookie } });
    const catData = await catRes.json();
    const catId = catData.categories[0].id;

    const res = await fetch(`${BASE}/api/menu-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ name: "Bad Item", price_tsh: -100, category_id: catId, active: true }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/menu-items — 403 for cashier", async () => {
    const res = await fetch(`${BASE}/api/menu-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cashierCookie },
      body: JSON.stringify({ name: "Test", price_tsh: 1000, category_id: 1, active: true }),
    });
    expect(res.status).toBe(403);
  });
});

// ─── Orders ──────────────────────────────────────────────────────────────────

describe("Orders", () => {
  it("POST /api/orders — 400 for empty cart", async () => {
    const res = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cashierCookie },
      body: JSON.stringify({ items: [], discount_type: "none", discount_value: 0, payment_method: "cash" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/orders — creates order and returns receipt number", async () => {
    // Get active items
    const itemRes = await fetch(`${BASE}/api/menu-items?activeOnly=1`, { headers: { Cookie: cashierCookie } });
    const itemData = await itemRes.json();
    const item = itemData.items[0];

    const res = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cashierCookie },
      body: JSON.stringify({
        items: [{ menu_item_id: item.id, quantity: 2 }],
        discount_type: "none",
        discount_value: 0,
        payment_method: "cash",
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.order.receipt_no).toMatch(/^\d{4}-\d{4}$/);
    expect(data.order.total_tsh).toBe(item.price_tsh * 2);
  });
});

// ─── Users ───────────────────────────────────────────────────────────────────

describe("Users", () => {
  it("GET /api/users — 403 for cashier", async () => {
    const res = await fetch(`${BASE}/api/users`, { headers: { Cookie: cashierCookie } });
    expect(res.status).toBe(403);
  });

  it("POST /api/users — 400 on duplicate email", async () => {
    const res = await fetch(`${BASE}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ email: "manager@sumaiyyah.test", name: "Dup", password: "pass123", role: "cashier" }),
    });
    expect(res.status).toBe(400);
  });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

describe("Dashboard", () => {
  it("GET /api/reports/dashboard — returns dashboard data", async () => {
    const res = await fetch(`${BASE}/api/reports/dashboard`, { headers: { Cookie: managerCookie } });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(typeof data.revenueToday).toBe("number");
    expect(typeof data.platesToday).toBe("number");
    expect(typeof data.transactionsToday).toBe("number");
    expect(typeof data.supplierMonth).toBe("number");
  });
});

// ─── Supplier Payments ────────────────────────────────────────────────────────

describe("Supplier Payments", () => {
  it("POST /api/supplier-payments — 400 empty supplier name", async () => {
    const res = await fetch(`${BASE}/api/supplier-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ supplier_name: "", amount_tsh: 10000, paid_on: "2026-06-01", category: "produce" }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/supplier-payments — creates a payment", async () => {
    const res = await fetch(`${BASE}/api/supplier-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ supplier_name: "Test Supplier", amount_tsh: 50000, paid_on: "2026-06-01", category: "produce" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.payment.supplier_name).toBe("Test Supplier");
  });

  it("GET /api/supplier-payments — 403 for cashier", async () => {
    const res = await fetch(`${BASE}/api/supplier-payments`, { headers: { Cookie: cashierCookie } });
    expect(res.status).toBe(403);
  });
});
