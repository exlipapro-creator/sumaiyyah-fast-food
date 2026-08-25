import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

class InsufficientStockError extends Error {
  constructor(public itemName: string) {
    super(`Not enough stock for "${itemName}"`);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole("any", req);
    const db = getDb();
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const status = url.searchParams.get("status");
    let query = `
      SELECT o.*, u.name as cashier_name,
             cod.service_context, cod.delivery_window, cod.building_name, cod.floor_office,
             cod.po_reference_number, cod.billing_status,
             inv.invoice_number, inv.status as invoice_status
      FROM orders o
      JOIN users u ON o.cashier_id = u.id
      LEFT JOIN corporate_order_details cod ON cod.order_id = o.id
      LEFT JOIN invoices inv ON inv.order_id = o.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    // Non-managers may see their own POS orders + all web/corporate delivery orders
    if (session.role !== "manager") {
      query += " AND (o.cashier_id = ? OR o.order_channel IN ('online', 'corporate') OR o.is_scheduled = 1)";
      params.push(session.id);
    }
    if (from) { query += " AND date(o.created_at) >= ?"; params.push(from); }
    if (to) { query += " AND date(o.created_at) <= ?"; params.push(to); }
    if (status && ["completed", "voided"].includes(status)) { query += " AND o.status = ?"; params.push(status); }
    query += " ORDER BY o.created_at DESC LIMIT 200";
    const orders = db.prepare(query).all(...params);
    return NextResponse.json({ orders });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("any", req);
    const { items, discount_type, discount_value, payment_method } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }
    if (!payment_method || !["cash", "mobile", "card"].includes(payment_method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const db = getDb();
    const dt = discount_type || "none";
    if (!["none", "percent", "fixed"].includes(dt)) {
      return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
    }
    const dv = Number(discount_value ?? 0);
    if (!Number.isFinite(dv) || dv < 0) {
      return NextResponse.json({ error: "Invalid discount value" }, { status: 400 });
    }

    // Compute subtotal from authoritative prices
    let subtotal = 0;
    const lineItems: { menu_item_id: number; name_snapshot: string; unit_price_tsh: number; quantity: number; line_total_tsh: number; trackStock: boolean }[] = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Invalid item" }, { status: 400 });
      }
      const menuItemId = Number(item.menu_item_id);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(menuItemId) || menuItemId < 1) {
        return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
      }
      const menuItem = db.prepare("SELECT * FROM menu_items WHERE id = ? AND active = 1 AND deleted = 0").get(menuItemId) as
        | { id: number; name: string; price_tsh: number; track_stock: number; stock_qty: number }
        | undefined;
      if (!menuItem) {
        return NextResponse.json({ error: `Item ${menuItemId} not available` }, { status: 400 });
      }
      if (menuItem.track_stock && menuItem.stock_qty < quantity) {
        return NextResponse.json(
          { error: `Only ${menuItem.stock_qty} left of "${menuItem.name}"` },
          { status: 400 }
        );
      }
      const lineTotal = menuItem.price_tsh * quantity;
      subtotal += lineTotal;
      lineItems.push({
        menu_item_id: menuItem.id,
        name_snapshot: menuItem.name,
        unit_price_tsh: menuItem.price_tsh,
        quantity: quantity,
        line_total_tsh: lineTotal,
        trackStock: !!menuItem.track_stock,
      });
    }

    let discountAmount = 0;
    // Clamp the effective discount value so both the computed amount AND the
    // persisted discount_value field stay within valid bounds (percent 0-100,
    // fixed 0-subtotal).
    let effectiveDv = dv;
    if (dt === "percent") {
      effectiveDv = Math.min(100, Math.max(0, dv));
      discountAmount = Math.round(subtotal * effectiveDv / 100);
    } else if (dt === "fixed") {
      effectiveDv = Math.min(subtotal, Math.max(0, dv));
      discountAmount = effectiveDv;
    } else {
      effectiveDv = 0;
    }
    const total = subtotal - discountAmount;

    // Generate receipt number YYYY-NNNN
    const year = new Date().getFullYear();
    const result = db.transaction(() => {
      const maxSeq = db.prepare(
        `SELECT COALESCE(MAX(CAST(substr(receipt_no, 6) AS INTEGER)), 0) as m FROM orders WHERE receipt_no LIKE ?`
      ).get(`${year}-%`) as { m: number };
      const seq = maxSeq.m + 1;
      const receipt_no = `${year}-${String(seq).padStart(4, "0")}`;

      const orderResult = db.prepare(`
        INSERT INTO orders (receipt_no, cashier_id, subtotal_tsh, discount_type, discount_value, discount_amount_tsh, total_tsh, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(receipt_no, session.id, subtotal, dt, effectiveDv, discountAmount, total, payment_method);

      const orderId = orderResult.lastInsertRowid;
      for (const li of lineItems) {
        db.prepare(`
          INSERT INTO order_items (order_id, menu_item_id, name_snapshot, unit_price_tsh, quantity, line_total_tsh)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(orderId, li.menu_item_id, li.name_snapshot, li.unit_price_tsh, li.quantity, li.line_total_tsh);

        // Conditional decrement: only commits if enough stock remains at the
        // moment of the write, re-checked here (not just in the earlier
        // validation pass) so a concurrent order can't oversell the last units.
        if (li.trackStock) {
          const stockUpdate = db.prepare(
            "UPDATE menu_items SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?"
          ).run(li.quantity, li.menu_item_id, li.quantity);
          if (stockUpdate.changes === 0) {
            throw new InsufficientStockError(li.name_snapshot);
          }
        }
      }

      return { orderId, receipt_no };
    })();

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(result.orderId);
    const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(result.orderId);

    return NextResponse.json({ order, items: orderItems, receipt: { receipt_no: result.receipt_no } }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof InsufficientStockError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
