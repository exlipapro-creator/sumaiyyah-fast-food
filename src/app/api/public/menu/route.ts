import { NextResponse } from "next/server";
import getDb from "@/lib/db";

// Public, unauthenticated endpoint that powers the customer-facing landing page.
// It exposes ONLY active, non-deleted menu items (the same data a cashier sees in
// the POS) grouped by category, so the live menu stays in sync with what staff
// manage in /menu. No prices/names are trusted from the client; this is read-only.
export const dynamic = "force-dynamic";

interface PublicItem {
  id: number;
  name: string;
  price_tsh: number;
  category_id: number;
  category_name: string;
  in_stock: boolean;
  image_url: string | null;
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
                CASE WHEN mi.track_stock = 1 AND mi.stock_qty <= 0 THEN 0 ELSE 1 END as in_stock
         FROM menu_items mi
         JOIN categories c ON mi.category_id = c.id
         WHERE mi.deleted = 0 AND mi.active = 1
         ORDER BY c.sort_order ASC, mi.sort_order ASC, mi.id ASC`
      )
      .all() as (Omit<PublicItem, "in_stock"> & { in_stock: number })[];
    const items: PublicItem[] = rows.map((r) => ({ ...r, in_stock: r.in_stock === 1 }));

    // Only surface categories that currently have at least one available item so
    // the customer never sees an empty tab.
    const availableCategories = categories.filter((c) =>
      items.some((i) => i.category_id === c.id)
    );

    return NextResponse.json(
      { categories: availableCategories, items, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
