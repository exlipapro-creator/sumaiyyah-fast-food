import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const campaignId = Number(body.campaign_id);
    const eventType = String(body.event_type || "").toLowerCase();

    if (!campaignId || !["impression", "click"].includes(eventType)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const db = getDb();
    if (eventType === "impression") {
      db.prepare("UPDATE ad_campaigns SET impressions_count = impressions_count + 1 WHERE id = ?").run(campaignId);
    } else if (eventType === "click") {
      db.prepare("UPDATE ad_campaigns SET clicks_count = clicks_count + 1 WHERE id = ?").run(campaignId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/public/ads/track] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
