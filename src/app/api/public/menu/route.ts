import { NextResponse } from "next/server";
import getDb from "@/lib/db";

// Public, unauthenticated endpoint that powers the customer-facing landing page.
// It exposes ONLY active, non-deleted menu items (the same data a cashier sees in
// the POS) grouped by category, so the live menu stays in sync with what staff
// manage in /menu. No prices/names are trusted from the client; this is read-only.
export const dynamic = "force-dynamic";

export interface PublicItem {
  id: number;
  name: string;
  price_tsh: number;
  category_id: number;
  category_name: string;
  in_stock: boolean;
  image_url: string | null;
  description: string;
  is_featured: boolean;
  is_deal: boolean;
  prep_time_min: number;
  calories: number;
  spiciness: string;
  dietary_tags: string[];
  options: {
    variants?: { name: string; price_diff: number }[];
    addons?: { name: string; price: number }[];
  };
  track_stock: boolean;
  stock_qty: number;
}

export async function GET() {
  try {
    const db = getDb();
    const categories = db
      .prepare("SELECT id, name FROM categories ORDER BY sort_order ASC, id ASC")
      .all() as { id: number; name: string }[];

    const rows = db
      .prepare(
        `SELECT mi.id, mi.name, mi.price_tsh, mi.category_id, c.name as category_name, mi.image_url,
                mi.description, mi.is_featured, mi.is_deal, mi.prep_time_min, mi.calories, mi.spiciness,
                mi.dietary_tags, mi.options_json, mi.track_stock, mi.stock_qty,
                CASE WHEN mi.track_stock = 1 AND mi.stock_qty <= 0 THEN 0 ELSE 1 END as in_stock
         FROM menu_items mi
         JOIN categories c ON mi.category_id = c.id
         WHERE mi.deleted = 0 AND mi.active = 1
         ORDER BY c.sort_order ASC, mi.sort_order ASC, mi.id ASC`
      )
      .all() as (Omit<PublicItem, "in_stock" | "is_featured" | "is_deal" | "track_stock" | "dietary_tags" | "options"> & {
        in_stock: number;
        is_featured: number;
        is_deal: number;
        track_stock: number;
        dietary_tags: string | null;
        options_json: string | null;
      })[];

    const items: PublicItem[] = rows.map((r) => {
      let dietaryTags: string[] = [];
      try {
        if (r.dietary_tags) dietaryTags = JSON.parse(r.dietary_tags);
      } catch {}

      let options: { variants?: { name: string; price_diff: number }[]; addons?: { name: string; price: number }[] } = {};
      try {
        if (r.options_json) options = JSON.parse(r.options_json);
      } catch {}

      return {
        id: r.id,
        name: r.name,
        price_tsh: r.price_tsh,
        category_id: r.category_id,
        category_name: r.category_name,
        in_stock: r.in_stock === 1,
        image_url: r.image_url,
        description: r.description || `Fresh and delicious ${r.name}`,
        is_featured: r.is_featured === 1,
        is_deal: r.is_deal === 1,
        prep_time_min: r.prep_time_min || 12,
        calories: r.calories || 350,
        spiciness: r.spiciness || "Mild",
        dietary_tags: dietaryTags.length > 0 ? dietaryTags : ["Halal"],
        options,
        track_stock: r.track_stock === 1,
        stock_qty: r.stock_qty || 0,
      };
    });

    const rawSettings = (db.prepare("SELECT * FROM restaurant_settings WHERE id = 1").get() || {}) as Record<string, unknown>;
    const settings = {
      name: (rawSettings.name as string) || "Sumaiyyah Fast Food",
      tagline: (rawSettings.tagline as string) || "Fresh, Hearty Fast Food & Char-Grill, Hot to Your Door",
      phone: (rawSettings.phone as string) || "+255 700 000 000",
      whatsapp: (rawSettings.whatsapp as string) || "255700000000",
      address: (rawSettings.address as string) || "Kariakoo, Dar es Salaam, Tanzania",
      opening_hours: (rawSettings.opening_hours as string) || "Mon–Sun: 8:00 AM – 11:00 PM",
      delivery_enabled: rawSettings.delivery_enabled === 0 ? 0 : 1,
      delivery_fee_tsh: (rawSettings.delivery_fee_tsh as number) || 2500,
      min_order_tsh: (rawSettings.min_order_tsh as number) || 5000,
      promotions_enabled: rawSettings.promotions_enabled === 1 ? 1 : 0,
      adsense_enabled: rawSettings.adsense_enabled === 1 ? 1 : 0,
      adsense_client_id: (rawSettings.adsense_client_id as string) || "",
      adsense_slot_top: (rawSettings.adsense_slot_top as string) || "",
      adsense_slot_infeed: (rawSettings.adsense_slot_infeed as string) || "",
      adsense_slot_sidebar: (rawSettings.adsense_slot_sidebar as string) || "",
      direct_ads_enabled: rawSettings.direct_ads_enabled === 0 ? 0 : 1,
    };

    const promotions = settings.promotions_enabled === 1
      ? (db.prepare("SELECT * FROM promotions WHERE active = 1 ORDER BY id ASC").all() as {
          id: number;
          code: string;
          title: string;
          description: string;
          discount_type: "percent" | "fixed";
          discount_value: number;
          min_order_tsh: number;
          badge: string | null;
        }[])
      : [];

    // Only surface categories that currently have at least one available item so
    // the customer never sees an empty tab.
    const availableCategories = categories.filter((c) =>
      items.some((i) => i.category_id === c.id)
    );

    return NextResponse.json(
      {
        categories: availableCategories,
        items,
        settings,
        promotions,
        updatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/public/menu] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
