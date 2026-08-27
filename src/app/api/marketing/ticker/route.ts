import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import getDb, { getHeaderTickerData, StoreSettings, Announcement } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET: Returns store settings, all announcements, and computed status
export async function GET(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();

    let settings = db.prepare("SELECT * FROM store_settings WHERE id = 1").get() as StoreSettings | undefined;
    if (!settings) {
      db.prepare(`
        INSERT INTO store_settings (id, is_manual_override, manual_status, opening_time, closing_time, timezone, default_fallback_text)
        VALUES (1, 0, 'OPEN', '08:00:00', '23:00:00', 'Africa/Dar_es_Salaam', 'Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam')
      `).run();
      settings = db.prepare("SELECT * FROM store_settings WHERE id = 1").get() as StoreSettings;
    }

    const announcements = db.prepare(`
      SELECT * FROM announcements ORDER BY priority ASC, created_at DESC
    `).all() as Announcement[];

    const computed = getHeaderTickerData(db);

    return NextResponse.json({
      settings: {
        id: settings.id,
        is_manual_override: Boolean(settings.is_manual_override),
        manual_status: settings.manual_status,
        opening_time: settings.opening_time,
        closing_time: settings.closing_time,
        timezone: settings.timezone,
        default_fallback_text: settings.default_fallback_text,
        updated_at: settings.updated_at,
      },
      announcements: announcements.map((a) => ({
        id: a.id,
        text: a.text,
        highlight: a.highlight || "",
        is_active: Boolean(a.is_active),
        priority: a.priority,
        start_time: a.start_time || null,
        end_time: a.end_time || null,
        created_at: a.created_at,
      })),
      computed,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/marketing/ticker error:", err);
    return NextResponse.json({ error: "Failed to load ticker settings" }, { status: 500 });
  }
}

// PUT / PATCH: Update Store Settings (Override, Opening/Closing Hours, Fallback Text, Timezone)
export async function PUT(req: NextRequest) {
  try {
    const user = await requireRole("manager", req);
    const db = getDb();
    const body = await req.json();

    const {
      is_manual_override,
      manual_status,
      opening_time,
      closing_time,
      timezone,
      default_fallback_text,
    } = body;

    const current = db.prepare("SELECT * FROM store_settings WHERE id = 1").get() as StoreSettings | undefined;

    const newOverride = is_manual_override !== undefined ? (is_manual_override ? 1 : 0) : (current?.is_manual_override ?? 0);
    const newStatus = manual_status === "CLOSED" ? "CLOSED" : "OPEN";
    const newOpenTime = opening_time ? String(opening_time).trim() : (current?.opening_time || "08:00:00");
    const newCloseTime = closing_time ? String(closing_time).trim() : (current?.closing_time || "23:00:00");
    const newTimezone = timezone ? String(timezone).trim() : (current?.timezone || "Africa/Dar_es_Salaam");
    const newFallback = default_fallback_text !== undefined ? String(default_fallback_text).trim() : (current?.default_fallback_text || "Top Kitchen Live — Fresh Meals & Juices Delivered Daily");

    db.prepare(`
      INSERT INTO store_settings (id, is_manual_override, manual_status, opening_time, closing_time, timezone, default_fallback_text, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        is_manual_override = excluded.is_manual_override,
        manual_status = excluded.manual_status,
        opening_time = excluded.opening_time,
        closing_time = excluded.closing_time,
        timezone = excluded.timezone,
        default_fallback_text = excluded.default_fallback_text,
        updated_at = datetime('now')
    `).run(newOverride, newStatus, newOpenTime, newCloseTime, newTimezone, newFallback);

    db.prepare(`
      INSERT INTO audit_log (user_id, user_name, action, entity_type, entity_id, details)
      VALUES (?, ?, 'UPDATE_STORE_SETTINGS', 'store_settings', 1, ?)
    `).run(
      user.id,
      user.name,
      JSON.stringify({ is_manual_override: newOverride, manual_status: newStatus, opening_time: newOpenTime, closing_time: newCloseTime })
    );

    const computed = getHeaderTickerData(db);
    return NextResponse.json({ success: true, computed });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PUT /api/marketing/ticker error:", err);
    return NextResponse.json({ error: "Failed to update store settings" }, { status: 500 });
  }
}

// POST: Add new announcement or update announcement
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("manager", req);
    const db = getDb();
    const body = await req.json();

    const { id, text, highlight, priority, is_active, start_time, end_time } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Announcement text is required" }, { status: 400 });
    }

    if (id) {
      // Update existing
      db.prepare(`
        UPDATE announcements
        SET text = ?, highlight = ?, priority = ?, is_active = ?, start_time = ?, end_time = ?
        WHERE id = ?
      `).run(
        text.trim(),
        highlight ? highlight.trim() : null,
        Number(priority) || 1,
        is_active ? 1 : 0,
        start_time || null,
        end_time || null,
        id
      );
    } else {
      // Create new
      const newId = "ann_" + crypto.randomUUID();
      db.prepare(`
        INSERT INTO announcements (id, text, highlight, is_active, priority, start_time, end_time, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `).run(
        newId,
        text.trim(),
        highlight ? highlight.trim() : null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        Number(priority) || 1,
        start_time || null,
        end_time || null,
        user.id
      );
    }

    const computed = getHeaderTickerData(db);
    return NextResponse.json({ success: true, computed });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/marketing/ticker error:", err);
    return NextResponse.json({ error: "Failed to save announcement" }, { status: 500 });
  }
}

// DELETE: Delete an announcement by ID
export async function DELETE(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
    }

    db.prepare("DELETE FROM announcements WHERE id = ?").run(id);

    const computed = getHeaderTickerData(db);
    return NextResponse.json({ success: true, computed });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("DELETE /api/marketing/ticker error:", err);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
