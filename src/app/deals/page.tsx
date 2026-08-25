import React from "react";
import getDb from "@/lib/db";
import type { PublicItem } from "@/app/api/public/menu/route";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import CustomerFooter from "@/components/customer/CustomerFooter";
import MobileBottomNav from "@/components/customer/MobileBottomNav";
import DealsClient from "./DealsClient";
import { CartProvider } from "@/context/CartContext";

export const dynamic = "force-dynamic";

function getDealsData() {
  const db = getDb();

  const promotions = db
    .prepare("SELECT * FROM promotions WHERE active = 1 ORDER BY id ASC")
    .all() as {
      id: number;
      code: string;
      title: string;
      description: string;
      discount_type: "percent" | "fixed";
      discount_value: number;
      min_order_tsh: number;
      badge: string | null;
    }[];

  const rows = db
    .prepare(
      `SELECT mi.id, mi.name, mi.price_tsh, mi.category_id, c.name as category_name, mi.image_url,
              mi.description, mi.is_featured, mi.is_deal, mi.prep_time_min, mi.calories, mi.spiciness,
              mi.dietary_tags, mi.options_json, mi.track_stock, mi.stock_qty,
              CASE WHEN mi.track_stock = 1 AND mi.stock_qty <= 0 THEN 0 ELSE 1 END as in_stock
       FROM menu_items mi
       JOIN categories c ON mi.category_id = c.id
       WHERE mi.deleted = 0 AND mi.active = 1 AND (mi.is_deal = 1 OR mi.is_featured = 1)
       ORDER BY mi.is_deal DESC, c.sort_order ASC, mi.sort_order ASC, mi.id ASC`
    )
    .all() as {
      id: number;
      name: string;
      price_tsh: number;
      category_id: number;
      category_name: string;
      image_url: string | null;
      description: string | null;
      is_featured: number;
      is_deal: number;
      prep_time_min: number;
      calories: number;
      spiciness: string;
      dietary_tags: string | null;
      options_json: string | null;
      track_stock: number;
      stock_qty: number;
      in_stock: number;
    }[];

  const dealItems: PublicItem[] = rows.map((r) => {
    let dietaryTags: string[] = [];
    try {
      if (r.dietary_tags) dietaryTags = JSON.parse(r.dietary_tags);
    } catch {}

    let options: {
      variants?: { name: string; price_diff: number }[];
      addons?: { name: string; price: number }[];
    } = {};
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

  return { promotions, dealItems };
}

export default function DealsPage() {
  const { promotions, dealItems } = getDealsData();

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F7FAFD] text-slate-900 flex flex-col selection:bg-[#0062C3] selection:text-white">
        <CustomerNavbar />
        <main className="flex-1">
          <DealsClient promotions={promotions} dealItems={dealItems} />
        </main>
        <CustomerFooter />
        <MobileBottomNav />
      </div>
    </CartProvider>
  );
}
