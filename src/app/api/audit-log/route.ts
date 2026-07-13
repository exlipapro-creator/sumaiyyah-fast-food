import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();
    const url = new URL(req.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const entityType = url.searchParams.get("entityType") || "";
    const action = url.searchParams.get("action") || "";

    let where = "WHERE 1=1";
    const params: string[] = [];
    if (entityType) { where += " AND entity_type = ?"; params.push(entityType); }
    if (action) { where += " AND action = ?"; params.push(action); }

    const total = (db.prepare(`SELECT COUNT(*) as n FROM audit_log ${where}`).get(...params) as { n: number }).n;
    const offset = (page - 1) * PAGE_SIZE;
    const entries = db.prepare(
      `SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(...params, PAGE_SIZE, offset);

    return NextResponse.json({ entries, total, page, pageSize: PAGE_SIZE });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
