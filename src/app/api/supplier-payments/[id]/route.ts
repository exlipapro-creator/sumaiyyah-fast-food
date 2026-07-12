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
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.supplier_name !== undefined) {
      if (typeof body.supplier_name !== "string" || !body.supplier_name.trim()) {
        return NextResponse.json({ error: "Supplier name required" }, { status: 400 });
      }
      fields.push("supplier_name = ?"); values.push(body.supplier_name.trim());
    }
    if (body.amount_tsh !== undefined) {
      const amount = Number(body.amount_tsh);
      if (!Number.isInteger(amount) || amount <= 0) {
        return NextResponse.json({ error: "Amount must be a positive integer" }, { status: 400 });
      }
      fields.push("amount_tsh = ?"); values.push(amount);
    }
    if (body.paid_on !== undefined) {
      if (typeof body.paid_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.paid_on)) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      fields.push("paid_on = ?"); values.push(body.paid_on);
    }
    if (body.category !== undefined) {
      if (!["produce", "packaging", "utilities", "other"].includes(body.category)) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      fields.push("category = ?"); values.push(body.category);
    }
    if (body.notes !== undefined) {
      fields.push("notes = ?"); values.push(body.notes === null ? null : String(body.notes));
    }
    if (fields.length > 0) {
      values.push(numId);
      db.prepare(`UPDATE supplier_payments SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    const payment = db.prepare("SELECT * FROM supplier_payments WHERE id = ?").get(numId);
    return NextResponse.json({ payment });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("manager", req);
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = getDb();
    db.prepare("DELETE FROM supplier_payments WHERE id = ?").run(numId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
