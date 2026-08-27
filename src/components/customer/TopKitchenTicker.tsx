"use client";

import React from "react";
import Link from "next/link";
import { useHeaderTicker } from "@/lib/useHeaderTicker";
import {
  Radio,
  Clock3,
  Clock,
  Bike,
  Briefcase,
  Sparkles,
  Ticket,
  Phone,
  UserCheck,
} from "lucide-react";

export default function TopKitchenTicker() {
  const { tickerData } = useHeaderTicker();

  const isOpen = tickerData.is_open;
  const announcements = tickerData.announcements?.length > 0
    ? tickerData.announcements
    : [
        {
          id: "fallback",
          text: tickerData.default_fallback_text || "Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam",
          highlight: "Dar es Salaam",
          priority: 1,
          is_active: true,
        },
      ];

  // Helper to pick contextual icons based on keywords in announcement text
  const getIconForText = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("grill") || lower.includes("live") || lower.includes("sizzle")) return Radio;
    if (lower.includes("delivery") || lower.includes("bike") || lower.includes("rider")) return Bike;
    if (lower.includes("hour") || lower.includes("time") || lower.includes("closed") || lower.includes("open")) return Clock;
    if (lower.includes("corporate") || lower.includes("office") || lower.includes("catering") || lower.includes("b2b")) return Briefcase;
    if (lower.includes("discount") || lower.includes("offer") || lower.includes("karibu") || lower.includes("promo") || lower.includes("deal")) return Ticket;
    if (lower.includes("whatsapp") || lower.includes("phone") || lower.includes("call") || lower.includes("hotline")) return Phone;
    return Sparkles;
  };

  return (
    <div
      className={`w-full text-xs py-1.5 overflow-hidden border-b transition-colors select-none ${
        isOpen
          ? "bg-[#004B93] text-white border-[#003870]"
          : "bg-slate-900 text-slate-200 border-slate-800"
      }`}
    >
      <div className="flex items-center">
        {/* Status Badge on the left (Minimal & Compact: LIVE vs CLOSED) */}
        {isOpen ? (
          <div className="shrink-0 z-10 bg-[#E5002B] text-white px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
            <span>LIVE</span>
          </div>
        ) : (
          <div className="shrink-0 z-10 bg-slate-800 border-r border-slate-700 text-amber-300 px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Clock3 className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-100">CLOSED</span>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 font-medium lowercase">
              ({tickerData.opening_time?.slice(0, 5) || "08:00"})
            </span>
          </div>
        )}

        {/* Medium-Slow, Comfortable Right-to-Left Infinite Scrolling Ticker Track */}
        <div className="relative flex-1 overflow-hidden" title="Hover to pause ticker">
          <div className="animate-marquee-rtl flex items-center gap-10 text-[11px] sm:text-xs font-medium whitespace-nowrap">
            {/* First Set of Items */}
            {announcements.map((item, idx) => {
              const Icon = getIconForText(item.text);
              return (
                <div key={`ticker-1-${item.id}-${idx}`} className="inline-flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isOpen ? "text-amber-300" : "text-slate-400"}`} />
                  <span className={isOpen ? "text-slate-100" : "text-slate-300"}>{item.text}</span>
                  {item.highlight && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                        isOpen
                          ? "bg-white/15 text-amber-200"
                          : "bg-slate-800 text-amber-300 border border-slate-700"
                      }`}
                    >
                      {item.highlight}
                    </span>
                  )}
                  <span className={isOpen ? "text-white/30 ml-4" : "text-slate-700 ml-4"}>•</span>
                </div>
              );
            })}

            {/* Duplicate Set for Continuous Seamless Loop */}
            {announcements.map((item, idx) => {
              const Icon = getIconForText(item.text);
              return (
                <div key={`ticker-2-${item.id}-${idx}`} className="inline-flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isOpen ? "text-amber-300" : "text-slate-400"}`} />
                  <span className={isOpen ? "text-slate-100" : "text-slate-300"}>{item.text}</span>
                  {item.highlight && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                        isOpen
                          ? "bg-white/15 text-amber-200"
                          : "bg-slate-800 text-amber-300 border border-slate-700"
                      }`}
                    >
                      {item.highlight}
                    </span>
                  )}
                  <span className={isOpen ? "text-white/30 ml-4" : "text-slate-700 ml-4"}>•</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Static Staff / Office Access Links on Right (Desktop) */}
        <div
          className={`hidden lg:flex items-center gap-3 shrink-0 px-3 z-10 text-[11px] border-l ${
            isOpen
              ? "bg-[#004B93]/90 border-white/15 text-slate-200"
              : "bg-slate-900 border-slate-800 text-slate-300"
          }`}
        >
          <Link
            href="/corporate"
            className="hover:text-amber-300 transition-colors font-semibold flex items-center gap-1"
          >
            <Briefcase className="w-3 h-3 text-amber-300" />
            <span>Office Portal</span>
          </Link>
          <span className="opacity-25">|</span>
          <Link
            href="/login"
            className="hover:text-white transition-colors font-semibold flex items-center gap-1"
          >
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span>Staff Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
