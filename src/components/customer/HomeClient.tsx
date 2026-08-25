"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicItem } from "@/app/api/public/menu/route";
import ProductCard from "@/components/customer/ProductCard";
import ItemCustomizerModal from "@/components/customer/ItemCustomizerModal";
import { useCart } from "@/context/CartContext";
import {
  Compass,
  Route,
  Search,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Truck,
  CookingPot,
  Flame,
  Tag,
  Check,
  Smartphone,
  ArrowRight,
  Building2,
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
      
      {/* ─── COMPACT APP HERO: FAST FOOD DISCOVERY ──────────────────────────── */}
      <section className="bg-gradient-to-b from-[#EBF4FF]/80 via-[#F7FAFD] to-[#F7FAFD] pt-6 sm:pt-10 pb-8 sm:pb-12 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
              
              {/* Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-700 text-xs font-semibold">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-[#004B93]">KITCHEN OPEN</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-mono">15–25 min prep</span>
              </div>

              {/* Punchy Headline */}
              <div className="space-y-1.5">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
                  Char-Grilled Burgers & <br className="hidden sm:inline" />
                  <span className="text-[#0062C3]">Fresh Swahili Bites.</span>
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Cooked to order in Kariakoo with 100% Halal prime cuts, homemade spiced sauces, and rapid Dar delivery.
                </p>
              </div>

              {/* Quick Search Bar */}
              <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto lg:mx-0 pt-1">
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search smash burger, wings, peri-fries..."
                    className="w-full bg-white border border-slate-300 focus:border-[#0062C3] rounded-xl pl-10 pr-24 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none shadow-xs transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 sm:px-4 py-1.5 bg-[#0062C3] hover:bg-[#004B93] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Direct Quick Actions */}
              <div className="flex items-center justify-center lg:justify-start gap-2.5 pt-1">
                <Link
                  href="/order"
                  id="home-explore-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95"
                >
                  <Compass className="w-4 h-4" />
                  <span>Order Now</span>
                </Link>
                <Link
                  href="/corporate"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-2xs"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#0062C3]" />
                  <span>Office & Catering</span>
                </Link>
                <Link
                  href="/track-order"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-2xs"
                >
                  <Route className="w-3.5 h-3.5 text-[#0062C3]" />
                  <span>Track Order</span>
                </Link>
              </div>

            </div>

            {/* Right Card: Quick Deal / Chef Pick Highlight */}
            {displayFeatured[0] && (
              <div className="lg:col-span-5">
                <div
                  onClick={() => openCustomizer(displayFeatured[0])}
                  className="relative mx-auto max-w-sm bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-slate-100 mb-3">
                    {displayFeatured[0].image_url ? (
                      <img
                        src={displayFeatured[0].image_url}
                        alt={displayFeatured[0].name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <CookingPot className="w-10 h-10 text-[#0062C3]" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white bg-[#0062C3] px-2.5 py-0.5 rounded-md shadow-xs">
                        ⭐ Chef&apos;s Pick
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-[#0062C3] block">
                        {displayFeatured[0].category_name}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug group-hover:text-[#0062C3] transition-colors">
                        {displayFeatured[0].name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {displayFeatured[0].description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono text-[#004B93]">
                        TZS {displayFeatured[0].price_tsh.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
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
            All Items ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category_id === cat.id).length;
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
                {cat.name} ({count})
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
            <span>Explore All {items.length} Menu Items</span>
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
