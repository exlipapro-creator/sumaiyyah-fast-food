import { describe, it, expect, beforeEach } from "vitest";
import getDb from "@/lib/db";
import { GET as getPublicMenu } from "@/app/api/public/menu/route";
import { POST as postPublicOrder } from "@/app/api/public/orders/route";
import { GET as trackOrder } from "@/app/api/public/orders/track/route";
import { NextRequest } from "next/server";

describe("Customer Ordering & Live Tracking API Suite", () => {
  beforeEach(() => {
    const db = getDb();
    // Ensure promotions table has test data
    db.prepare("INSERT OR IGNORE INTO promotions (id, code, title, description, discount_type, discount_value, min_order_tsh, active) VALUES (1, 'TESTPROMO', 'Test 10%', '10% off for test', 'percent', 10, 1000, 1)").run();
  });

  it("returns public menu with categories and items", async () => {
    const res = await getPublicMenu();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.categories)).toBe(true);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.categories.length).toBeGreaterThan(0);
  });

  it("creates a customer online order with promo discount", async () => {
    const db = getDb();
    const item = db.prepare("SELECT id, price_tsh FROM menu_items WHERE deleted = 0 AND active = 1 LIMIT 1").get() as { id: number; price_tsh: number };
    expect(item).toBeDefined();

    const orderPayload = {
      order_type: "delivery",
      customer_name: "Fatma Kassim",
      customer_phone: "0755123456",
      delivery_address: "Kariakoo, Swahili Street Apt 4",
      payment_method: "mobile",
      promo_code: "KARIBU10",
      notes: "Please call on arrival",
      items: [
        {
          menu_item_id: item.id,
          quantity: 5,
          instructions: "Well done",
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const res = await postPublicOrder(req);
    const data = await res.json();
    if (res.status !== 201) {
      console.error("Order creation failed in test:", data);
    }
    expect(res.status).toBe(201);
    expect(data.receipt_number).toBeDefined();
    expect(data.total_tsh).toBeGreaterThan(0);
    expect(data.subtotal_tsh).toBe(item.price_tsh * 5);

    // Track the order
    const trackReq = new NextRequest(`http://localhost:3000/api/public/orders/track?receipt=${encodeURIComponent(data.receipt_number)}`);
    const trackRes = await trackOrder(trackReq);
    expect(trackRes.status).toBe(200);
    const trackData = await trackRes.json();
    expect(trackData.order.receipt_number).toBe(data.receipt_number);
    expect(trackData.order.customer_name).toBe("Fatma Kassim");
    expect(trackData.order.items.length).toBe(1);
    expect(trackData.order.fulfillment_status).toBe("confirmed");
  });

  it("rejects order with invalid or out-of-stock items", async () => {
    const orderPayload = {
      order_type: "delivery",
      customer_name: "Invalid Test",
      customer_phone: "0700000000",
      payment_method: "cash",
      items: [
        {
          menu_item_id: 999999, // non-existent
          quantity: 1,
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const res = await postPublicOrder(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("decrements stock upon order creation and restores stock when cancelled", async () => {
    const db = getDb();
    // Create a tracked item with initial stock = 10
    const cat = db.prepare("SELECT id FROM categories LIMIT 1").get() as { id: number };
    const insertRes = db.prepare(
      "INSERT INTO menu_items (category_id, name, price_tsh, active, sort_order, track_stock, stock_qty) VALUES (?, 'Stock Test Samosa', 2000, 1, 1, 1, 10)"
    ).run(cat.id);
    const itemId = insertRes.lastInsertRowid as number;

    const orderPayload = {
      order_type: "pickup",
      customer_name: "Stock Tester",
      customer_phone: "0788111222",
      payment_method: "cash",
      items: [
        {
          menu_item_id: itemId,
          quantity: 4,
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const res = await postPublicOrder(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    // Check stock was decremented to 6
    const itemAfterOrder = db.prepare("SELECT stock_qty FROM menu_items WHERE id = ?").get(itemId) as { stock_qty: number };
    expect(itemAfterOrder.stock_qty).toBe(6);

    // Cancel order through PATCH /api/orders/[id]
    const { PATCH: patchOrder } = await import("@/app/api/orders/[id]/route");
    const adminUser = db.prepare("SELECT * FROM users WHERE role = 'manager' LIMIT 1").get() as { id: number; name: string; role: string; email: string; token_version: number };
    const { signToken } = await import("@/lib/auth");
    const { SESSION_COOKIE_NAME } = await import("@/lib/session-secret");
    const token = await signToken({ id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role as "manager", tv: adminUser.token_version });

    const cancelReq = new NextRequest(`http://localhost:3000/api/orders/${data.order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({ action: "update_status", fulfillment_status: "cancelled" }),
    });

    const cancelRes = await patchOrder(cancelReq, { params: Promise.resolve({ id: String(data.order.id) }) });
    expect(cancelRes.status).toBe(200);

    // Check stock was restored back to 10
    const itemAfterCancel = db.prepare("SELECT stock_qty FROM menu_items WHERE id = ?").get(itemId) as { stock_qty: number };
    expect(itemAfterCancel.stock_qty).toBe(10);
  });
});
