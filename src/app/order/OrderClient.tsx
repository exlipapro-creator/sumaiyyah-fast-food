"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { PublicItem } from "@/app/api/public/menu/route";
import ProductCard from "@/components/customer/ProductCard";
import ItemCustomizerModal from "@/components/customer/ItemCustomizerModal";
import { useCart } from "@/context/CartContext";
import {
  Search,
  Clock,
  Sparkles,
  ShoppingBag,
  Filter,
  X,
  ArrowRight,
  ChevronDown,
  CookingPot,
  Flame,
} from "lucide-react";

interface OrderClientProps {
  initialCategories: { id: number; name: string }[];
  initialItems: PublicItem[];
  initialPromotions: {
    id: number;
    code: string;
    title: string;
    description: string;
    discount_type: "percent" | "fixed";
    discount_value: number;
    badge: string | null;
  }[];
}

export default function OrderClient({
  initialCategories,
  initialItems,
  initialPromotions,
}: OrderClientProps) {
  const { itemCount, grandTotal } = useCart();

  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [promotions, setPromotions] = useState(initialPromotions);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc" | "prep_time">("featured");

  const [selectedItem, setSelectedItem] = useState<PublicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Background polling to keep customer menu synced with POS / Kitchen updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/public/menu");
        if (res.ok) {
          const data = await res.json();
          if (data.items) setItems(data.items);
          if (data.categories) setCategories(data.categories);
          if (data.promotions) setPromotions(data.promotions);
        }
      } catch (err) {
        console.warn("Silent menu sync error", err);
      }
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const openCustomizer = (item: PublicItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter((item) => {
        // Category filter
        if (selectedCategory !== "all" && item.category_name.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCat = item.category_name.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }
        // Dietary filter
        if (dietaryFilter === "combos" && !item.is_deal) return false;
        if (dietaryFilter === "spicy" && item.spiciness.toLowerCase() === "mild") return false;
        if (dietaryFilter === "halal" && !item.dietary_tags?.includes("Halal")) return false;
        if (dietaryFilter === "vegetarian" && !item.dietary_tags?.includes("Vegetarian")) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") return a.price_tsh - b.price_tsh;
        if (sortBy === "price_desc") return b.price_tsh - a.price_tsh;
        if (sortBy === "prep_time") return a.prep_time_min - b.prep_time_min;
        // Default: featured first, then in-stock
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return 0;
      });
  }, [items, selectedCategory, searchQuery, dietaryFilter, sortBy]);

  return (
    <div className="min-h-[80vh] pb-28 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 space-y-4 sm:space-y-6">
        
        {/* ─── Search & Controls Bar ────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-serif">
                Menu & Food Ordering
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                {filteredAndSortedItems.length} dishes ready to order • Avg. prep 15–25 mins
              </p>
            </div>

            {/* Quick Deals Pill */}
            {promotions.length > 0 && (
              <Link
                href="/deals"
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF4FF] text-[#0062C3] hover:bg-blue-100 border border-blue-200/60 text-xs font-bold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{promotions.length} Promo Codes Active</span>
              </Link>
            )}
          </div>

          {/* Search Input & Sort Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search burgers, wings, peri-fries, juices..."
                className="w-full bg-white border border-slate-200 focus:border-[#0062C3] rounded-xl pl-9 pr-9 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="sm:col-span-4 relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-white border border-slate-200 focus:border-[#0062C3] rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none appearance-none cursor-pointer shadow-2xs transition-colors"
              >
                <option value="featured">Featured & Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="prep_time">Fastest Prep Time</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ─── Category Tabs ──────────────────────────────────────────────── */}
        <div className="space-y-2">
          {/* Main Category Horizontal Scroll */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-[#0062C3] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90"
              }`}
            >
              All ({items.length})
            </button>
            {categories.map((cat) => {
              const count = items.filter((i) => i.category_id === cat.id).length;
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-[#0062C3] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/90"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Sub Dietary Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-xs scrollbar-none">
            {[
              { id: "all", label: "All Items" },
              { id: "combos", label: "🔥 Deals" },
              { id: "spicy", label: "🌶️ Spicy" },
              { id: "halal", label: "🥩 Halal" },
              { id: "vegetarian", label: "🥗 Veg" },
            ].map((chip) => {
              const isSel = dietaryFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setDietaryFilter(chip.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    isSel
                      ? "bg-[#EBF4FF] text-[#0062C3] border border-blue-200 font-bold"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Product Grid: 2 COLUMNS ON MOBILE (HIGH PRIORITY) ────────────── */}
        {filteredAndSortedItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-sm mx-auto space-y-3 my-6 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No dishes match your filter</h3>
            <p className="text-slate-500 text-xs">
              Try a different keyword or reset filters to see all delicious items.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setDietaryFilter("all");
              }}
              className="px-4 py-2 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-lg text-xs font-bold transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
            {filteredAndSortedItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onOpenCustomizer={openCustomizer}
                showCategoryBadge={selectedCategory === "all"}
              />
            ))}
          </div>
        )}

      </div>

      {/* ─── Floating Sticky Cart Bar ──────────────────────────────────────── */}
      {itemCount > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-30 animate-in slide-in-from-bottom-4 duration-200">
          <Link
            href="/cart"
            id="order-floating-cart-bar"
            className="flex items-center justify-between bg-[#0062C3] hover:bg-[#004B93] text-white p-3.5 rounded-2xl shadow-xl border border-white/20 transition-all transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-xs">
                {itemCount}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-blue-100">
                  {itemCount} {itemCount === 1 ? "Item" : "Items"} in Cart
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
