import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("any", req);
    const db = getDb();

    const invoices = db.prepare(`
      SELECT i.id, i.invoice_number, i.corporate_account_id, i.order_id, i.status, i.subtotal_tsh,
             i.tax_amount_tsh, i.total_amount_tsh, i.amount_paid_tsh, i.issued_at, i.due_date, i.paid_at, i.notes,
             ca.company_name, ca.account_code, ca.payment_terms, ca.billing_email, ca.billing_phone,
             o.receipt_no, o.scheduled_date, o.delivery_window_start
      FROM invoices i
      JOIN corporate_accounts ca ON ca.id = i.corporate_account_id
      LEFT JOIN orders o ON o.id = i.order_id
      ORDER BY i.id DESC
    `).all() as any[];

    for (const inv of invoices) {
      const payments = db.prepare(`
        SELECT id, amount_tsh, payment_method, reference_number, paid_at, notes
        FROM invoice_payments
        WHERE invoice_id = ?
        ORDER BY id DESC
      `).all(inv.id);
      inv.payments = payments;
    }

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    if (error.message?.includes("Authentication") || error.message?.includes("role")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[api/corporate/invoices] Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to load corporate invoices." }, { status: 500 });
  }
}
