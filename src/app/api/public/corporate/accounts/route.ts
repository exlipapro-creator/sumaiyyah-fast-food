import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Account code is required." }, { status: 400 });
    }

    const db = getDb();
    const account = db.prepare(`
      SELECT id, company_name, legal_name, account_code, billing_email, billing_phone, tax_id, payment_terms, credit_limit_tsh, status
      FROM corporate_accounts
      WHERE account_code = ? AND status = 'ACTIVE'
    `).get(code) as any;

    if (!account) {
      return NextResponse.json({ error: "Corporate account not found or inactive. Please verify code." }, { status: 404 });
    }

    const locations = db.prepare(`
      SELECT id, label, area, building_name, address, floor, office_number, delivery_instructions
      FROM corporate_locations
      WHERE corporate_account_id = ? AND is_active = 1
      ORDER BY id ASC
    `).all(account.id);

    const contacts = db.prepare(`
      SELECT id, full_name, email, phone, role, is_primary
      FROM corporate_contacts
      WHERE corporate_account_id = ? AND is_active = 1
      ORDER BY is_primary DESC, id ASC
    `).all(account.id);

    const templates = db.prepare(`
      SELECT id, name, default_location_id, default_attendee_count, created_by_name, created_at
      FROM corporate_order_templates
      WHERE corporate_account_id = ? AND is_active = 1
      ORDER BY id DESC
    `).all(account.id) as any[];

    for (const t of templates) {
      const items = db.prepare(`
        SELECT id, menu_item_id, package_id, name_snapshot, quantity, options_snapshot
        FROM corporate_order_template_items
        WHERE template_id = ?
      `).all(t.id);
      t.items = items;
    }

    // Fetch past 5 corporate orders for this account
    const pastOrders = db.prepare(`
      SELECT o.id, o.receipt_no, o.total_tsh, o.subtotal_tsh, o.fulfillment_status, o.created_at, o.scheduled_date, o.delivery_window_start, o.delivery_window_end,
             cod.attendee_count, cod.service_context, cod.delivery_window, cod.building_name
      FROM orders o
      JOIN corporate_order_details cod ON cod.order_id = o.id
      WHERE cod.corporate_account_id = ?
      ORDER BY o.id DESC
      LIMIT 5
    `).all(account.id) as any[];

    for (const po of pastOrders) {
      const items = db.prepare(`
        SELECT id, menu_item_id, name_snapshot, unit_price_tsh, quantity, line_total_tsh, options_snapshot
        FROM order_items
        WHERE order_id = ?
      `).all(po.id);
      po.items = items;
    }

    return NextResponse.json({
      success: true,
      account,
      locations,
      contacts,
      templates,
      past_orders: pastOrders,
    });
  } catch (error) {
    console.error("[api/public/corporate/accounts] Error:", error);
    return NextResponse.json({ error: "Failed to look up corporate account." }, { status: 500 });
  }
}
