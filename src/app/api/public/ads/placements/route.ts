import { NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const placements = db.prepare(`
      SELECT id, slot_key, name, dimensions, location_description, daily_price_tsh, weekly_price_tsh, monthly_price_tsh, is_active
      FROM ad_placements
      WHERE is_active = 1
      ORDER BY id ASC
    `).all();

    const settings = (db.prepare("SELECT direct_ads_enabled FROM restaurant_settings WHERE id = 1").get() || { direct_ads_enabled: 1 }) as { direct_ads_enabled: number };

    return NextResponse.json({
      direct_ads_enabled: settings.direct_ads_enabled !== 0,
      placements,
    });
  } catch (err) {
    console.error("[api/public/ads/placements] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
