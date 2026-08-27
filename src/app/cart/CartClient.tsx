"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart, AppliedPromo } from "@/context/CartContext";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  Truck,
  Store,
  Utensils,
  Tag,
  X,
  CheckCircle2,
  Clock,
  Flame,
  CookingPot,
} from "lucide-react";

interface CartClientProps {
  availablePromotions: {
    id: number;
    code: string;
    title: string;
    description: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    min_order_tsh: number;
    badge: string | null;
  }[];
}

export default function CartClient({ availablePromotions }: CartClientProps) {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discountAmount,
    deliveryFee,
    grandTotal,
    fulfillmentType,
    setFulfillmentType,
    appliedPromo,
    applyPromo,
    removePromo,
  } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  const handleApplyCustomPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    setPromoSuccess(null);

    const codeToFind = promoInput.trim().toUpperCase();
    if (!codeToFind) return;

    const match = availablePromotions.find((p) => p.code.toUpperCase() === codeToFind);
    if (!match) {
      setPromoError("Invalid promo code. Please check and try again.");
      return;
    }

    const res = applyPromo(match);
    if (res.success) {
      setPromoSuccess(res.message);
      setPromoInput("");
    } else {
      setPromoError(res.message);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 space-y-6 shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-[#EBF4FF] flex items-center justify-center mx-auto text-[#0062C3]">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 font-serif">Kikapu Chako Kiko Wazi</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Bado hujaongeza baga tamu, mishikaki, chipsi kavu, wala kinywaji chochote kwenye kikapu.
            </p>
          </div>
          <Link
            href="/order"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <CookingPot className="w-4 h-4" />
            <span>Angalia Orodha & Agiza</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">
            Kagua Oda Yako (Vipengele {items.reduce((s, i) => s + i.quantity, 0)})
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Hakikisha milo yako, chagua namna ya kupokea, na tumia kuponi ya punguzo.
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Futa Vyote</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Cart Items List & Fulfillment Mode */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Fulfillment Type Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-700">
              Namna ya Kupokea Chakula
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "delivery",
                  label: "Lete Mlangoni (Delivery)",
                  sub: "TZS 2,500 • Dak 25-40",
                  icon: Truck,
                },
                {
                  id: "pickup",
                  label: "Kuja Kuchukua (Takeaway)",
                  sub: "Bure • Tayari dak 15",
                  icon: Store,
                },
                {
                  id: "dine_in",
                  label: "Kula Hapa (Dine-In)",
                  sub: "Bure • Mezani",
                  icon: Utensils,
                },
              ].map((opt) => {
                const isSel = fulfillmentType === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFulfillmentType(opt.id as any)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isSel
                        ? "bg-[#EBF4FF] border-[#0062C3] text-slate-900 ring-2 ring-[#0062C3]/20 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isSel ? "text-[#0062C3]" : "text-slate-400"}`} />
                    <div>
                      <div className="text-sm font-bold text-slate-900">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{opt.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
            {items.map((item) => (
              <div
                key={item.cartId}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Item Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <CookingPot className="w-6 h-6 text-[#0062C3]" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{item.name}</h3>
                    
                    {item.variant && (
                      <div className="text-xs text-[#0062C3] font-semibold">
                        Kipimo: {item.variant}
                      </div>
                    )}

                    {item.addons && item.addons.length > 0 && (
                      <div className="text-xs text-slate-500">
                        Viongezeo: {item.addons.map((a) => a.name).join(", ")}
                      </div>
                    )}

                    {item.instructions && (
                      <div className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded italic">
                        Maelekezo: &ldquo;{item.instructions}&rdquo;
                      </div>
                    )}

                    <div className="text-xs font-mono text-slate-500 pt-0.5">
                      TZS {item.unit_price_tsh.toLocaleString()} kila moja
                    </div>
                  </div>
                </div>

                {/* Stepper & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                      aria-label="Punguza idadi"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                      aria-label="Ongeza idadi"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right min-w-24">
                    <span className="text-sm font-bold font-mono text-[#004B93] block">
                      TZS {(item.unit_price_tsh * item.quantity).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.cartId)}
                      className="text-[10px] text-slate-400 hover:text-rose-600 underline transition-colors"
                    >
                      Ondoa
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href="/order"
              className="inline-flex items-center gap-2 text-xs font-bold text-[#0062C3] hover:text-[#004B93] transition-colors"
            >
              <span>+ Ongeza milo mingine kwenye oda</span>
            </Link>
          </div>
        </div>

        {/* Right Col: Promo Vouchers & Grand Summary */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Promo Code Input Card (Only shown if promotions are configured/available or promo already applied) */}
          {(availablePromotions.length > 0 || appliedPromo) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#0062C3]" />
                <h2 className="text-xs uppercase font-bold tracking-wider text-slate-700">
                  Kuponi ya Punguzo (Promo Code)
                </h2>
              </div>

              {appliedPromo ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-800">
                        Kuponi {appliedPromo.code} Imekubaliwa!
                      </div>
                      <div className="text-[11px] text-emerald-600">
                        Umeokoa: TZS {discountAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removePromo}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 bg-white"
                    aria-label="Ondoa kuponi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCustomPromo} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Weka kuponi ya punguzo"
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs uppercase font-mono text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      Tumia
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-[11px] text-rose-600 leading-tight">{promoError}</p>
                  )}
                  {promoSuccess && (
                    <p className="text-[11px] text-emerald-600 leading-tight">{promoSuccess}</p>
                  )}
                </form>
              )}

              {/* Quick suggested promos */}
              {!appliedPromo && availablePromotions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Kuponi Zinazopatikana
                  </span>
                  <div className="space-y-1.5">
                    {availablePromotions.slice(0, 2).map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => applyPromo(p)}
                        className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-mono font-bold text-[#0062C3]">{p.code}</span>
                        <span className="text-slate-500 text-[11px] truncate max-w-[150px]">{p.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Order Summary & Final Checkout Button */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-700">
              Muhtasari wa Malipo
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Jumla ya Milo</span>
                <span className="font-mono font-semibold text-slate-900">TZS {subtotal.toLocaleString()}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-semibold">
                  <span>Punguzo la Kuponi ({appliedPromo?.code})</span>
                  <span className="font-mono">- TZS {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Usafirishaji ({fulfillmentType === "delivery" ? "Gharama ya Usafiri" : "Kujichukulia / Kula Hapa"})</span>
                <span className="font-mono font-semibold text-slate-900">
                  {deliveryFee > 0 ? `TZS ${deliveryFee.toLocaleString()}` : "BURE"}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-base font-bold text-slate-900">
                <span>Jumla Kuu</span>
                <span className="font-mono text-[#004B93] text-lg font-black">
                  TZS {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <span>Endelea na Malipo</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>

            <div className="text-[11px] text-center text-slate-400">
              🔒 Oda yako inatumwa moja kwa moja jikoni & utafuatilia hatua kwa hatua
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
