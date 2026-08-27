import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { sanitizeImageUrl } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("manager", req);
    const body = await req.json();
    const {
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
      payment_reference,
      notes,
    } = body;

    if (!placement_key || !sponsor_name || !banner_image_url || !destination_url || !start_date || !end_date) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const cleanBanner = sanitizeImageUrl(banner_image_url);
    const cleanDest = destination_url.startsWith("http://") || destination_url.startsWith("https://") 
      ? destination_url.trim() 
      : `https://${destination_url.trim()}`;

    const db = getDb();
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
        payment_reference,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      placement_key,
      String(sponsor_name).trim(),
      String(sponsor_email || "").trim(),
      String(sponsor_phone || "").trim(),
      cleanBanner,
      cleanDest,
      String(alt_text || sponsor_name).trim(),
      status || "ACTIVE",
      start_date,
      end_date,
      Number(amount_paid_tsh) || 0,
      payment_status || "PAID",
      payment_reference ? String(payment_reference).trim() : null,
      notes ? String(notes).trim() : null
    );

    const campaign = db.prepare(`
      SELECT c.*, p.name as placement_name, p.dimensions as placement_dimensions
      FROM ad_campaigns c
      JOIN ad_placements p ON c.placement_key = p.slot_key
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    logAudit(db, session, "create", "ad_campaign", result.lastInsertRowid as number, {
      sponsor_name: String(sponsor_name).trim(),
      placement_key,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/campaigns] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
