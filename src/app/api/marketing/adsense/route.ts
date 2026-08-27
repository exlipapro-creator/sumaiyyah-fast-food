import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole("manager", req);
    const body = await req.json();
    const {
      adsense_enabled,
      adsense_client_id,
      adsense_slot_top,
      adsense_slot_infeed,
      adsense_slot_sidebar,
      direct_ads_enabled,
    } = body;

    const db = getDb();
    db.prepare(`
      UPDATE restaurant_settings
      SET 
        adsense_enabled = ?,
        adsense_client_id = ?,
        adsense_slot_top = ?,
        adsense_slot_infeed = ?,
        adsense_slot_sidebar = ?,
        direct_ads_enabled = ?,
        updated_at = datetime('now')
      WHERE id = 1
    `).run(
      adsense_enabled ? 1 : 0,
      adsense_client_id ? String(adsense_client_id).trim() : "",
      adsense_slot_top ? String(adsense_slot_top).trim() : "",
      adsense_slot_infeed ? String(adsense_slot_infeed).trim() : "",
      adsense_slot_sidebar ? String(adsense_slot_sidebar).trim() : "",
      direct_ads_enabled !== false ? 1 : 0
    );

    logAudit(db, session, "update", "adsense_settings", 1, {
      adsense_enabled: Boolean(adsense_enabled),
      direct_ads_enabled: direct_ads_enabled !== false,
    });

    const rawSettings = (db.prepare("SELECT * FROM restaurant_settings WHERE id = 1").get() || {}) as Record<string, unknown>;
    return NextResponse.json({
      settings: {
        adsense_enabled: rawSettings.adsense_enabled === 1,
        adsense_client_id: (rawSettings.adsense_client_id as string) || "",
        adsense_slot_top: (rawSettings.adsense_slot_top as string) || "",
        adsense_slot_infeed: (rawSettings.adsense_slot_infeed as string) || "",
        adsense_slot_sidebar: (rawSettings.adsense_slot_sidebar as string) || "",
        direct_ads_enabled: rawSettings.direct_ads_enabled !== 0,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/adsense] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
