import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();
    const url = new URL(req.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const supplier = url.searchParams.get("supplier") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    let where = "WHERE 1=1";
    const params: string[] = [];
    if (supplier) { where += " AND supplier_name LIKE ?"; params.push(`%${supplier}%`); }
    if (from) { where += " AND paid_on >= ?"; params.push(from); }
    if (to) { where += " AND paid_on <= ?"; params.push(to); }

    const total = (db.prepare(`SELECT COUNT(*) as n FROM supplier_payments ${where}`).get(...params) as { n: number }).n;
    const offset = (page - 1) * PAGE_SIZE;
    const payments = db.prepare(
      `SELECT * FROM supplier_payments ${where} ORDER BY paid_on DESC, id DESC LIMIT ? OFFSET ?`
    ).all(...params, PAGE_SIZE, offset);

    return NextResponse.json({ payments, total, page, pageSize: PAGE_SIZE });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("manager", req);
    const { supplier_name, amount_tsh, paid_on, category, notes } = await req.json();
    if (!supplier_name || typeof supplier_name !== "string" || !supplier_name.trim()) {
      return NextResponse.json({ error: "Supplier name required" }, { status: 400 });
    }
    const amount = Number(amount_tsh);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive integer" }, { status: 400 });
    }
    if (typeof paid_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(paid_on)) {
      return NextResponse.json({ error: "Valid date (YYYY-MM-DD) required" }, { status: 400 });
    }
    if (!["produce", "packaging", "utilities", "other"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (notes !== undefined && notes !== null && typeof notes !== "string") {
      return NextResponse.json({ error: "Invalid notes" }, { status: 400 });
    }
    const db = getDb();
    const result = db.prepare(
      "INSERT INTO supplier_payments (supplier_name, amount_tsh, paid_on, category, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(supplier_name.trim(), amount, paid_on, category, notes || null, session.id);
    const payment = db.prepare("SELECT * FROM supplier_payments WHERE id = ?").get(result.lastInsertRowid);
    logAudit(db, session, "create", "supplier_payment", result.lastInsertRowid as number, { supplier_name: supplier_name.trim(), amount_tsh: amount });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
