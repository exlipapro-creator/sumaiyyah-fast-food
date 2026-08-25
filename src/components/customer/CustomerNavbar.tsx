"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  Compass,
  BadgePercent,
  Route,
  Heart,
  ShoppingBag,
  Menu as MenuIcon,
  X,
  Phone,
  CookingPot,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Building2,
} from "lucide-react";

export default function CustomerNavbar() {
  const pathname = usePathname();
  const { itemCount, grandTotal } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/order", label: "Menu & Order", icon: Compass },
    { href: "/corporate", label: "Office & Catering", icon: Building2, badge: "Corporate" },
    { href: "/deals", label: "Deals & Offers", icon: BadgePercent },
    { href: "/track-order", label: "Live Tracking", icon: Route },
    { href: "/favorites", label: "Favorites", icon: Heart },
  ];

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Announcement Bar */}
      <div className="bg-[#004B93] text-white text-xs py-1.5 px-4 font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="truncate text-slate-100 text-[11px] sm:text-xs">
              <strong className="text-amber-300 font-semibold">Kitchen Live:</strong> 8:00 AM – 11:00 PM • Fast Fresh Swahili Fast Food & Char-Grill in Dar es Salaam
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs shrink-0 text-slate-200">
            <a
              href="https://wa.me/255700000000"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white flex items-center gap-1 transition-colors"
            >
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>WhatsApp: +255 700 000 000</span>
            </a>
            <span className="text-white/30">•</span>
            <Link
              href="/login"
              className="hover:text-amber-300 transition-colors font-medium flex items-center gap-1"
            >
              <UserCheck className="w-3 h-3 text-amber-300" />
              <span>Staff Portal</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Brand Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#0062C3] via-[#004B93] to-[#E5002B] p-0.5 shadow-md group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <CookingPot className="w-5 h-5 sm:w-6 sm:h-6 text-[#E5002B]" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#004B93] uppercase leading-none font-serif">
                SUMAIYYAH
              </span>
              <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#E5002B]" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] tracking-[0.25em] text-[#E5002B] font-black uppercase">
                FAST FOOD
              </span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase hidden sm:inline">
                DAR ES SALAAM
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? "text-[#0062C3] bg-[#EBF4FF] shadow-sm font-bold"
                    : "text-slate-600 hover:text-[#004B93] hover:bg-slate-100/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0062C3]" : "text-slate-400"}`} />
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-[#E5002B] text-white rounded-full font-black uppercase tracking-wider shadow-xs">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Cart & Mobile Toggle */}
        <div className="flex items-center gap-2.5">
          {/* Cart CTA */}
          <Link
            href="/cart"
            id="navbar-cart-btn"
            className="relative flex items-center gap-2.5 bg-[#0062C3] hover:bg-[#004B93] text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center bg-[#E5002B] text-white text-xs font-black rounded-full h-5 min-w-5 px-1.5 shadow-sm animate-in zoom-in-50 duration-200">
                {itemCount}
              </span>
            )}
            {itemCount > 0 && grandTotal > 0 && (
              <span className="hidden lg:inline text-xs font-mono font-bold pl-1.5 border-l border-white/20">
                TZS {grandTotal.toLocaleString()}
              </span>
            )}
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 text-slate-700 hover:text-[#004B93] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold ${
                  isActive
                    ? "bg-[#EBF4FF] text-[#0062C3] font-bold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[#0062C3]" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[10px] px-2 py-0.5 bg-[#E5002B] text-white rounded-full font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-2">
            <a
              href="https://wa.me/255700000000"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-emerald-600 font-semibold hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp Kitchen Order</span>
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#004B93] hover:underline font-bold"
            >
              Staff Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

