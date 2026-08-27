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
    const item = itemData.items.find((i: any) => !i.track_stock || i.stock_qty >= 5) || itemData.items[0];

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

// ─── Order Void ──────────────────────────────────────────────────────────────

describe("Order Void", () => {
  async function createOrder(cookie: string) {
    const itemRes = await fetch(`${BASE}/api/menu-items?activeOnly=1`, { headers: { Cookie: cookie } });
    const itemData = await itemRes.json();
    const item = itemData.items.find((i: any) => !i.track_stock || i.stock_qty >= 5) || itemData.items[0];
    const res = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ items: [{ menu_item_id: item.id, quantity: 1 }], discount_type: "none", discount_value: 0, payment_method: "cash" }),
    });
    const data = await res.json();
    return data.order as { id: number };
  }

  it("PATCH /api/orders/[id] — 403 for cashier attempting to void", async () => {
    const order = await createOrder(cashierCookie);
    const res = await fetch(`${BASE}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cashierCookie },
      body: JSON.stringify({ action: "void", reason: "test" }),
    });
    expect(res.status).toBe(403);
  });

  it("PATCH /api/orders/[id] — 400 without a reason", async () => {
    const order = await createOrder(cashierCookie);
    const res = await fetch(`${BASE}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ action: "void", reason: "" }),
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/orders/[id] — manager can void an order", async () => {
    const order = await createOrder(cashierCookie);
    const res = await fetch(`${BASE}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ action: "void", reason: "Customer changed mind" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.order.status).toBe("voided");

    const listRes = await fetch(`${BASE}/api/orders?status=voided`, { headers: { Cookie: managerCookie } });
    const listData = await listRes.json();
    expect(listData.orders.some((o: { id: number }) => o.id === order.id)).toBe(true);

    // Voiding twice is rejected.
    const secondVoid = await fetch(`${BASE}/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ action: "void", reason: "Already voided" }),
    });
    expect(secondVoid.status).toBe(400);
  });
});

// ─── Stock Tracking ──────────────────────────────────────────────────────────

describe("Stock Tracking", () => {
  it("blocks a sale when stock is insufficient, and void restores it", async () => {
    const catRes = await fetch(`${BASE}/api/categories`, { headers: { Cookie: managerCookie } });
    const catData = await catRes.json();
    const catId = catData.categories[0].id;

    const createRes = await fetch(`${BASE}/api/menu-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ name: "Limited Item", price_tsh: 1000, category_id: catId, active: true, track_stock: true, stock_qty: 1 }),
    });
    const createData = await createRes.json();
    const itemId = createData.item.id;

    // First sale succeeds and consumes the only unit in stock.
    const firstOrderRes = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cashierCookie },
      body: JSON.stringify({ items: [{ menu_item_id: itemId, quantity: 1 }], discount_type: "none", discount_value: 0, payment_method: "cash" }),
    });
    expect(firstOrderRes.status).toBe(201);
    const firstOrder = (await firstOrderRes.json()).order as { id: number };

    // Second sale is rejected — no stock left.
    const secondOrderRes = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cashierCookie },
      body: JSON.stringify({ items: [{ menu_item_id: itemId, quantity: 1 }], discount_type: "none", discount_value: 0, payment_method: "cash" }),
    });
    expect(secondOrderRes.status).toBe(400);

    // Voiding the first order restores the unit.
    await fetch(`${BASE}/api/orders/${firstOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ action: "void", reason: "Testing stock restore" }),
    });
    const itemsRes = await fetch(`${BASE}/api/menu-items`, { headers: { Cookie: managerCookie } });
    const itemsData = await itemsRes.json();
    const refreshed = itemsData.items.find((i: { id: number }) => i.id === itemId);
    expect(refreshed.stock_qty).toBe(1);
  });
});

// ─── Audit Log ───────────────────────────────────────────────────────────────

describe("Audit Log", () => {
  it("GET /api/audit-log — 403 for cashier", async () => {
    const res = await fetch(`${BASE}/api/audit-log`, { headers: { Cookie: cashierCookie } });
    expect(res.status).toBe(403);
  });

  it("records a menu item creation", async () => {
    const catRes = await fetch(`${BASE}/api/categories`, { headers: { Cookie: managerCookie } });
    const catData = await catRes.json();
    const catId = catData.categories[0].id;
    const createRes = await fetch(`${BASE}/api/menu-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: managerCookie },
      body: JSON.stringify({ name: "Audit Test Item", price_tsh: 1000, category_id: catId, active: true }),
    });
    const created = await createRes.json();

    const res = await fetch(`${BASE}/api/audit-log?entityType=menu_item&action=create`, { headers: { Cookie: managerCookie } });
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.entries.some((e: { entity_id: number }) => e.entity_id === created.item.id)).toBe(true);
  });
});

// ─── Menu Item Image Upload ──────────────────────────────────────────────────

describe("Menu Item Upload", () => {
  const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  it("POST /api/menu-items/upload — 403 for cashier", async () => {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(TINY_PNG_BASE64, "base64")], { type: "image/png" }), "test.png");
    const res = await fetch(`${BASE}/api/menu-items/upload`, { method: "POST", headers: { Cookie: cashierCookie }, body: form });
    expect(res.status).toBe(403);
  });

  it("POST /api/menu-items/upload — 400 for unsupported file type", async () => {
    const form = new FormData();
    form.append("file", new Blob(["not an image"], { type: "text/plain" }), "test.txt");
    const res = await fetch(`${BASE}/api/menu-items/upload`, { method: "POST", headers: { Cookie: managerCookie }, body: form });
    expect(res.status).toBe(400);
  });

  it("POST /api/menu-items/upload — stores and serves a valid image", async () => {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(TINY_PNG_BASE64, "base64")], { type: "image/png" }), "test.png");
    const res = await fetch(`${BASE}/api/menu-items/upload`, { method: "POST", headers: { Cookie: managerCookie }, body: form });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.url).toMatch(/^\/api\/uploads\/[a-f0-9-]+\.png$/);

    // Publicly readable, no auth required (customer /order page has no session).
    const fetched = await fetch(`${BASE}${data.url}`);
    expect(fetched.ok).toBe(true);
    expect(fetched.headers.get("content-type")).toBe("image/png");
  });
});
