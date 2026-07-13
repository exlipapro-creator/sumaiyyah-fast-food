import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("any", req);
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = getDb();
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(numId) as { cashier_id: number } | undefined;
    // Non-managers may only read their own orders (prevents cross-cashier IDOR).
    // Return 404 (not 403) so order existence is not leaked.
    if (!order || (session.role !== "manager" && order.cashier_id !== session.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(numId);
    return NextResponse.json({ order, items });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Manager-only: void a completed order. Requires a reason (accountability for
// till discrepancies) and restores any tracked stock consumed by the order's
// line items so an item wrongly sold as "in stock" doesn't stay short.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("manager", req);
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const { action, reason } = await req.json();
    if (action !== "void") {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
    if (typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json({ error: "A void reason is required" }, { status: 400 });
    }

    const db = getDb();
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(numId) as { id: number; status: string } | undefined;
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (order.status === "voided") {
      return NextResponse.json({ error: "Order is already voided" }, { status: 400 });
    }

    db.transaction(() => {
      db.prepare(
        "UPDATE orders SET status = 'voided', voided_at = datetime('now'), voided_by = ?, void_reason = ? WHERE id = ?"
      ).run(session.id, reason.trim(), numId);

      const lineItems = db.prepare("SELECT menu_item_id, quantity FROM order_items WHERE order_id = ?").all(numId) as {
        menu_item_id: number; quantity: number;
      }[];
      for (const li of lineItems) {
        db.prepare(
          "UPDATE menu_items SET stock_qty = stock_qty + ? WHERE id = ? AND track_stock = 1"
        ).run(li.quantity, li.menu_item_id);
      }

      logAudit(db, session, "void", "order", numId, { reason: reason.trim() });
    })();

    const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(numId);
    return NextResponse.json({ order: updated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
