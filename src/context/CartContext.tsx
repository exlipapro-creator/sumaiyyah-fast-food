"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { PublicItem } from "@/app/api/public/menu/route";

export interface CartItem {
  cartId: string;
  menu_item_id: number;
  name: string;
  base_price_tsh: number;
  unit_price_tsh: number;
  quantity: number;
  image_url: string | null;
  variant?: string;
  addons?: { name: string; price: number }[];
  instructions?: string;
}

export interface AppliedPromo {
  code: string;
  title: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_tsh: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: {
    menu_item_id: number;
    name: string;
    base_price_tsh: number;
    image_url: string | null;
    variant?: string;
    variant_price_diff?: number;
    addons?: { name: string; price: number }[];
    instructions?: string;
    quantity?: number;
  }) => void;
  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  fulfillmentType: "delivery" | "pickup" | "dine_in";
  setFulfillmentType: (type: "delivery" | "pickup" | "dine_in") => void;
  appliedPromo: AppliedPromo | null;
  applyPromo: (promo: AppliedPromo) => { success: boolean; message: string };
  removePromo: () => void;
  favorites: number[];
  toggleFavorite: (menuItemId: number) => void;
  isFavorite: (menuItemId: number) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = "sumaiyyah_cart_v1";
const FAVORITES_STORAGE_KEY = "sumaiyyah_favorites_v1";
const PROMO_STORAGE_KEY = "sumaiyyah_promo_v1";
const FULFILLMENT_STORAGE_KEY = "sumaiyyah_fulfillment_v1";

const DEFAULT_DELIVERY_FEE = 2500;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [fulfillmentType, setFulfillmentTypeState] = useState<"delivery" | "pickup" | "dine_in">("delivery");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setItems(JSON.parse(savedCart));

      const savedFavs = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedPromo = localStorage.getItem(PROMO_STORAGE_KEY);
      if (savedPromo) setAppliedPromo(JSON.parse(savedPromo));

      const savedFulfillment = localStorage.getItem(FULFILLMENT_STORAGE_KEY);
      if (savedFulfillment && ["delivery", "pickup", "dine_in"].includes(savedFulfillment)) {
        setFulfillmentTypeState(savedFulfillment as "delivery" | "pickup" | "dine_in");
      }
    } catch (e) {
      console.warn("Failed to load cart from storage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save cart", e);
    }
  }, [items, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn("Failed to save favorites", e);
    }
  }, [favorites, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (appliedPromo) {
        localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(appliedPromo));
      } else {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to save promo", e);
    }
  }, [appliedPromo, isLoaded]);

  const setFulfillmentType = (type: "delivery" | "pickup" | "dine_in") => {
    setFulfillmentTypeState(type);
    try {
      localStorage.setItem(FULFILLMENT_STORAGE_KEY, type);
    } catch (e) {}
  };

  const addItem = ({
    menu_item_id,
    name,
    base_price_tsh,
    image_url,
    variant,
    variant_price_diff = 0,
    addons = [],
    instructions = "",
    quantity = 1,
  }: {
    menu_item_id: number;
    name: string;
    base_price_tsh: number;
    image_url: string | null;
    variant?: string;
    variant_price_diff?: number;
    addons?: { name: string; price: number }[];
    instructions?: string;
    quantity?: number;
  }) => {
    const addonsTotal = addons.reduce((sum, a) => sum + Number(a.price || 0), 0);
    const unitPrice = base_price_tsh + variant_price_diff + addonsTotal;

    // Create unique cartId based on configuration
    const sortedAddons = [...addons].sort((a, b) => a.name.localeCompare(b.name));
    const cartId = `${menu_item_id}_${variant || "default"}_${JSON.stringify(sortedAddons)}_${instructions.trim()}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.cartId === cartId);
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += quantity;
        return copy;
      }
      return [
        ...prev,
        {
          cartId,
          menu_item_id,
          name,
          base_price_tsh,
          unit_price_tsh: unitPrice,
          quantity,
          image_url,
          variant,
          addons,
          instructions: instructions.trim(),
        },
      ];
    });
  };

  const removeItem = (cartId: string) => {
    setItems((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.cartId === cartId ? { ...item, quantity: Math.min(quantity, 99) } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedPromo(null);
  };

  const toggleFavorite = (menuItemId: number) => {
    setFavorites((prev) =>
      prev.includes(menuItemId) ? prev.filter((id) => id !== menuItemId) : [...prev, menuItemId]
    );
  };

  const isFavorite = (menuItemId: number) => favorites.includes(menuItemId);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unit_price_tsh * item.quantity, 0);

  let discountAmount = 0;
  if (appliedPromo && subtotal >= appliedPromo.min_order_tsh) {
    if (appliedPromo.discount_type === "percent") {
      discountAmount = Math.round((subtotal * appliedPromo.discount_value) / 100);
    } else {
      discountAmount = Math.min(subtotal, appliedPromo.discount_value);
    }
  }

  const deliveryFee = fulfillmentType === "delivery" && items.length > 0 ? DEFAULT_DELIVERY_FEE : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee);

  const applyPromo = (promo: AppliedPromo): { success: boolean; message: string } => {
    if (subtotal < promo.min_order_tsh) {
      return {
        success: false,
        message: `This promo requires a minimum order of TZS ${promo.min_order_tsh.toLocaleString()}`,
      };
    }
    setAppliedPromo(promo);
    return { success: true, message: `Promo code ${promo.code} applied successfully!` };
  };

  const removePromo = () => {
    setAppliedPromo(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        discountAmount,
        deliveryFee,
        grandTotal,
        fulfillmentType,
        setFulfillmentType,
        appliedPromo,
        applyPromo,
        removePromo,
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
