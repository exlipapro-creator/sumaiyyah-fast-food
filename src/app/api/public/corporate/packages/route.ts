import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { CORPORATE_DELIVERY_WINDOWS } from "@/lib/corporate-rules";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();

    // Fetch active corporate packages
    const packages = db.prepare(`
      SELECT id, name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, image_url, sort_order
      FROM corporate_menu_packages
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
    `).all() as any[];

    // Attach bundled item details
    for (const pkg of packages) {
      const items = db.prepare(`
        SELECT pi.quantity, mi.id as menu_item_id, mi.name, mi.price_tsh, mi.image_url, mi.track_stock, mi.stock_qty
        FROM corporate_menu_package_items pi
        JOIN menu_items mi ON mi.id = pi.menu_item_id
        WHERE pi.package_id = ? AND mi.active = 1 AND mi.deleted = 0
      `).all(pkg.id);
      pkg.items = items;
    }

    // Also fetch regular menu items that are available for bulk ordering
    const individualItems = db.prepare(`
      SELECT mi.id, mi.name, mi.price_tsh, mi.image_url, mi.description, mi.prep_time_min, mi.calories, mi.spiciness, mi.dietary_tags, mi.options_json, mi.track_stock, mi.stock_qty, c.name as category_name
      FROM menu_items mi
      JOIN categories c ON c.id = mi.category_id
      WHERE mi.active = 1 AND mi.deleted = 0
      ORDER BY c.sort_order ASC, mi.sort_order ASC
    `).all() as any[];

    const formattedIndividual = individualItems.map((item) => {
      let options = {};
      let dietary_tags: string[] = [];
      try {
        if (item.options_json) options = JSON.parse(item.options_json);
      } catch {}
      try {
        if (item.dietary_tags) dietary_tags = JSON.parse(item.dietary_tags);
      } catch {}

      return {
        ...item,
        in_stock: !item.track_stock || item.stock_qty > 0,
        options,
        dietary_tags,
      };
    });

    return NextResponse.json({
      success: true,
      packages,
      individual_items: formattedIndividual,
      delivery_windows: CORPORATE_DELIVERY_WINDOWS,
    });
  } catch (error) {
    console.error("[api/public/corporate/packages] Error:", error);
    return NextResponse.json({ error: "Failed to load corporate menu packages." }, { status: 500 });
  }
}
