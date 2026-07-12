import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
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
