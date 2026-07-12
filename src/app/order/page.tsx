import getDb from "@/lib/db";
import OrderClient from "./OrderClient";
import "./landing.css";

// Public customer-facing landing/ordering page. Server-renders the current live
// menu (active, non-deleted items) straight from the same SQLite DB the POS and
// /menu manager use, so the customer menu stays in sync with staff changes. The
// client also re-fetches /api/public/menu so edits appear without a hard reload.
export const dynamic = "force-dynamic";

export interface PublicMenuItem {
  id: number;
  name: string;
  price_tsh: number;
  category_id: number;
  category_name: string;
}
export interface PublicCategory {
  id: number;
  name: string;
}

function getLiveMenu(): { categories: PublicCategory[]; items: PublicMenuItem[] } {
  const db = getDb();
  const categories = db
    .prepare("SELECT id, name FROM categories ORDER BY sort_order ASC, id ASC")
    .all() as PublicCategory[];
  const items = db
    .prepare(
      `SELECT mi.id, mi.name, mi.price_tsh, mi.category_id, c.name as category_name
       FROM menu_items mi
       JOIN categories c ON mi.category_id = c.id
       WHERE mi.deleted = 0 AND mi.active = 1
       ORDER BY c.sort_order ASC, mi.sort_order ASC, mi.id ASC`
    )
    .all() as PublicMenuItem[];
  const availableCategories = categories.filter((c) =>
    items.some((i) => i.category_id === c.id)
  );
  return { categories: availableCategories, items };
}

export default function OrderLandingPage() {
  const { categories, items } = getLiveMenu();
  return <OrderClient initialCategories={categories} initialItems={items} />;
}
