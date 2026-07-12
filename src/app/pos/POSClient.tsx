"use client";

import { useState } from "react";
import { formatTSH } from "@/lib/money";

interface MenuItem {
  id: number;
  name: string;
  price_tsh: number;
  category_id: number;
  category_name: string;
  image_url: string | null;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface Category {
  id: number;
  name: string;
}

interface ReceiptData {
  receipt_no: string;
  items: { name_snapshot: string; quantity: number; unit_price_tsh: number; line_total_tsh: number }[];
  subtotal_tsh: number;
  discount_amount_tsh: number;
  total_tsh: number;
  payment_method: string;
}

export default function POSClient({
  items,
  categories,
}: {
  items: MenuItem[];
  categories: Category[];
  cashierId: number;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<"none" | "percent" | "fixed">("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState<{ type: string; value: number; amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile" | "card">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const filteredItems = selectedCategory
    ? items.filter(i => i.category_id === selectedCategory)
    : items;

  function addToCart(item: MenuItem) {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  }

  function incQty(itemId: number) {
    setCart(prev => prev.map(c => c.item.id === itemId ? { ...c, quantity: c.quantity + 1 } : c));
  }

  function decQty(itemId: number) {
    setCart(prev => {
      const item = prev.find(c => c.item.id === itemId);
      if (!item) return prev;
      if (item.quantity <= 1) return prev.filter(c => c.item.id !== itemId);
      return prev.map(c => c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }

  function voidCart() {
    setCart([]);
    setAppliedDiscount(null);
    setDiscountType("none");
    setDiscountValue(0);
    setError("");
  }

  const subtotal = cart.reduce((sum, c) => sum + c.item.price_tsh * c.quantity, 0);

  function applyDiscount() {
    let amount = 0;
    if (discountType === "percent") {
      amount = Math.round(subtotal * Math.min(100, Math.max(0, discountValue)) / 100);
    } else if (discountType === "fixed") {
      amount = Math.min(subtotal, Math.max(0, discountValue));
    }
    setAppliedDiscount({ type: discountType, value: discountValue, amount });
  }

  const discountAmount = appliedDiscount?.amount ?? 0;
  const total = subtotal - discountAmount;

  async function confirmSale() {
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(c => ({ menu_item_id: c.item.id, quantity: c.quantity })),
          discount_type: appliedDiscount?.type || "none",
          discount_value: appliedDiscount?.value || 0,
          payment_method: paymentMethod,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to process sale");
        return;
      }
      const data = await res.json();
      setReceipt({
        receipt_no: data.order.receipt_no,
        items: data.items,
        subtotal_tsh: data.order.subtotal_tsh,
        discount_amount_tsh: data.order.discount_amount_tsh,
        total_tsh: data.order.total_tsh,
        payment_method: data.order.payment_method,
      });
      setCart([]);
      setAppliedDiscount(null);
      setDiscountType("none");
      setDiscountValue(0);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (receipt) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6" data-testid="receipt-view">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">✅</div>
            <h1 className="text-2xl font-bold text-slate-50">Sale Complete!</h1>
            <p className="text-slate-400 text-sm mt-1">Receipt</p>
          </div>
          
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <span className="text-slate-400 text-sm">Receipt No.</span>
            <span data-testid="receipt-number" className="text-amber-500 font-bold font-mono">{receipt.receipt_no}</span>
          </div>

          <div className="space-y-2 mb-6">
            {receipt.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{item.name_snapshot} × {item.quantity}</span>
                <span className="tabular-nums text-slate-200">{formatTSH(item.line_total_tsh)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatTSH(receipt.subtotal_tsh)}</span>
            </div>
            {receipt.discount_amount_tsh > 0 && (
              <div className="flex justify-between text-sm text-emerald-400">
                <span>Discount</span>
                <span className="tabular-nums">-{formatTSH(receipt.discount_amount_tsh)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-slate-50 pt-2 border-t border-slate-800">
              <span>Total</span>
              <span className="tabular-nums text-amber-500">{formatTSH(receipt.total_tsh)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Payment</span>
              <span className="capitalize">{receipt.payment_method}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              data-testid="receipt-print"
              onClick={() => window.print()}
              className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-4 py-2.5 hover:bg-slate-700 font-semibold transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={() => setReceipt(null)}
              className="flex-1 bg-amber-500 text-slate-950 rounded-lg px-4 py-2.5 hover:bg-amber-400 font-semibold transition-colors"
            >
              New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] lg:min-h-screen">
      {/* Items grid - left */}
      <div className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-50">POS</h1>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div data-testid="pos-grid" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredItems.map(item => {
            const cartItem = cart.find(c => c.item.id === item.id);
            return (
              <button
                key={item.id}
                data-testid={`pos-item-${item.id}`}
                onClick={() => addToCart(item)}
                className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 min-h-24 text-left hover:border-amber-500/50 hover:bg-slate-800 transition-all group"
              >
                {cartItem && (
                  <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItem.quantity}
                  </span>
                )}
                <div className="text-2xl mb-2">🍔</div>
                <div className="text-base font-semibold text-slate-100 group-hover:text-amber-400 transition-colors leading-tight">
                  {item.name}
                </div>
                <div className="text-amber-500 text-sm font-semibold mt-1 tabular-nums">
                  {formatTSH(item.price_tsh)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart panel - right */}
      <div className="lg:w-80 xl:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Current Order</h2>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.length === 0 ? (
            <div data-testid="cart-empty" className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-3xl mb-2">🛒</div>
              <p className="text-slate-400 text-sm">Cart is empty</p>
              <p className="text-slate-500 text-xs mt-1">Tap items to add</p>
            </div>
          ) : (
            <div data-testid="cart-list" className="space-y-3">
              {cart.map(({ item, quantity }) => (
                <div key={item.id} data-testid={`cart-line-${item.id}`} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">{item.name}</div>
                    <div className="text-xs text-amber-500 tabular-nums">{formatTSH(item.price_tsh * quantity)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      data-testid={`cart-dec-${item.id}`}
                      onClick={() => decQty(item.id)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 flex items-center justify-center text-sm font-bold transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm text-slate-100 tabular-nums">{quantity}</span>
                    <button
                      data-testid={`cart-inc-${item.id}`}
                      onClick={() => incQty(item.id)}
                      className="w-7 h-7 rounded-lg bg-slate-800 text-slate-100 hover:bg-slate-700 flex items-center justify-center text-sm font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount */}
        <div className="px-5 py-3 border-t border-slate-800 space-y-2">
          <div className="flex gap-2">
            <select
              data-testid="discount-type"
              value={discountType}
              onChange={e => setDiscountType(e.target.value as typeof discountType)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="none">No discount</option>
              <option value="percent">% Discount</option>
              <option value="fixed">Fixed TSH</option>
            </select>
            <input
              data-testid="discount-value"
              type="number"
              min="0"
              value={discountValue}
              onChange={e => setDiscountValue(Number(e.target.value))}
              disabled={discountType === "none"}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-40"
              placeholder="0"
            />
          </div>
          <button
            data-testid="apply-discount"
            onClick={applyDiscount}
            disabled={discountType === "none"}
            className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-1.5 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply Discount
          </button>
          {appliedDiscount && appliedDiscount.type !== "none" && (
            <div className="text-emerald-400 text-xs text-center">
              Discount: -{formatTSH(appliedDiscount.amount)}
            </div>
          )}
        </div>

        {/* Total */}
        <div className="px-5 py-3 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Subtotal</span>
            <span className="tabular-nums text-slate-300 text-sm">{formatTSH(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-emerald-400 text-sm">Discount</span>
              <span className="tabular-nums text-emerald-400 text-sm">-{formatTSH(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
            <span className="font-bold text-slate-100">Total</span>
            <span data-testid="cart-total" className="font-bold text-xl text-amber-500 tabular-nums">{formatTSH(total)}</span>
          </div>
        </div>

        {/* Payment + actions */}
        <div className="px-5 py-4 border-t border-slate-800 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Payment Method</label>
            <select
              data-testid="payment-method"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="cash">Cash</option>
              <option value="mobile">Mobile Money</option>
              <option value="card">Card</option>
            </select>
          </div>

          {error && (
            <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              data-testid="cart-void"
              onClick={voidCart}
              className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-2.5 text-sm hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400 transition-colors font-semibold"
            >
              Void
            </button>
            <button
              data-testid="confirm-sale"
              onClick={confirmSale}
              disabled={loading || cart.length === 0}
              className="flex-1 bg-amber-500 text-slate-950 rounded-lg py-2.5 text-sm hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? "Processing..." : "Confirm Sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
