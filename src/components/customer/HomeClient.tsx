"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicItem } from "@/app/api/public/menu/route";
import ProductCard from "@/components/customer/ProductCard";
import ItemCustomizerModal from "@/components/customer/ItemCustomizerModal";
import HeroSection from "@/components/customer/HeroSection";
import AdSlot from "@/components/ads/AdSlot";
import { useCart } from "@/context/CartContext";
import {
  Compass,
  Search,
  Clock,
  Sparkles,
  ChevronRight,
  Flame,
  Tag,
  Check,
  Smartphone,
  ArrowRight,
  Building2,
  MapPin,
  CookingPot,
} from "lucide-react";

interface HomeClientProps {
  categories: { id: number; name: string }[];
  items: PublicItem[];
  promotions: {
    id: number;
    code: string;
    title: string;
    description: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    badge: string | null;
  }[];
}

export default function HomeClient({ categories, items, promotions }: HomeClientProps) {
  const router = useRouter();
  const { applyPromo } = useCart();
  const [selectedItem, setSelectedItem] = useState<PublicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);

  const openCustomizer = (item: PublicItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/order?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/order");
    }
  };

  const featuredItems = items.filter((i) => i.is_featured);
  const displayFeatured = featuredItems.length > 0 ? featuredItems.slice(0, 8) : items.slice(0, 8);

  const filteredItems =
    activeCategory === "all"
      ? items.slice(0, 8)
      : items.filter((i) => i.category_name.toLowerCase() === activeCategory.toLowerCase());

  const handleCopyPromo = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedPromo(code);
    setTimeout(() => setCopiedPromo(null), 2000);
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-24 sm:pb-16">
      
      {/* ─── MINIMALIST HOT PLATE HERO (OPTION A) ─────────────────────────── */}
      <HeroSection
        onPlateClick={() => {
          if (displayFeatured[0]) {
            openCustomizer(displayFeatured[0]);
          } else {
            router.push("/order");
          }
        }}
        dishName={displayFeatured[0]?.name || "Hot Chips Mayai & Mishkaki"}
      />

      {/* ─── SEARCH & DISCOVERY BAR (OPTION A: DOCKED DIRECTLY UNDER HERO) ── */}
      <section className="max-w-xl mx-auto px-3.5 sm:px-6 -mt-2">
        <form onSubmit={handleSearchSubmit} className="w-full">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tafuta chakula au kinywaji..."
              className="w-full bg-white border border-slate-200/90 focus:border-[#0062C3] focus:ring-2 focus:ring-[#0062C3]/10 rounded-2xl pl-10 pr-24 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-[#0062C3] hover:bg-[#004B93] text-white text-xs font-bold rounded-xl transition-all shadow-2xs active:scale-95"
            >
              Tafuta
            </button>
          </div>
        </form>
      </section>

      {/* ─── ADVERTISEMENT BANNER (SPONSORED / ADSENSE) ──────────────────── */}
      <section className="max-w-7xl mx-auto px-3.5 sm:px-6">
        <AdSlot placement="home_hero_top" />
      </section>

      {/* ─── FAST CATEGORY BAR ──────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-3.5 sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            Vyote
          </button>
          {categories.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.name.toLowerCase();
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.name)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-[#0062C3] text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── ACTIVE PROMOTIONS STRIP (IF ANY) ────────────────────────────────── */}
      {promotions.length > 0 && (
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {promotions.slice(0, 3).map((promo) => (
              <div
                key={promo.code}
                className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#EBF4FF] text-[#0062C3]">
                      {promo.code}
                    </span>
                    {promo.badge && (
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-[#E5002B] text-white">
                        {promo.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{promo.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{promo.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyPromo(promo.code)}
                  className="shrink-0 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  {copiedPromo === promo.code ? (
                    <span className="text-emerald-600 font-bold">Copied!</span>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── POPULAR & FEATURED DISHES: 2-COL MOBILE / 4-COL DESKTOP ───────── */}
      <section className="max-w-7xl mx-auto px-3.5 sm:px-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0062C3] block">
              {activeCategory === "all" ? "Popular Picks" : activeCategory}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {activeCategory === "all" ? "Most Ordered Dishes" : `${activeCategory} Menu`}
            </h2>
          </div>
          <Link
            href="/order"
            className="text-xs font-bold text-[#0062C3] hover:text-[#004B93] inline-flex items-center gap-1"
          >
            <span>Full Menu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Responsive Compact Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {filteredItems.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              onOpenCustomizer={openCustomizer}
              showCategoryBadge={activeCategory === "all"}
            />
          ))}
        </div>

        <div className="text-center pt-2">
          <Link
            href="/order"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-2xs"
          >
            <span>Tazama Menu Yote</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#0062C3]" />
          </Link>
        </div>
      </section>

      {/* ─── MINIMAL TRUST ASSURANCE STRIP ───────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-3.5 sm:px-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-[#E5002B] shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">100% Halal & Fresh</div>
              <div className="text-[11px] text-slate-500">Local prime meats cooked daily</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Fast Kariakoo Dispatch</div>
              <div className="text-[11px] text-slate-500">Direct kitchen-to-door delivery</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900">M-Pesa & Cash on Delivery</div>
              <div className="text-[11px] text-slate-500">Live order status tracking</div>
            </div>
          </div>
        </div>
      </section>

      {/* Item Customizer Modal */}
      <ItemCustomizerModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
