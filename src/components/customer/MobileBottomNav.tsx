"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  Home,
  CookingPot,
  BadgePercent,
  Route,
  Heart,
  ShoppingBag,
  Building2,
} from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount, favorites } = useCart();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/order", label: "Menu", icon: CookingPot },
    { href: "/corporate", label: "Office", icon: Building2 },
    { href: "/favorites", label: "Saved", icon: Heart, count: favorites.length },
    { href: "/track-order", label: "Track", icon: Route },
  ];

  return (
    <nav
      id="mobile-bottom-bar"
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-lg"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0.5rem)" }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? "text-[#0062C3] font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.75]"
                  }`}
                />
                {item.hasBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#E5002B]" />
                )}
                {typeof item.count === "number" && item.count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full h-3.5 min-w-3.5 px-1 flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
