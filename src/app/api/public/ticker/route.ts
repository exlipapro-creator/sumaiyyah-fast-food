import { NextResponse } from "next/server";
import { getDb, getHeaderTickerData } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public Endpoint: Returns computed store operating hours and active announcements.
 * Compatible with Supabase Postgres function `get_header_ticker_data()`.
 */
export async function GET() {
  try {
    const db = getDb();
    const tickerData = getHeaderTickerData(db);
    return NextResponse.json(tickerData, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Failed to fetch public header ticker data:", error);
    return NextResponse.json(
      {
        is_open: true,
        status_label: "LIVE",
        default_fallback_text: "Top Kitchen Live — Fresh Meals & Juices Delivered Daily",
        opening_time: "08:00:00",
        closing_time: "23:00:00",
        timezone: "Africa/Dar_es_Salaam",
        is_manual_override: false,
        manual_status: "OPEN",
        current_local_time: "12:00:00",
        promotions_enabled: false,
        promotions_count: 0,
        announcements: [],
      },
      { status: 200 }
    );
  }
}
