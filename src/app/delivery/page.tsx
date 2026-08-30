import React from "react";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import CustomerFooter from "@/components/customer/CustomerFooter";
import DeliveryRadiusMap from "@/components/customer/DeliveryRadiusMap";
import MobileBottomNav from "@/components/customer/MobileBottomNav";
import Link from "next/link";
import { Bike, ShieldCheck, Clock, Phone, ArrowLeft, Utensils } from "lucide-react";
import { CartProvider } from "@/context/CartContext";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Eneo la Uwasilishaji (Delivery Coverage Map) | Sumaiyyah Fast Food",
  description: "Uwasilishaji wa chakula moto cha Kiswahili popote ulipo Posta, Upanga, Kariakoo, Ilala, Kisutu na maeneo ya City Center Dar es Salaam kutoka Sumaiyyah Fast Food Bibi Titi Mohammed Street.",
};

export default function DeliveryPage() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <CustomerNavbar />

        <main className="flex-1 max-w-7xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 space-y-8 w-full">
          {/* Back link & Top Breadcrumb */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#0062C3] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Rudi Nyumbani</span>
            </Link>
            <Link
              href="/order"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0062C3] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#004B93] transition-all"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Tazama Menu & Agiza</span>
            </Link>
          </div>

          {/* Main Delivery Zones Header Banner */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0062C3]/10 text-[#0062C3] text-xs font-bold uppercase tracking-wider">
                <Bike className="w-3.5 h-3.5" />
                <span>Dar es Salaam Coverage & Dispatch Zones</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-serif">
                Chakula Moto & Safi Mlangoni Pako
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Uwasilishaji wa haraka kutoka mgahawa wetu (Bibi Titi Mohammed Street, Posta) kuelekea Posta, Upanga, Kariakoo, Ilala, Magomeni, Kisutu na viunga vya jiji ndani ya dakika 10–30.
              </p>
            </div>
          </div>

          {/* Interactive Delivery Map Component */}
          <DeliveryRadiusMap showTitle={false} />

          {/* How Our City Delivery Works */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0062C3] flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">1. Maandalizi ya Haraka</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mara tu oda inapothibitishwa, wapishi wetu huiandaa ikiwa moto kwa viungo halisi na ubora wa hali ya juu.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">2. Thermal Packaging</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Chakula kinalindwa kwenye vyombo safi na mikoba maalum ya kuhifadhi joto ili kikufikie kikiwa moto na kitamu.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Bike className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">3. Dereva Mlangoni</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dereva wetu anafika mlangoni au ofisini kwako kwa wakati uliokadiriwa (dakika 15–30). Lipia kwa M-Pesa au Cash!
              </p>
            </div>
          </div>
        </main>

        <CustomerFooter />
        <MobileBottomNav />
      </div>
    </CartProvider>
  );
}
