"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { PublicItem } from "@/app/api/public/menu/route";
import ProductCard from "@/components/customer/ProductCard";
import ItemCustomizerModal from "@/components/customer/ItemCustomizerModal";
import { useCart } from "@/context/CartContext";
import {
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Percent,
  Tag,
  ChevronRight,
  CookingPot,
} from "lucide-react";

interface DealsClientProps {
  promotions: {
    id: number;
    code: string;
    title: string;
    description: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    min_order_tsh: number;
    badge: string | null;
  }[];
  dealItems: PublicItem[];
}

export default function DealsClient({ promotions, dealItems }: DealsClientProps) {
  const { applyPromo, appliedPromo, itemCount, grandTotal } = useCart();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<PublicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleApplyPromo = (promo: (typeof promotions)[0]) => {
    const res = applyPromo(promo);
    setPromoMessage(res.message);
    setTimeout(() => setPromoMessage(null), 4000);
  };

  const openCustomizer = (item: PublicItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-[80vh] pb-28 pt-4 sm:pt-8">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 space-y-8">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF4FF] border border-blue-100 text-[#0062C3] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB800]" />
            <span>Special Savings & Value Packs</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight font-serif">
            Deals & Vouchers
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Apply discount promo codes or order our signature family bundle packs for big savings.
          </p>
        </div>

        {/* Promo Notification Alert */}
        {promoMessage && (
          <div className="max-w-md mx-auto bg-[#EBF4FF] border border-[#0062C3]/30 text-[#004B93] px-4 py-2.5 rounded-xl text-center text-xs sm:text-sm font-semibold shadow-2xs">
            {promoMessage}
          </div>
        )}

        {/* ─── Active Voucher Codes ────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
            <Tag className="w-4 h-4 text-[#0062C3]" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Active Discount Vouchers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {promotions.map((promo) => {
              const isApplied = appliedPromo?.code === promo.code;
              return (
                <div
                  key={promo.code}
                  className={`bg-white border rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all shadow-2xs ${
                    isApplied
                      ? "border-[#0062C3] ring-2 ring-[#0062C3]/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#EBF4FF] flex items-center justify-center text-[#0062C3]">
                          <Percent className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono text-xs sm:text-sm font-black text-slate-900 tracking-wide">
                          {promo.code}
                        </span>
                      </div>
                      {promo.badge && (
                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-[#E5002B] text-white">
                          {promo.badge}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{promo.title}</h3>
                    <p className="text-xs text-slate-500 leading-snug">{promo.description}</p>
                  </div>

                  <div className="space-y-2.5 pt-2.5 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400 font-medium">
                      Min. Order: TZS {promo.min_order_tsh.toLocaleString()}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(promo.code)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {copiedCode === promo.code ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPromo(promo)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all ${
                          isApplied
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                            : "bg-[#0062C3] hover:bg-[#004B93] text-white shadow-2xs"
                        }`}
                      >
                        {isApplied ? "Applied ✓" : "Apply"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Bundle Combos & Featured Meals (2-col mobile) ──────────────── */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <CookingPot className="w-4 h-4 text-[#0062C3]" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Value Combos & Packs</h2>
            </div>
            <Link
              href="/order"
              className="text-xs font-bold text-[#0062C3] hover:text-[#004B93] inline-flex items-center gap-1"
            >
              <span>Full Menu</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
            {dealItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onOpenCustomizer={openCustomizer}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Floating Cart Indicator */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-30 animate-in slide-in-from-bottom-4 duration-200">
          <Link
            href="/cart"
            className="flex items-center justify-between bg-[#0062C3] hover:bg-[#004B93] text-white p-3.5 rounded-2xl shadow-xl border border-white/20 transition-all transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs">
                {itemCount}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-blue-100">
                  {itemCount} Items in Cart
                </div>
                <div className="text-sm font-bold font-mono">
                  TZS {grandTotal.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white text-[#0062C3] px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </Link>
        </div>
      )}

      {/* Item Customizer Modal */}
      <ItemCustomizerModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
