"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import confetti from "canvas-confetti";
import {
  Truck,
  Store,
  Utensils,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  User,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Flame,
  CheckCircle2,
  CookingPot,
} from "lucide-react";

interface CheckoutClientProps {
  settings: {
    restaurant_name: string;
    phone: string;
    delivery_fee_tsh: number;
    min_order_tsh: number;
    delivery_available: number;
    estimated_prep_min: number;
  };
}

export default function CheckoutClient({ settings }: CheckoutClientProps) {
  const router = useRouter();
  const {
    items,
    clearCart,
    subtotal,
    discountAmount,
    deliveryFee,
    grandTotal,
    fulfillmentType,
    setFulfillmentType,
    appliedPromo,
  } = useCart();

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("Kariakoo");
  const [landmark, setLandmark] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mobile" | "card">("mobile");
  const [mobileNetwork, setMobileNetwork] = useState<"mpesa" | "tigopesa" | "airtel">("mpesa");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const darAreas = [
    "Kariakoo (10-15 mins)",
    "Posta / CBD (12-18 mins)",
    "Upanga (Mashariki & Magharibi) (15-20 mins)",
    "Ilala (Boma & Karume) (18-25 mins)",
    "Magomeni (Mapipa & Kagera) (20-30 mins)",
    "Kisutu & Gerezani (10-15 mins)",
    "Kivukoni & Ferry (15-22 mins)",
    "Muhimbili / Jangwani (15-22 mins)",
    "Kinondoni & Hananasif (25-35 mins)",
    "Sinza & Mwenge (35-45 mins)",
    "Mikocheni & Masaki (35-45 mins)",
    "Other Dar es Salaam Area",
  ];

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#EBF4FF] flex items-center justify-center mx-auto text-[#0062C3]">
            <CookingPot className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Please add your favorite meals or drinks to your cart before proceeding to checkout.
          </p>
          <Link
            href="/order"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <span>Back to Menu</span>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!customerPhone.trim()) {
      setError("Please enter your phone number so we can reach you about your order.");
      return;
    }
    if (fulfillmentType === "delivery" && !deliveryAddress.trim()) {
      setError("Please enter your delivery street address or location.");
      return;
    }

    setLoading(true);

    try {
      const fullAddress =
        fulfillmentType === "delivery"
          ? `${deliveryArea}, ${deliveryAddress.trim()}${landmark ? ` (Landmark: ${landmark})` : ""}`
          : fulfillmentType === "dine_in" && tableNumber
          ? `Dine-In Table: ${tableNumber}`
          : "";

      const orderPayload = {
        order_type: fulfillmentType,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: fullAddress,
        payment_method: paymentMethod,
        promo_code: appliedPromo?.code || undefined,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          variant: i.variant,
          addons: i.addons,
          instructions: i.instructions,
        })),
      };

      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to place order. Please try again.");
        setLoading(false);
        return;
      }

      // Order created successfully!
      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {}

      // Clear local cart
      clearCart();

      // Redirect to live order tracking page
      router.push(`/track-order?receipt=${encodeURIComponent(data.receipt_number)}`);
    } catch (err: any) {
      setError("A network error occurred. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      
      {/* Top back link */}
      <div className="mb-6">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Cart Review</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Customer Information Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif">Checkout & Delivery</h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Complete your details below to place your order with our Kariakoo kitchen.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmitOrder} className="space-y-6">
            
            {/* 1. Contact Information */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-[#0062C3]" />
                <h2 className="text-xs uppercase font-bold tracking-wider text-slate-800">
                  1. Contact Information
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Juma Rashid"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Phone Number (M-Pesa/Call) *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0712 345 678"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. Delivery / Pickup Location */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0062C3]" />
                  <h2 className="text-xs uppercase font-bold tracking-wider text-slate-800">
                    2. Dining / Delivery Details
                  </h2>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono text-[#0062C3] font-bold uppercase bg-[#EBF4FF] px-2.5 py-0.5 rounded-md">
                  {fulfillmentType === "delivery" ? "🛵 Delivery" : fulfillmentType === "pickup" ? "🛍️ Pickup" : "🍽️ Dine-in"}
                </div>
              </div>

              {fulfillmentType === "delivery" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Area in Dar es Salaam *</label>
                      <select
                        value={deliveryArea}
                        onChange={(e) => setDeliveryArea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none cursor-pointer"
                      >
                        {darAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Nearby Landmark / Gate Color</label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near CRDB Bank / Blue gate"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Street Name & House / Apt Number *</label>
                    <input
                      type="text"
                      required={fulfillmentType === "delivery"}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Lumumba Street, House 42, Floor 2"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {fulfillmentType === "pickup" && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs text-slate-600">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-[#0062C3]" />
                    <span>Pickup Location: Sumaiyyah Fast Food Kariakoo</span>
                  </div>
                  <p className="text-slate-500">
                    Your food will be packaged and ready for collection at the counter within approx. 15–20 minutes.
                  </p>
                </div>
              )}

              {fulfillmentType === "dine_in" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Table Number (If seated)</label>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. Table 4"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <CreditCard className="w-4 h-4 text-[#0062C3]" />
                <h2 className="text-xs uppercase font-bold tracking-wider text-slate-800">
                  3. Payment Method
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "mobile",
                    label: "Mobile Money",
                    sub: "M-Pesa / Tigo / Airtel",
                    icon: Smartphone,
                  },
                  {
                    id: "cash",
                    label: "Cash on Delivery",
                    sub: "Pay driver or cashier",
                    icon: Banknote,
                  },
                  {
                    id: "card",
                    label: "Card at Counter",
                    sub: "Visa / Mastercard",
                    icon: CreditCard,
                  },
                ].map((m) => {
                  const isSel = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSel
                          ? "bg-[#EBF4FF] border-[#0062C3] text-slate-900 ring-2 ring-[#0062C3]/20 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSel ? "text-[#0062C3]" : "text-slate-400"}`} />
                      <div className="mt-3">
                        <div className="text-xs font-bold text-slate-900">{m.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{m.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {paymentMethod === "mobile" && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
                  <div className="font-semibold text-slate-900">Select Your Mobile Network:</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "mpesa", label: "Vodacom M-Pesa" },
                      { id: "tigopesa", label: "Tigo Pesa" },
                      { id: "airtel", label: "Airtel Money" },
                    ].map((net) => (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => setMobileNetwork(net.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          mobileNetwork === net.id
                            ? "bg-[#0062C3] text-white border-[#0062C3]"
                            : "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {net.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    You will receive payment instructions or can pay via Lipa namba when the rider arrives.
                  </p>
                </div>
              )}
            </div>

            {/* 4. Kitchen / Delivery Notes */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <h2 className="text-xs uppercase font-bold tracking-wider text-slate-800">
                4. Additional Notes for Kitchen / Driver (Optional)
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please ring the doorbell, extra napkins, extra chilli on the side..."
                rows={2}
                maxLength={250}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] rounded-xl p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 rounded-xl text-sm sm:text-base font-bold shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                loading
                  ? "bg-slate-300 text-slate-500 cursor-wait"
                  : "bg-[#0062C3] hover:bg-[#004B93] text-white"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting to Kitchen...</span>
                </>
              ) : (
                <>
                  <CookingPot className="w-5 h-5" />
                  <span>Place Order • TZS {grandTotal.toLocaleString()}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Col: Order Summary & Review */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 sticky top-24 shadow-sm">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-800">
              Order Summary ({items.reduce((s, i) => s + i.quantity, 0)} items)
            </h2>

            {/* Mini Items List */}
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto space-y-2 pr-1">
              {items.map((item) => (
                <div key={item.cartId} className="pt-2 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">
                      {item.quantity}x {item.name}
                    </div>
                    {item.variant && (
                      <div className="text-[11px] text-[#0062C3] font-semibold">{item.variant}</div>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[11px] text-slate-500">
                        +{item.addons.map((a) => a.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    TZS {(item.unit_price_tsh * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Pricing Math */}
            <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-900">TZS {subtotal.toLocaleString()}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-semibold">
                  <span>Promo Discount ({appliedPromo?.code})</span>
                  <span className="font-mono">- TZS {discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Fulfillment ({fulfillmentType})</span>
                <span className="font-mono font-semibold text-slate-900">
                  {deliveryFee > 0 ? `TZS ${deliveryFee.toLocaleString()}` : "FREE"}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-base font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="font-mono text-[#004B93] text-lg font-black">
                  TZS {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Trust Assurance */}
            <div className="bg-[#F7FAFD] border border-slate-200 rounded-xl p-3.5 space-y-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Live Kitchen Queue Direct Transmission</span>
              </div>
              <p>
                Your order is sent straight to the chef&apos;s screen upon confirmation. You will receive live updates on prep and dispatch.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
