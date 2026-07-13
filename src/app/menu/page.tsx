import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import AppShell from "@/components/AppShell";
import MenuClient from "./MenuClient";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "manager") redirect("/forbidden");

  const db = getDb();
  const categories = db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC").all() as {
    id: number; name: string; sort_order: number;
  }[];
  const items = db.prepare(`
    SELECT mi.*, c.name as category_name 
    FROM menu_items mi 
    JOIN categories c ON mi.category_id = c.id 
    WHERE mi.deleted = 0 
    ORDER BY c.sort_order ASC, mi.sort_order ASC, mi.id ASC
  `).all() as {
    id: number; name: string; price_tsh: number; category_id: number;
    category_name: string; active: number; deleted: number;
    image_url: string | null; track_stock: number; stock_qty: number;
  }[];

  return (
    <AppShell user={session}>
      <MenuClient initialCategories={categories} initialItems={items} />
    </AppShell>
  );
}
