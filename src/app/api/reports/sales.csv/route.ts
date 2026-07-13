import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

// Escape a text value for CSV output and neutralize spreadsheet formula
// injection. A leading =, +, -, @, tab, or CR is treated as a formula by
// Excel/Sheets/LibreOffice, so we prefix such values with a single quote.
function csvCell(value: string): string {
  let v = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(v)) {
    v = "'" + v;
  }
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();
    const url = new URL(req.url);
    const from = url.searchParams.get("from") || new Date().toISOString().slice(0, 10);
    const to = url.searchParams.get("to") || new Date().toISOString().slice(0, 10);

    const perItem = db.prepare(`
      SELECT oi.menu_item_id as id, oi.name_snapshot as name,
             SUM(oi.quantity) as qty, SUM(oi.line_total_tsh) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.created_at) BETWEEN ? AND ? AND o.status = 'completed'
      GROUP BY oi.menu_item_id, oi.name_snapshot
      ORDER BY revenue DESC
    `).all(from, to) as { id: number; name: string; qty: number; revenue: number }[];

    const lines = ["Item ID,Item Name,Quantity Sold,Revenue (TSH)"];
    for (const row of perItem) {
      lines.push(`${row.id},${csvCell(row.name)},${row.qty},${row.revenue}`);
    }
    const csv = lines.join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales-${from}-to-${to}.csv"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
