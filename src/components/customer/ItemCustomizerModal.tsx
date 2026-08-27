"use client";

import React, { useState, useEffect } from "react";
import type { PublicItem } from "@/app/api/public/menu/route";
import { useCart } from "@/context/CartContext";
import { X, Plus, Minus, Clock, Check, Heart, CookingPot } from "lucide-react";

interface ItemCustomizerModalProps {
  item: PublicItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ItemCustomizerModal({ item, isOpen, onClose }: ItemCustomizerModalProps) {
  const { addItem, toggleFavorite, isFavorite } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [variantPriceDiff, setVariantPriceDiff] = useState<number>(0);
  const [selectedAddons, setSelectedAddons] = useState<{ name: string; price: number }[]>([]);
  const [instructions, setInstructions] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Initialize options when item changes
  useEffect(() => {
    if (item) {
      setImgError(false);
      const defaultVariant = item.options?.variants && item.options.variants.length > 0
        ? item.options.variants[0]
        : null;

      setSelectedVariant(defaultVariant ? defaultVariant.name : "");
      setVariantPriceDiff(defaultVariant ? defaultVariant.price_diff : 0);
      setSelectedAddons([]);
      setInstructions("");
      setQuantity(1);
      setAddedAnimation(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleVariantChange = (variant: { name: string; price_diff: number }) => {
    setSelectedVariant(variant.name);
    setVariantPriceDiff(variant.price_diff);
  };

  const toggleAddon = (addon: { name: string; price: number }) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.name === addon.name);
      if (exists) {
        return prev.filter((a) => a.name !== addon.name);
      } else {
        return [...prev, addon];
      }
    });
  };

  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = item.price_tsh + variantPriceDiff + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!item.in_stock) return;

    addItem({
      menu_item_id: item.id,
      name: item.name,
      base_price_tsh: item.price_tsh,
      image_url: item.image_url,
      variant: selectedVariant || undefined,
      variant_price_diff: variantPriceDiff,
      addons: selectedAddons,
      instructions,
      quantity,
    });

    setAddedAnimation(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const isFav = isFavorite(item.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Visual & Close Button */}
        <div className="relative h-44 sm:h-52 w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-200">
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#EBF4FF] flex items-center justify-center mb-2">
                <CookingPot className="w-8 h-8 text-[#0062C3]" />
              </div>
              <span className="text-slate-500 text-xs font-mono tracking-wider uppercase">
                {item.category_name}
              </span>
            </div>
          )}

          {/* Close & Favorite buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(item.id)}
              className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                isFav
                  ? "bg-rose-500 text-white shadow-sm"
                  : "bg-white/80 text-slate-700 hover:bg-white border border-slate-200"
              }`}
              aria-label="Save to favorites"
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-700 border border-slate-200 backdrop-blur-md transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Badges overlay */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {item.dietary_tags && item.dietary_tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-slate-800 border border-slate-200 shadow-xs backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
            {!item.in_stock && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                Sold Out
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Title & Description */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{item.name}</h2>
              <div className="text-right">
                <div className="text-lg font-bold text-[#004B93] font-mono">
                  TZS {item.price_tsh.toLocaleString()}
                </div>
                <span className="text-[10px] text-slate-400">Base price</span>
              </div>
            </div>
            <p className="text-slate-500 text-sm mt-1 leading-relaxed">
              {item.description}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{item.prep_time_min} mins prep</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600">
                <span>{item.spiciness} spice</span>
              </div>
              {item.calories > 0 && (
                <div className="text-slate-500">
                  {item.calories} kcal
                </div>
              )}
            </div>
          </div>

          {/* Variants Selector */}
          {item.options?.variants && item.options.variants.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700">
                  Choose Size / Portion
                </h3>
                <span className="text-[10px] text-[#0062C3] font-semibold">Required</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {item.options.variants.map((variant) => {
                  const isSelected = selectedVariant === variant.name;
                  return (
                    <button
                      key={variant.name}
                      type="button"
                      onClick={() => handleVariantChange(variant)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all text-left ${
                        isSelected
                          ? "bg-[#EBF4FF] border-[#0062C3] text-slate-900 font-semibold shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-[#0062C3] bg-[#0062C3]" : "border-slate-400"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                        <span>{variant.name}</span>
                      </div>
                      <span className="font-mono text-xs text-slate-600">
                        {variant.price_diff > 0 ? `+TZS ${variant.price_diff.toLocaleString()}` : "Included"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons Selector */}
          {item.options?.addons && item.options.addons.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700">
                  Extra Toppings & Add-ons
                </h3>
                <span className="text-[10px] text-slate-400">Optional</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {item.options.addons.map((addon) => {
                  const isSelected = selectedAddons.some((a) => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddon(addon)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all text-left ${
                        isSelected
                          ? "bg-[#EBF4FF] border-[#0062C3] text-slate-900 font-semibold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? "border-[#0062C3] bg-[#0062C3]" : "border-slate-400"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                        <span>{addon.name}</span>
                      </div>
                      <span className="font-mono text-xs text-[#0062C3] font-bold">
                        +TZS {addon.price.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700">
              Special Instructions
            </h3>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Extra spicy, sauce on the side, no onions..."
              rows={2}
              maxLength={200}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0062C3] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Modal Footer / Add to Cart CTA */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
          {/* Quantity stepper */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold font-mono text-slate-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              disabled={quantity >= 20}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to order button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!item.in_stock}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold shadow-sm transition-all ${
              !item.in_stock
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : addedAnimation
                ? "bg-emerald-600 text-white shadow-md scale-[0.98]"
                : "bg-[#0062C3] hover:bg-[#004B93] text-white active:scale-95"
            }`}
          >
            {addedAnimation ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Added to Order!</span>
              </>
            ) : item.in_stock ? (
              <>
                <span>Add to Order</span>
                <span className="font-mono font-medium opacity-90 pl-1 border-l border-white/30">
                  TZS {totalPrice.toLocaleString()}
                </span>
              </>
            ) : (
              <span>Currently Sold Out</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
