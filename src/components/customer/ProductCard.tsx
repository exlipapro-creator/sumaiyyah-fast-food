"use client";

import React, { useState } from "react";
import type { PublicItem } from "@/app/api/public/menu/route";
import { useCart } from "@/context/CartContext";
import { Heart, Plus, Clock, Check, CookingPot } from "lucide-react";

interface ProductCardProps {
  item: PublicItem;
  onOpenCustomizer: (item: PublicItem) => void;
  showCategoryBadge?: boolean;
}

export default function ProductCard({
  item,
  onOpenCustomizer,
  showCategoryBadge = false,
}: ProductCardProps) {
  const { addItem, toggleFavorite, isFavorite } = useCart();
  const [quickAdded, setQuickAdded] = useState(false);

  const isFav = isFavorite(item.id);
  const hasRequiredOptions =
    (item.options?.variants && item.options.variants.length > 0) ||
    (item.options?.addons && item.options.addons.length > 0);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.in_stock) return;

    if (hasRequiredOptions) {
      onOpenCustomizer(item);
    } else {
      // Direct quick add for simple items
      addItem({
        menu_item_id: item.id,
        name: item.name,
        base_price_tsh: item.price_tsh,
        image_url: item.image_url,
        quantity: 1,
      });
      setQuickAdded(true);
      setTimeout(() => setQuickAdded(false), 900);
    }
  };

  return (
    <div
      onClick={() => item.in_stock && onOpenCustomizer(item)}
      className={`group relative bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-150 shadow-xs hover:shadow-md cursor-pointer ${
        !item.in_stock ? "opacity-75" : ""
      }`}
    >
      <div>
        {/* Card Image Container */}
        <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden flex items-center justify-center">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-3 text-center">
              <CookingPot className="w-6 h-6 sm:w-8 sm:h-8 text-[#0062C3]/60 mb-0.5" />
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-mono truncate max-w-[90%]">
                {item.category_name}
              </span>
            </div>
          )}

          {/* Favorite Button (Top-Right) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item.id);
            }}
            className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
              isFav
                ? "bg-rose-500 text-white shadow-xs"
                : "bg-white/85 text-slate-600 hover:bg-white hover:text-rose-500 shadow-xs"
            }`}
            aria-label="Add to favorites"
          >
            <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFav ? "fill-current" : ""}`} />
          </button>

          {/* Top-Left Category or Deal Badges */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {item.is_deal && (
              <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-md bg-[#E5002B] text-white shadow-xs">
                Ofa
              </span>
            )}
            {!item.in_stock && (
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-xs">
                Imeisha
              </span>
            )}
            {item.in_stock && item.track_stock && item.stock_qty <= 4 && (
              <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                Zimebaki {item.stock_qty}
              </span>
            )}
            {showCategoryBadge && !item.is_deal && (
              <span className="hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-white/90 text-slate-800 shadow-xs backdrop-blur-xs">
                {item.category_name}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-2.5 sm:p-3.5 space-y-1 sm:space-y-1.5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0062C3] transition-colors line-clamp-1 leading-snug">
            {item.name}
          </h3>

          <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 leading-tight hidden sm:block">
            {item.description}
          </p>

          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-0.5 text-slate-500">
              <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-500" />
              <span>Dak {item.prep_time_min}</span>
            </span>
            {item.spiciness && item.spiciness !== "Mild" && (
              <>
                <span>•</span>
                <span className="text-[#E5002B] font-medium">{item.spiciness}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Price & Direct Add Action */}
      <div className="p-2.5 sm:p-3.5 pt-0 sm:pt-0 flex items-center justify-between gap-1 mt-1 border-t border-slate-100/80 pt-2">
        <div className="min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-black font-mono text-[#004B93] block truncate">
            TZS {item.price_tsh.toLocaleString()}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAction}
          disabled={!item.in_stock}
          className={`shrink-0 flex items-center justify-center gap-1 rounded-xl font-bold transition-all ${
            !item.in_stock
              ? "bg-slate-100 text-slate-400 cursor-not-allowed px-2 py-1 text-[10px]"
              : quickAdded
              ? "bg-emerald-600 text-white px-2.5 sm:px-3 py-1.5 text-xs shadow-xs"
              : "bg-[#0062C3] hover:bg-[#004B93] text-white active:scale-90 shadow-xs px-2.5 sm:px-3 py-1.5 text-xs"
          }`}
          aria-label={hasRequiredOptions ? `Badili ${item.name}` : `Ongeza ${item.name}`}
        >
          {quickAdded ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Imewekwa</span>
            </>
          ) : !item.in_stock ? (
            <span>Imeisha</span>
          ) : hasRequiredOptions ? (
            <>
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Chaguzi</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ongeza</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
