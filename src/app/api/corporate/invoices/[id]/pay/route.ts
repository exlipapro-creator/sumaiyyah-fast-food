import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("any", req);
    const resolvedParams = await params;
    const invoiceId = Number(resolvedParams.id);

    if (!Number.isInteger(invoiceId) || invoiceId < 1) {
      return NextResponse.json({ error: "Invalid invoice ID." }, { status: 400 });
    }

    const body = await req.json();
    const { amount_tsh, payment_method = "bank_transfer", reference_number, notes } = body;

    const amount = Number(amount_tsh);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Please enter a valid payment amount." }, { status: 400 });
    }

    const validMethods = ["bank_transfer", "mobile_money", "cash", "card", "cheque"];
    const method = validMethods.includes(payment_method) ? payment_method : "bank_transfer";

    const db = getDb();

    const result = db.transaction(() => {
      const inv = db.prepare(`
        SELECT id, total_amount_tsh, amount_paid_tsh, status FROM invoices WHERE id = ?
      `).get(invoiceId) as { id: number; total_amount_tsh: number; amount_paid_tsh: number; status: string } | undefined;

      if (!inv) {
        throw new Error("Invoice not found.");
      }

      if (inv.status === "PAID" || inv.status === "VOID") {
        throw new Error(`Invoice is already ${inv.status}.`);
      }

      // Record payment
      db.prepare(`
        INSERT INTO invoice_payments (invoice_id, amount_tsh, payment_method, reference_number, recorded_by, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(invoiceId, amount, method, reference_number || null, user.id, notes || null);

      const newPaid = inv.amount_paid_tsh + amount;
      const newStatus = newPaid >= inv.total_amount_tsh ? "PAID" : "PARTIALLY_PAID";
      const paidAt = newStatus === "PAID" ? new Date().toISOString() : null;

      db.prepare(`
        UPDATE invoices
        SET amount_paid_tsh = ?, status = ?, paid_at = COALESCE(paid_at, ?)
        WHERE id = ?
      `).run(newPaid, newStatus, paidAt, invoiceId);

      // Audit log
      db.prepare(`
        INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, details)
        VALUES (?, ?, 'RECORD_INVOICE_PAYMENT', 'invoice', ?, ?)
      `).run(user.id, user.name, invoiceId, `Recorded payment of TZS ${amount.toLocaleString()} via ${method} for invoice #${invoiceId}`);

      return { invoiceId, newStatus, newPaid };
    })();

    return NextResponse.json({
      success: true,
      message: `Payment of TZS ${amount.toLocaleString()} recorded successfully.`,
      status: result.newStatus,
      amount_paid: result.newPaid,
    });
  } catch (error: any) {
    console.error("[api/corporate/invoices/pay] Error recording payment:", error);
    return NextResponse.json({ error: error.message || "Failed to record invoice payment." }, { status: 400 });
  }
}
