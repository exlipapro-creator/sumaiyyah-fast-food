import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { corporate_account_id, name, default_location_id, default_attendee_count, created_by_name, items } = body;

    if (!corporate_account_id || !name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required template fields (account, name, or items)." }, { status: 400 });
    }

    const db = getDb();

    // Verify account exists
    const account = db.prepare("SELECT id FROM corporate_accounts WHERE id = ? AND status = 'ACTIVE'").get(corporate_account_id);
    if (!account) {
      return NextResponse.json({ error: "Active corporate account not found." }, { status: 404 });
    }

    const result = db.transaction(() => {
      const templateResult = db.prepare(`
        INSERT INTO corporate_order_templates (corporate_account_id, name, default_location_id, default_attendee_count, created_by_name)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        corporate_account_id,
        name.trim(),
        default_location_id || null,
        Number(default_attendee_count) || 10,
        created_by_name?.trim() || "Corporate User"
      );

      const templateId = templateResult.lastInsertRowid;

      for (const item of items) {
        db.prepare(`
          INSERT INTO corporate_order_template_items (template_id, menu_item_id, package_id, name_snapshot, quantity, options_snapshot)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          templateId,
          item.menu_item_id || null,
          item.package_id || null,
          item.name || item.name_snapshot || "Item",
          Number(item.quantity) || 1,
          item.options_snapshot ? (typeof item.options_snapshot === "string" ? item.options_snapshot : JSON.stringify(item.options_snapshot)) : null
        );
      }

      return templateId;
    })();

    return NextResponse.json({
      success: true,
      template_id: result,
      message: `Template "${name}" saved successfully.`,
    }, { status: 201 });
  } catch (error) {
    console.error("[api/public/corporate/templates] Error creating template:", error);
    return NextResponse.json({ error: "Failed to save order template." }, { status: 500 });
  }
}
