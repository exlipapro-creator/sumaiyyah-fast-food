import React from "react";
import getDb from "@/lib/db";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import CustomerFooter from "@/components/customer/CustomerFooter";
import MobileBottomNav from "@/components/customer/MobileBottomNav";
import CheckoutClient from "./CheckoutClient";
import { CartProvider } from "@/context/CartContext";

export const dynamic = "force-dynamic";

function getCheckoutData() {
  const db = getDb();
  const settings = db.prepare("SELECT * FROM restaurant_settings WHERE id = 1").get() as {
    restaurant_name: string;
    phone: string;
    delivery_fee_tsh: number;
    min_order_tsh: number;
    delivery_available: number;
    estimated_prep_min: number;
  } | undefined;

  return {
    settings: settings || {
      restaurant_name: "Sumaiyyah Fast Food",
      phone: "+255700000000",
      delivery_fee_tsh: 2500,
      min_order_tsh: 5000,
      delivery_available: 1,
      estimated_prep_min: 20,
    },
  };
}

export default function CheckoutPage() {
  const { settings } = getCheckoutData();

  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F7FAFD] text-slate-900 flex flex-col selection:bg-[#0062C3] selection:text-white">
        <CustomerNavbar />
        <main className="flex-1">
          <CheckoutClient settings={settings} />
        </main>
        <CustomerFooter />
        <MobileBottomNav />
      </div>
    </CartProvider>
  );
}
