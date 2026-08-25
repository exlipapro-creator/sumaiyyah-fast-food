import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canTransitionFulfillment, FulfillmentStatus } from "@/lib/order-state";
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
    // Managers can view any order; Cashiers can view their POS orders as well as all online/corporate delivery orders
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(numId);
    return NextResponse.json({ order, items });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Order management: update fulfillment status (kitchen/delivery) or void (manager).
// Restores tracked stock when an order is cancelled or voided.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const { action } = body;

    const db = getDb();
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(numId) as
      | { id: number; status: string; fulfillment_status?: string }
      | undefined;
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "update_status") {
      const session = await requireRole("any", req);
      const nextStatus = body.fulfillment_status as FulfillmentStatus;
      const currentStatus = (order.fulfillment_status || (order.status === "voided" ? "voided" : "confirmed")) as FulfillmentStatus;

      const check = canTransitionFulfillment(currentStatus, nextStatus, session.role as "manager" | "cashier");
      if (!check.allowed) {
        return NextResponse.json({ error: check.error || "Invalid status transition" }, { status: 400 });
      }

      db.transaction(() => {
        // If transitioning to cancelled, restore tracked stock if not already cancelled/voided
        if (nextStatus === "cancelled" && currentStatus !== "cancelled" && currentStatus !== "voided") {
          const lineItems = db.prepare("SELECT menu_item_id, quantity FROM order_items WHERE order_id = ?").all(numId) as {
            menu_item_id: number;
            quantity: number;
          }[];
          for (const li of lineItems) {
            db.prepare(
              "UPDATE menu_items SET stock_qty = stock_qty + ? WHERE id = ? AND track_stock = 1"
            ).run(li.quantity, li.menu_item_id);
          }
        }

        db.prepare("UPDATE orders SET fulfillment_status = ? WHERE id = ?").run(nextStatus, numId);
        logAudit(db, session, "update_fulfillment_status", "order", numId, {
          from: currentStatus,
          to: nextStatus,
        });
      })();

      const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(numId);
      return NextResponse.json({ order: updated });
    }

    if (action === "void") {
      const session = await requireRole("manager", req);
      const { reason } = body;
      if (typeof reason !== "string" || reason.trim().length < 3) {
        return NextResponse.json({ error: "A void reason is required" }, { status: 400 });
      }
      if (order.status === "voided") {
        return NextResponse.json({ error: "Order is already voided" }, { status: 400 });
      }

      db.transaction(() => {
        db.prepare(
          "UPDATE orders SET status = 'voided', fulfillment_status = 'voided', voided_at = datetime('now'), voided_by = ?, void_reason = ? WHERE id = ?"
        ).run(session.id, reason.trim(), numId);

        // If it wasn't already cancelled (which would have already restored stock), restore stock now
        if (order.fulfillment_status !== "cancelled") {
          const lineItems = db.prepare("SELECT menu_item_id, quantity FROM order_items WHERE order_id = ?").all(numId) as {
            menu_item_id: number;
            quantity: number;
          }[];
          for (const li of lineItems) {
            db.prepare(
              "UPDATE menu_items SET stock_qty = stock_qty + ? WHERE id = ? AND track_stock = 1"
            ).run(li.quantity, li.menu_item_id);
          }
        }

        logAudit(db, session, "void", "order", numId, { reason: reason.trim() });
      })();

      const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(numId);
      return NextResponse.json({ order: updated });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
