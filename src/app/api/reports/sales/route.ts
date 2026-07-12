import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
    const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);

    const totals = db.prepare(`
      SELECT COALESCE(SUM(total_tsh), 0) as totalRevenue, COUNT(*) as totalOrders,
             COALESCE(SUM(oi_total.qty), 0) as totalPlates
      FROM orders o
      LEFT JOIN (SELECT order_id, SUM(quantity) as qty FROM order_items GROUP BY order_id) oi_total ON oi_total.order_id = o.id
      WHERE date(o.created_at) BETWEEN ? AND ?
    `).get(from, to);

    const perItem = db.prepare(`
      SELECT oi.menu_item_id as id, oi.name_snapshot as name,
             SUM(oi.quantity) as qty, SUM(oi.line_total_tsh) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.created_at) BETWEEN ? AND ?
      GROUP BY oi.menu_item_id, oi.name_snapshot
      ORDER BY revenue DESC
    `).all(from, to);

    return NextResponse.json({ totals, perItem });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
