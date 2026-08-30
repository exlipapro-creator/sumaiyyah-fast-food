"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useHeaderTicker } from "@/lib/useHeaderTicker";
import { BookOpen, Ticket, Briefcase, Radar, RotateCcw, Clock, Heart, Navigation2 } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { favorites } = useCart();
  const { tickerData } = useHeaderTicker();
  const isDealsEnabled = tickerData?.promotions_enabled;

  const [activeOrder, setActiveOrder] = useState<{
    receipt_number: string;
    placed_at: string;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sumaiyyah_last_order");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if placed within last 3 hours
        const elapsedMinutes = (Date.now() - new Date(parsed.placed_at).getTime()) / (1000 * 60);
        if (elapsedMinutes < 180 && parsed.active) {
          setActiveOrder(parsed);
        } else {
          setActiveOrder(null);
        }
      }
    } catch (e) {
      setActiveOrder(null);
    }
  }, [pathname]);

  const trackHref = activeOrder?.receipt_number
    ? `/track-order?receipt=${encodeURIComponent(activeOrder.receipt_number)}`
    : "/track-order";

  return (
    <nav
      id="mobile-bottom-bar"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-3 py-2 shadow-lg"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* Tab 1: Menu */}
        <Link
          href="/order"
          id="bottom-nav-menu"
          className={`flex flex-col items-center gap-1 transition-colors flex-1 py-1 ${
            pathname === "/order" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpen className={`w-5 h-5 ${pathname === "/order" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] font-medium tracking-tight">Menu</span>
        </Link>

        {/* Tab 2: Delivery Zones */}
        <Link
          href="/delivery"
          id="bottom-nav-zones"
          className={`flex flex-col items-center gap-1 transition-colors flex-1 py-1 ${
            pathname === "/delivery" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Radar className={`w-5 h-5 ${pathname === "/delivery" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] font-medium tracking-tight">Zones</span>
        </Link>

        {/* Center Slot: Dedicated Orders / Live Track Hub */}
        <Link
          href={trackHref}
          id="bottom-nav-track"
          className={`flex flex-col items-center relative -top-3.5 px-3 py-2 rounded-2xl shadow-md transition-all active:scale-95 ${
            activeOrder
              ? "bg-[#0062C3] text-white ring-4 ring-[#0062C3]/20"
              : pathname === "/track-order"
              ? "bg-[#004B93] text-white"
              : "bg-slate-900 text-white hover:bg-[#004B93]"
          }`}
          aria-label="Orders and Live Tracking Hub"
        >
          <div className="relative flex items-center justify-center">
            {activeOrder ? (
              <>
                <Navigation2 className="w-5 h-5 animate-pulse text-amber-300" />
                <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </>
            ) : (
              <Clock className="w-5 h-5 text-slate-100" />
            )}
          </div>
          <span className="text-[9px] font-black tracking-tight uppercase mt-0.5 whitespace-nowrap">
            {activeOrder ? "Live Track" : "Orders"}
          </span>
        </Link>

        {/* Tab 4: Office Catering */}
        <Link
          href="/corporate"
          id="bottom-nav-office"
          className={`flex flex-col items-center gap-1 transition-colors flex-1 py-1 ${
            pathname.startsWith("/corporate") ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Briefcase className={`w-5 h-5 ${pathname.startsWith("/corporate") ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] font-medium tracking-tight">Office</span>
        </Link>

        {/* Tab 5: Deals / Re-order Favorites */}
        {isDealsEnabled ? (
          <Link
            href="/deals"
            id="bottom-nav-deals"
            className={`flex flex-col items-center gap-1 transition-colors flex-1 py-1 ${
              pathname === "/deals" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Ticket className={`w-5 h-5 ${pathname === "/deals" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            <span className="text-[10px] font-medium tracking-tight">Deals</span>
          </Link>
        ) : (
          <Link
            href="/favorites"
            id="bottom-nav-favorites"
            className={`flex flex-col items-center gap-1 transition-colors flex-1 py-1 relative ${
              pathname === "/favorites" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <div className="relative">
              <RotateCcw className={`w-5 h-5 ${pathname === "/favorites" ? "stroke-[2.5] text-[#0062C3]" : "stroke-[1.75]"}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-3.5 px-1 flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight">Re-order</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

