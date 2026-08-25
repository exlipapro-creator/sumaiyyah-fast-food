import React, { Suspense } from "react";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import CustomerFooter from "@/components/customer/CustomerFooter";
import MobileBottomNav from "@/components/customer/MobileBottomNav";
import TrackOrderClient from "./TrackOrderClient";
import { CartProvider } from "@/context/CartContext";

export const dynamic = "force-dynamic";

export default function TrackOrderPage() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F7FAFD] text-slate-900 flex flex-col selection:bg-[#0062C3] selection:text-white">
        <CustomerNavbar />
        <main className="flex-1">
          <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Order Tracker...</div>}>
            <TrackOrderClient />
          </Suspense>
        </main>
        <CustomerFooter />
        <MobileBottomNav />
      </div>
    </CartProvider>
  );
}
