import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole("manager", req);
    const body = await req.json();
    const enabled = body.enabled === true ? 1 : 0;

    const db = getDb();
    db.prepare("UPDATE restaurant_settings SET promotions_enabled = ?, updated_at = datetime('now') WHERE id = 1").run(enabled);

    logAudit(db, session, "update", "restaurant_settings", 1, {
      promotions_enabled: enabled === 1,
    });

    return NextResponse.json({ success: true, promotions_enabled: enabled === 1 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/promotions-toggle] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
