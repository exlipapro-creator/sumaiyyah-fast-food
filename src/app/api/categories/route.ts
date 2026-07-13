import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("any", req);
    const db = getDb();
    const categories = db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC").all();
    return NextResponse.json({ categories });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("manager", req);
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name required" }, { status: 400 });
    }
    const db = getDb();
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order),0) as m FROM categories").get() as { m: number };
    const result = db.prepare("INSERT INTO categories (name, sort_order) VALUES (?, ?)").run(name.trim(), maxOrder.m + 1);
    const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
    logAudit(db, session, "create", "category", result.lastInsertRowid as number, { name: name.trim() });
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
