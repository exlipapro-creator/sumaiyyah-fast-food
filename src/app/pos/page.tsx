import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import AppShell from "@/components/AppShell";
import POSClient from "./POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = getDb();
  const items = db.prepare(`
    SELECT mi.*, c.name as category_name 
    FROM menu_items mi 
    JOIN categories c ON mi.category_id = c.id 
    WHERE mi.deleted = 0 AND mi.active = 1 
    ORDER BY c.sort_order ASC, mi.sort_order ASC, mi.id ASC
  `).all() as {
    id: number; name: string; price_tsh: number; category_id: number;
    category_name: string; image_url: string | null; active: number;
    track_stock: number; stock_qty: number;
  }[];

  const categories = db.prepare("SELECT * FROM categories ORDER BY sort_order ASC, id ASC").all() as {
    id: number; name: string;
  }[];

  return (
    <AppShell user={session}>
      <POSClient items={items} categories={categories} cashierId={session.id} />
    </AppShell>
  );
}
