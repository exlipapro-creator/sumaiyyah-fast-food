"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useHeaderTicker } from "@/lib/useHeaderTicker";
import { BookOpen, Ticket, Briefcase, Radar, ShoppingBag, Heart } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount, favorites } = useCart();
  const { tickerData } = useHeaderTicker();
  const isDealsEnabled = tickerData?.promotions_enabled;

  return (
    <nav
      id="mobile-bottom-bar"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-4 py-2 shadow-lg"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        <Link
          href="/order"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === "/order" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpen className={`w-5 h-5 ${pathname === "/order" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] font-medium tracking-tight">Menu</span>
        </Link>

        {isDealsEnabled ? (
          <Link
            href="/deals"
            className={`flex flex-col items-center gap-1 transition-colors ${
              pathname === "/deals" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Ticket className={`w-5 h-5 ${pathname === "/deals" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
            <span className="text-[10px] font-medium tracking-tight">Deals</span>
          </Link>
        ) : (
          <Link
            href="/favorites"
            className={`flex flex-col items-center gap-1 transition-colors relative ${
              pathname === "/favorites" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <div className="relative">
              <Heart className={`w-5 h-5 ${pathname === "/favorites" ? "stroke-[2.5] fill-rose-500 text-rose-500" : "stroke-[1.75]"}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-3.5 px-1 flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-tight">Saved</span>
          </Link>
        )}

        {/* Center Highlighted Cart Button */}
        <Link
          href="/cart"
          className="flex flex-col items-center relative -top-3.5 bg-[#004B93] hover:bg-[#003870] text-white p-3 rounded-full shadow-lg transition-transform active:scale-95"
          aria-label="Shopping Cart"
        >
          <ShoppingBag className="w-5 h-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E5002B] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
              {itemCount}
            </span>
          )}
        </Link>

        <Link
          href="/delivery"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname === "/delivery" ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Radar className={`w-5 h-5 ${pathname === "/delivery" ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] font-medium tracking-tight">Zones</span>
        </Link>

        <Link
          href="/corporate"
          className={`flex flex-col items-center gap-1 transition-colors ${
            pathname.startsWith("/corporate") ? "text-[#0062C3] font-bold" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Briefcase className={`w-5 h-5 ${pathname.startsWith("/corporate") ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
          <span className="text-[10px] font-medium tracking-tight">Office</span>
        </Link>
      </div>
    </nav>
  );
}
