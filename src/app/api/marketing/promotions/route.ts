import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("manager", req);
    const body = await req.json();
    const { code, title, description, discount_type, discount_value, min_order_tsh, badge, active } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "Promotion code required" }, { status: 400 });
    }
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    if (!["percent", "fixed"].includes(discount_type)) {
      return NextResponse.json({ error: "Discount type must be 'percent' or 'fixed'" }, { status: 400 });
    }
    const val = Number(discount_value);
    if (!Number.isInteger(val) || val <= 0) {
      return NextResponse.json({ error: "Discount value must be a positive integer" }, { status: 400 });
    }
    if (discount_type === "percent" && val > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
    }
    const minOrder = Number(min_order_tsh) || 0;
    if (minOrder < 0) {
      return NextResponse.json({ error: "Minimum order cannot be negative" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "");

    const db = getDb();
    const existing = db.prepare("SELECT id FROM promotions WHERE code = ?").get(cleanCode);
    if (existing) {
      return NextResponse.json({ error: "A promotion with this code already exists" }, { status: 409 });
    }

    const result = db.prepare(`
      INSERT INTO promotions (code, title, description, discount_type, discount_value, min_order_tsh, badge, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanCode,
      title.trim(),
      description ? String(description).trim() : null,
      discount_type,
      val,
      minOrder,
      badge ? String(badge).trim() : null,
      active !== false ? 1 : 0
    );

    const promo = db.prepare("SELECT * FROM promotions WHERE id = ?").get(result.lastInsertRowid);
    logAudit(db, session, "create", "promotion", result.lastInsertRowid as number, { code: cleanCode, discount_type, discount_value: val });

    return NextResponse.json({ promotion: promo }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/promotions] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
