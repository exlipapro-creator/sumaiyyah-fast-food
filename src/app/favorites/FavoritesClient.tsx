"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { PublicItem } from "@/app/api/public/menu/route";
import ProductCard from "@/components/customer/ProductCard";
import ItemCustomizerModal from "@/components/customer/ItemCustomizerModal";
import { useCart } from "@/context/CartContext";
import { Heart, ArrowRight, CookingPot } from "lucide-react";

interface FavoritesClientProps {
  allItems: PublicItem[];
}

export default function FavoritesClient({ allItems }: FavoritesClientProps) {
  const { favorites, itemCount, grandTotal } = useCart();
  const [selectedItem, setSelectedItem] = useState<PublicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const favoriteItems = allItems.filter((i) => favorites.includes(i.id));

  const openCustomizer = (item: PublicItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 min-h-[75vh] pb-28">
      
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-3.5 mb-6">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-rose-600 font-bold">
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Personal Shortlist</span>
        </div>
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 font-serif tracking-tight mt-0.5">
          Saved Favorite Dishes ({favoriteItems.length})
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Quickly re-order your favorite burgers, seasoned wings, and side combos with one tap.
        </p>
      </div>

      {favoriteItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-sm mx-auto space-y-4 my-8 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500">
            <Heart className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No favorites saved yet</h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              Tap the heart icon on any burger, side, or beverage while browsing to save it here for fast re-ordering.
            </p>
          </div>
          <Link
            href="/order"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
          >
            <span>Browse Restaurant Menu</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
          {favoriteItems.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              onOpenCustomizer={openCustomizer}
              showCategoryBadge={true}
            />
          ))}
        </div>
      )}

      {/* Floating cart bar */}
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

      {/* Modal */}
      <ItemCustomizerModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
