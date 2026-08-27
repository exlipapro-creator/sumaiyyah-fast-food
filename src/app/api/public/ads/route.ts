import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const url = new URL(req.url);
    const placementKey = url.searchParams.get("placement");

    const settings = (db.prepare(
      "SELECT adsense_enabled, adsense_client_id, adsense_slot_top, adsense_slot_infeed, adsense_slot_sidebar, direct_ads_enabled FROM restaurant_settings WHERE id = 1"
    ).get() || {}) as Record<string, unknown>;

    const adsenseEnabled = settings.adsense_enabled === 1;
    const directAdsEnabled = settings.direct_ads_enabled !== 0;

    let directCampaign = null;
    if (directAdsEnabled && placementKey) {
      const today = new Date().toISOString().split("T")[0];
      directCampaign = db.prepare(`
        SELECT id, placement_key, sponsor_name, banner_image_url, destination_url, alt_text
        FROM ad_campaigns
        WHERE placement_key = ? 
          AND status = 'ACTIVE'
          AND date(start_date) <= date(?)
          AND date(end_date) >= date(?)
        ORDER BY RANDOM()
        LIMIT 1
      `).get(placementKey, today, today);
    }

    return NextResponse.json(
      {
        adsense: {
          enabled: adsenseEnabled,
          clientId: (settings.adsense_client_id as string) || "",
          slots: {
            top: (settings.adsense_slot_top as string) || "",
            infeed: (settings.adsense_slot_infeed as string) || "",
            sidebar: (settings.adsense_slot_sidebar as string) || "",
          },
        },
        directAdsEnabled,
        directCampaign,
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (err) {
    console.error("[api/public/ads] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
