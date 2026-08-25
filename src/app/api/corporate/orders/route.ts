import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("any", req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";
    const status = searchParams.get("status");

    const db = getDb();
    const todayStr = new Date().toISOString().split("T")[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let query = `
      SELECT o.id, o.receipt_no, o.subtotal_tsh, o.total_tsh, o.payment_method, o.order_type, o.order_channel,
             o.is_scheduled, o.scheduled_date, o.delivery_window_start, o.delivery_window_end, o.target_dispatch_at,
             o.company_name, o.attendee_count, o.customer_name, o.customer_phone, o.customer_address, o.special_notes,
             o.fulfillment_status, o.status, o.created_at, o.corporate_account_id,
             cod.service_context, cod.delivery_window, cod.building_name, cod.floor_office, cod.delivery_instructions,
             cod.po_reference_number, cod.billing_status, cod.guest_contact_email,
             ca.company_name as registered_company_name, ca.payment_terms
      FROM orders o
      LEFT JOIN corporate_order_details cod ON cod.order_id = o.id
      LEFT JOIN corporate_accounts ca ON ca.id = o.corporate_account_id
      WHERE (o.order_channel = 'corporate' OR o.is_scheduled = 1)
    `;

    const params: any[] = [];

    if (filter === "today") {
      query += " AND (o.scheduled_date = ? OR (o.scheduled_date IS NULL AND date(o.created_at) = ?))";
      params.push(todayStr, todayStr);
    } else if (filter === "tomorrow") {
      query += " AND o.scheduled_date = ?";
      params.push(tomorrowStr);
    } else if (filter === "this_week") {
      query += " AND o.scheduled_date >= ? AND o.scheduled_date <= date(?, '+7 days')";
      params.push(todayStr, todayStr);
    } else if (filter === "awaiting_confirmation") {
      query += " AND o.fulfillment_status = 'pending'";
    } else if (filter === "scheduled") {
      query += " AND o.fulfillment_status = 'confirmed'";
    }

    if (status && status !== "all") {
      query += " AND o.fulfillment_status = ?";
      params.push(status);
    }

    query += " ORDER BY CASE WHEN o.scheduled_date IS NOT NULL THEN o.scheduled_date ELSE date(o.created_at) END ASC, o.delivery_window_start ASC, o.id DESC";

    const orders = db.prepare(query).all(...params) as any[];

    // Fetch line items for each order
    for (const ord of orders) {
      const items = db.prepare(`
        SELECT id, menu_item_id, name_snapshot, unit_price_tsh, quantity, line_total_tsh, options_snapshot, notes
        FROM order_items
        WHERE order_id = ?
      `).all(ord.id);
      ord.items = items;
    }

    return NextResponse.json({
      success: true,
      orders,
      today: todayStr,
      tomorrow: tomorrowStr,
    });
  } catch (error: any) {
    if (error.message?.includes("Authentication") || error.message?.includes("role")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[api/corporate/orders] Error fetching corporate orders:", error);
    return NextResponse.json({ error: "Failed to load corporate orders." }, { status: 500 });
  }
}
