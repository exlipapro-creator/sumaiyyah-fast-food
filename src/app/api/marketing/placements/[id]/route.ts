import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("manager", req);
    const { id } = await params;
    const placementId = Number(id);
    if (!placementId) return NextResponse.json({ error: "Invalid placement ID" }, { status: 400 });

    const body = await req.json();
    const db = getDb();
    const existing = db.prepare("SELECT * FROM ad_placements WHERE id = ?").get(placementId) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Placement slot not found" }, { status: 404 });
    }

    const { name, dimensions, location_description, daily_price_tsh, weekly_price_tsh, monthly_price_tsh, is_active } = body;

    const cleanName = name ? String(name).trim() : (existing.name as string);
    const cleanDim = dimensions ? String(dimensions).trim() : (existing.dimensions as string);
    const cleanLoc = location_description !== undefined ? (location_description ? String(location_description).trim() : null) : (existing.location_description as string | null);
    const daily = daily_price_tsh !== undefined ? Number(daily_price_tsh) : (existing.daily_price_tsh as number);
    const weekly = weekly_price_tsh !== undefined ? Number(weekly_price_tsh) : (existing.weekly_price_tsh as number);
    const monthly = monthly_price_tsh !== undefined ? Number(monthly_price_tsh) : (existing.monthly_price_tsh as number);
    const active = is_active !== undefined ? (is_active ? 1 : 0) : (existing.is_active as number);

    db.prepare(`
      UPDATE ad_placements
      SET name = ?, dimensions = ?, location_description = ?, daily_price_tsh = ?, weekly_price_tsh = ?, monthly_price_tsh = ?, is_active = ?
      WHERE id = ?
    `).run(cleanName, cleanDim, cleanLoc, daily, weekly, monthly, active, placementId);

    logAudit(db, session, "update", "ad_placement", placementId, { name: cleanName, is_active: active });
    const updated = db.prepare("SELECT * FROM ad_placements WHERE id = ?").get(placementId);

    return NextResponse.json({ placement: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/placements/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
