import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("manager", req);
    const { id } = await params;
    const promoId = Number(id);
    if (!promoId) return NextResponse.json({ error: "Invalid promotion ID" }, { status: 400 });

    const body = await req.json();
    const db = getDb();
    const existing = db.prepare("SELECT * FROM promotions WHERE id = ?").get(promoId) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    // Allow quick active toggle or full update
    if (Object.keys(body).length === 1 && "active" in body) {
      const active = body.active ? 1 : 0;
      db.prepare("UPDATE promotions SET active = ? WHERE id = ?").run(active, promoId);
      logAudit(db, session, "update", "promotion", promoId, { active });
      const updated = db.prepare("SELECT * FROM promotions WHERE id = ?").get(promoId);
      return NextResponse.json({ promotion: updated });
    }

    const { code, title, description, discount_type, discount_value, min_order_tsh, badge, active } = body;
    const cleanCode = code ? String(code).trim().toUpperCase().replace(/\s+/g, "") : (existing.code as string);
    const cleanTitle = title ? String(title).trim() : (existing.title as string);
    const cleanDesc = description !== undefined ? (description ? String(description).trim() : null) : (existing.description as string | null);
    const type = discount_type || (existing.discount_type as string);
    const val = discount_value !== undefined ? Number(discount_value) : (existing.discount_value as number);
    const minOrder = min_order_tsh !== undefined ? Number(min_order_tsh) : (existing.min_order_tsh as number);
    const cleanBadge = badge !== undefined ? (badge ? String(badge).trim() : null) : (existing.badge as string | null);
    const isActive = active !== undefined ? (active ? 1 : 0) : (existing.active as number);

    db.prepare(`
      UPDATE promotions
      SET code = ?, title = ?, description = ?, discount_type = ?, discount_value = ?, min_order_tsh = ?, badge = ?, active = ?
      WHERE id = ?
    `).run(cleanCode, cleanTitle, cleanDesc, type, val, minOrder, cleanBadge, isActive, promoId);

    logAudit(db, session, "update", "promotion", promoId, { code: cleanCode, active: isActive });
    const updated = db.prepare("SELECT * FROM promotions WHERE id = ?").get(promoId);
    return NextResponse.json({ promotion: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/promotions/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("manager", req);
    const { id } = await params;
    const promoId = Number(id);
    if (!promoId) return NextResponse.json({ error: "Invalid promotion ID" }, { status: 400 });

    const db = getDb();
    const existing = db.prepare("SELECT * FROM promotions WHERE id = ?").get(promoId);
    if (!existing) {
      return NextResponse.json({ error: "Promotion not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM promotions WHERE id = ?").run(promoId);
    logAudit(db, session, "delete", "promotion", promoId, { id: promoId });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/promotions/[id]] Delete Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
