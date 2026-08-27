import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { sanitizeImageUrl } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("manager", req);
    const { id } = await params;
    const campaignId = Number(id);
    if (!campaignId) return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });

    const body = await req.json();
    const db = getDb();
    const existing = db.prepare("SELECT * FROM ad_campaigns WHERE id = ?").get(campaignId) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Quick status toggle / action
    if (body.quick_action) {
      if (body.quick_action === "APPROVE") {
        db.prepare("UPDATE ad_campaigns SET status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?").run(campaignId);
      } else if (body.quick_action === "REJECT") {
        db.prepare("UPDATE ad_campaigns SET status = 'REJECTED', updated_at = datetime('now') WHERE id = ?").run(campaignId);
      } else if (body.quick_action === "PAUSE") {
        db.prepare("UPDATE ad_campaigns SET status = 'PAUSED', updated_at = datetime('now') WHERE id = ?").run(campaignId);
      } else if (body.quick_action === "ACTIVATE") {
        db.prepare("UPDATE ad_campaigns SET status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?").run(campaignId);
      } else if (body.quick_action === "MARK_PAID") {
        db.prepare("UPDATE ad_campaigns SET payment_status = 'PAID', updated_at = datetime('now') WHERE id = ?").run(campaignId);
      }
      logAudit(db, session, "update", "ad_campaign", campaignId, { quick_action: body.quick_action });
    } else {
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

      const cleanBanner = banner_image_url ? sanitizeImageUrl(banner_image_url) : (existing.banner_image_url as string);
      const cleanDest = destination_url
        ? (destination_url.startsWith("http") ? destination_url.trim() : `https://${destination_url.trim()}`)
        : (existing.destination_url as string);

      db.prepare(`
        UPDATE ad_campaigns
        SET
          placement_key = ?,
          sponsor_name = ?,
          sponsor_email = ?,
          sponsor_phone = ?,
          banner_image_url = ?,
          destination_url = ?,
          alt_text = ?,
          status = ?,
          start_date = ?,
          end_date = ?,
          amount_paid_tsh = ?,
          payment_status = ?,
          payment_reference = ?,
          notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        placement_key || existing.placement_key,
        sponsor_name ? String(sponsor_name).trim() : existing.sponsor_name,
        sponsor_email !== undefined ? String(sponsor_email).trim() : existing.sponsor_email,
        sponsor_phone !== undefined ? String(sponsor_phone).trim() : existing.sponsor_phone,
        cleanBanner,
        cleanDest,
        alt_text !== undefined ? String(alt_text).trim() : existing.alt_text,
        status || existing.status,
        start_date || existing.start_date,
        end_date || existing.end_date,
        amount_paid_tsh !== undefined ? Number(amount_paid_tsh) : existing.amount_paid_tsh,
        payment_status || existing.payment_status,
        payment_reference !== undefined ? (payment_reference ? String(payment_reference).trim() : null) : existing.payment_reference,
        notes !== undefined ? (notes ? String(notes).trim() : null) : existing.notes,
        campaignId
      );

      logAudit(db, session, "update", "ad_campaign", campaignId, { status, payment_status });
    }

    const campaign = db.prepare(`
      SELECT c.*, p.name as placement_name, p.dimensions as placement_dimensions
      FROM ad_campaigns c
      JOIN ad_placements p ON c.placement_key = p.slot_key
      WHERE c.id = ?
    `).get(campaignId);

    return NextResponse.json({ campaign });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/campaigns/[id]] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("manager", req);
    const { id } = await params;
    const campaignId = Number(id);
    if (!campaignId) return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });

    const db = getDb();
    const existing = db.prepare("SELECT id FROM ad_campaigns WHERE id = ?").get(campaignId);
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM ad_campaigns WHERE id = ?").run(campaignId);
    logAudit(db, session, "delete", "ad_campaign", campaignId, { id: campaignId });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[api/marketing/campaigns/[id]] Delete Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
