import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("manager", req);
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const db = getDb();
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Category name required" }, { status: 400 });
      }
      db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(body.name.trim(), numId);
    }
    if (body.sort_order !== undefined) {
      const so = Number(body.sort_order);
      if (!Number.isInteger(so)) {
        return NextResponse.json({ error: "Invalid sort order" }, { status: 400 });
      }
      db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?").run(so, numId);
    }
    const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(numId);
    return NextResponse.json({ category });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
