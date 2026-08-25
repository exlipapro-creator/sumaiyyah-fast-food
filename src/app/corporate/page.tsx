import React from "react";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import MobileBottomNav from "@/components/customer/MobileBottomNav";
import CorporateClient from "./CorporateClient";
import { CartProvider } from "@/context/CartContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Corporate & Office Catering | Sumaiyyah Fast Food Dar es Salaam",
  description:
    "Reliable scheduled office lunches, boardroom catering, and team meal packages delivered hot & fresh to offices across Dar es Salaam.",
};

export default function CorporatePage() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F7FAFD] text-slate-800 flex flex-col font-sans">
        <CustomerNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-16">
          <CorporateClient />
        </main>
        <MobileBottomNav />
      </div>
    </CartProvider>
  );
}
