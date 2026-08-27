import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { sanitizeImageUrl } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      placement_key,
      sponsor_name,
      sponsor_email,
      sponsor_phone,
      banner_image_url,
      destination_url,
      alt_text,
      start_date,
      end_date,
      notes,
    } = body;

    if (!placement_key || !sponsor_name || !sponsor_email || !sponsor_phone || !banner_image_url || !destination_url || !start_date || !end_date) {
      return NextResponse.json({ error: "Tafadhali jaza taarifa zote muhimu za kampeni (All required fields must be filled)" }, { status: 400 });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Tarehe ya mwisho lazima iwe baada ya tarehe ya kuanza (Invalid date range)" }, { status: 400 });
    }

    const db = getDb();
    const placement = db.prepare("SELECT * FROM ad_placements WHERE slot_key = ? AND is_active = 1").get(placement_key) as {
      daily_price_tsh: number;
      weekly_price_tsh: number;
      monthly_price_tsh: number;
    } | undefined;

    if (!placement) {
      return NextResponse.json({ error: "Nafasi ya tangazo haipatikani kwa sasa (Invalid ad placement slot)" }, { status: 400 });
    }

    // Calculate total days inclusive
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let amountPaidTsh = 0;
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30);
      const remDays = diffDays % 30;
      amountPaidTsh = (months * placement.monthly_price_tsh) + (remDays * placement.daily_price_tsh);
    } else if (diffDays >= 7) {
      const weeks = Math.floor(diffDays / 7);
      const remDays = diffDays % 7;
      amountPaidTsh = (weeks * placement.weekly_price_tsh) + (remDays * placement.daily_price_tsh);
    } else {
      amountPaidTsh = diffDays * placement.daily_price_tsh;
    }

    const cleanBanner = sanitizeImageUrl(banner_image_url);
    const cleanDest = destination_url.startsWith("http://") || destination_url.startsWith("https://") 
      ? destination_url.trim() 
      : `https://${destination_url.trim()}`;

    const result = db.prepare(`
      INSERT INTO ad_campaigns (
        placement_key,
        sponsor_name,
        sponsor_email,
        sponsor_phone,
        banner_image_url,
        destination_url,
        alt_text,
        status,
        start_date,
        end_date,
        amount_paid_tsh,
        payment_status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, 'UNPAID', ?)
    `).run(
      placement_key,
      String(sponsor_name).trim(),
      String(sponsor_email).trim(),
      String(sponsor_phone).trim(),
      cleanBanner,
      cleanDest,
      String(alt_text || sponsor_name).trim(),
      start_date,
      end_date,
      amountPaidTsh,
      notes ? String(notes).trim() : null
    );

    return NextResponse.json({
      success: true,
      campaign_id: result.lastInsertRowid,
      total_days: diffDays,
      amount_tsh: amountPaidTsh,
      message: "Ombi lako la tangazo limepokelewa kikamilifu na linakaguliwa na wasimamizi wa Sumaiyyah. Utapokea mrejesho hivi punde!",
    }, { status: 201 });
  } catch (err) {
    console.error("[api/public/ads/book] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
