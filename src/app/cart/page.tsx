import React from "react";
import getDb from "@/lib/db";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import CustomerFooter from "@/components/customer/CustomerFooter";
import MobileBottomNav from "@/components/customer/MobileBottomNav";
import CartClient from "./CartClient";
import { CartProvider } from "@/context/CartContext";

export const dynamic = "force-dynamic";

function getCartPageData() {
  const db = getDb();
  const settings = (db.prepare("SELECT promotions_enabled FROM restaurant_settings WHERE id = 1").get() || { promotions_enabled: 0 }) as { promotions_enabled: number };
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

  return { promotions };
}

export default function CartPage() {
  const { promotions } = getCartPageData();

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F7FAFD] text-slate-900 flex flex-col selection:bg-[#0062C3] selection:text-white">
        <CustomerNavbar />
        <main className="flex-1">
          <CartClient availablePromotions={promotions} />
        </main>
        <CustomerFooter />
        <MobileBottomNav />
      </div>
    </CartProvider>
  );
}
