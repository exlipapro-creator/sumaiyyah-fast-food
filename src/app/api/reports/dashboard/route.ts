import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("any", req);
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const yearMonth = new Date().toISOString().slice(0, 7);

    const revenueToday = (db.prepare(
      "SELECT COALESCE(SUM(total_tsh), 0) as v FROM orders WHERE date(created_at) = ?"
    ).get(today) as { v: number }).v;

    const platesToday = (db.prepare(
      "SELECT COALESCE(SUM(oi.quantity), 0) as v FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE date(o.created_at) = ?"
    ).get(today) as { v: number }).v;

    const transactionsToday = (db.prepare(
      "SELECT COUNT(*) as v FROM orders WHERE date(created_at) = ?"
    ).get(today) as { v: number }).v;

    const supplierMonth = (db.prepare(
      "SELECT COALESCE(SUM(amount_tsh), 0) as v FROM supplier_payments WHERE strftime('%Y-%m', paid_on) = ?"
    ).get(yearMonth) as { v: number }).v;

    const profitMonth = revenueToday - supplierMonth;

    return NextResponse.json({ revenueToday, platesToday, transactionsToday, supplierMonth, profitMonth });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
