"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useHeaderTicker } from "@/lib/useHeaderTicker";
import TopKitchenTicker from "./TopKitchenTicker";
import {
  BookOpen,
  Ticket,
  Radar,
  Briefcase,
  Heart,
  ShoppingBag,
  Menu as MenuIcon,
  X,
  Phone,
  Sparkles,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export default function CustomerNavbar() {
  const pathname = usePathname();
  const { itemCount, grandTotal } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { tickerData } = useHeaderTicker();

  const navLinks = [
    { href: "/order", label: "Menu & Order", icon: BookOpen },
    ...(tickerData?.promotions_enabled
      ? [{ href: "/deals", label: "Deals & Offers", icon: Ticket, badge: "Hot" }]
      : []),
    { href: "/delivery", label: "Delivery Radius", icon: Radar, badge: "City Center" },
    { href: "/corporate", label: "Office & Catering", icon: Briefcase, badge: "B2B" },
    { href: "/favorites", label: "Favorites", icon: Heart },
  ];

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm bg-white/95 backdrop-blur-md border-b border-slate-200">
      
      {/* ─── FULL-WIDTH REALTIME TICKER: TOP KITCHEN LIVE & STORE HOURS ─── */}
      <TopKitchenTicker />

      {/* ─── MAIN BRAND NAVIGATION ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        
        {/* Brand PNG Logo Anchor */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/assets/logo.png"
            alt="Sumaiyyah Fast Food"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border border-slate-200/80 shadow-sm group-hover:scale-105 transition-transform duration-200"
          />
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
                    ? "text-[#0062C3] bg-[#EBF4FF] shadow-xs font-bold"
                    : "text-slate-600 hover:text-[#004B93] hover:bg-slate-100/80"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#0062C3]" : "text-slate-400"}`} />
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-[#E5002B] text-white rounded-full font-black uppercase tracking-wider shadow-2xs">
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
            className="relative flex items-center gap-2.5 bg-[#0062C3] hover:bg-[#004B93] text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center bg-[#E5002B] text-white text-xs font-black rounded-full h-5 min-w-5 px-1.5 shadow-xs animate-in zoom-in-50 duration-200">
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
            className="md:hidden p-2.5 text-slate-700 hover:text-[#004B93] bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* ─── MOBILE DRAWER ──────────────────────────────────────────────── */}
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

          <div className="pt-3 mt-3 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500 px-2">
            <div className="flex items-center justify-between">
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
                href="/corporate"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#0062C3] hover:underline font-bold"
              >
                Corporate Portal
              </Link>
            </div>
            <div className="flex justify-end pt-1">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-600 hover:text-slate-900 font-semibold"
              >
                Staff Portal Sign In &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
