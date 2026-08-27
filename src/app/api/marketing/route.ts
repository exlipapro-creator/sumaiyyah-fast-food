import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();

    const rawSettings = (db.prepare("SELECT * FROM restaurant_settings WHERE id = 1").get() || {}) as Record<string, unknown>;
    const settings = {
      promotions_enabled: rawSettings.promotions_enabled === 1,
      adsense_enabled: rawSettings.adsense_enabled === 1,
      adsense_client_id: (rawSettings.adsense_client_id as string) || "",
      adsense_slot_top: (rawSettings.adsense_slot_top as string) || "",
      adsense_slot_infeed: (rawSettings.adsense_slot_infeed as string) || "",
      adsense_slot_sidebar: (rawSettings.adsense_slot_sidebar as string) || "",
      direct_ads_enabled: rawSettings.direct_ads_enabled !== 0,
    };

    const promotions = db.prepare("SELECT * FROM promotions ORDER BY id DESC").all();
    const placements = db.prepare("SELECT * FROM ad_placements ORDER BY id ASC").all();
    const campaigns = db.prepare(`
      SELECT c.*, p.name as placement_name, p.dimensions as placement_dimensions
      FROM ad_campaigns c
      JOIN ad_placements p ON c.placement_key = p.slot_key
      ORDER BY c.id DESC
    `).all() as {
      id: number;
      placement_key: string;
      placement_name: string;
      placement_dimensions: string;
      sponsor_name: string;
      sponsor_email: string;
      sponsor_phone: string;
      banner_image_url: string;
      destination_url: string;
      alt_text: string;
      status: string;
      start_date: string;
      end_date: string;
      amount_paid_tsh: number;
      payment_status: string;
      payment_reference: string | null;
      impressions_count: number;
      clicks_count: number;
      notes: string | null;
      created_at: string;
    }[];

    const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions_count || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks_count || 0), 0);
    const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
    const totalDirectRevenueTsh = campaigns
      .filter((c) => c.payment_status === "PAID")
      .reduce((acc, c) => acc + (c.amount_paid_tsh || 0), 0);

    const activePromosCount = (promotions as { active: number }[]).filter((p) => p.active === 1).length;
    const activeCampaignsCount = campaigns.filter((c) => c.status === "ACTIVE").length;
    const pendingCampaignsCount = campaigns.filter((c) => c.status === "PENDING").length;

    return NextResponse.json({
      settings,
      promotions,
      placements,
      campaigns,
      stats: {
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        avg_ctr: avgCtr,
        total_direct_revenue_tsh: totalDirectRevenueTsh,
        active_promos_count: activePromosCount,
        active_campaigns_count: activeCampaignsCount,
        pending_campaigns_count: pendingCampaignsCount,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
