"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import {
  Search,
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Truck,
  Flame,
  Phone,
  MessageSquare,
  RotateCcw,
  MapPin,
  Calendar,
  AlertCircle,
  CookingPot,
} from "lucide-react";

interface OrderTrackingData {
  id: number;
  receipt_number: string;
  created_at: string;
  total_tsh: number;
  subtotal_tsh: number;
  discount_tsh: number;
  delivery_fee_tsh: number;
  payment_method: string;
  status: string;
  fulfillment_status: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
  order_type: "delivery" | "pickup" | "dine_in" | "pos";
  order_channel?: string;
  is_scheduled?: number;
  scheduled_date?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  target_dispatch_at?: string;
  company_name?: string;
  attendee_count?: number;
  corp_building?: string;
  floor_office?: string;
  delivery_window?: string;
  invoice_number?: string;
  invoice_status?: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  notes: string;
  items: {
    id: number;
    menu_item_id: number;
    name: string;
    quantity: number;
    unit_price_tsh: number;
    total_tsh: number;
    variant?: string;
    addons?: { name: string; price: number }[];
    instructions?: string;
    image_url?: string | null;
  }[];
}

export default function TrackOrderClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCart();

  const receiptParam = searchParams.get("receipt") || "";
  const phoneParam = searchParams.get("phone") || "";

  const [inputQuery, setInputQuery] = useState(receiptParam || phoneParam || "");
  const [order, setOrder] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reordered, setReordered] = useState(false);

  const fetchOrder = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const isPhone = query.trim().startsWith("+") || /^[0-9]{8,15}$/.test(query.trim());
      const paramName = isPhone ? "phone" : "receipt";
      const res = await fetch(`/api/public/orders/track?${paramName}=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Order not found. Please check your receipt number or phone.");
        setOrder(null);
      } else {
        setOrder(data.order);
      }
    } catch (err) {
      setError("Failed to track order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (receiptParam || phoneParam) {
      fetchOrder(receiptParam || phoneParam);
    }
  }, [receiptParam, phoneParam]);

  // Live polling every 7 seconds if order is active (not delivered or cancelled)
  useEffect(() => {
    if (!order) return;
    if (order.fulfillment_status === "delivered" || order.fulfillment_status === "cancelled" || order.status === "voided") {
      return;
    }

    const interval = setInterval(() => {
      if (order.receipt_number) {
        fetch(`/api/public/orders/track?receipt=${encodeURIComponent(order.receipt_number)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.order) setOrder(data.order);
          })
          .catch(() => {});
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [order]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      fetchOrder(inputQuery.trim());
      router.push(`/track-order?receipt=${encodeURIComponent(inputQuery.trim())}`);
    }
  };

  const handleReorder = () => {
    if (!order) return;
    for (const item of order.items) {
      addItem({
        menu_item_id: item.menu_item_id,
        name: item.name,
        base_price_tsh: item.unit_price_tsh,
        image_url: item.image_url || null,
        variant: item.variant,
        addons: item.addons,
        instructions: item.instructions,
        quantity: item.quantity,
      });
    }
    setReordered(true);
    setTimeout(() => {
      router.push("/cart");
    }, 600);
  };

  // Steps definition
  const steps = [
    { key: "confirmed", label: "Order Received", sub: "Kitchen has confirmed your order", icon: CheckCircle2 },
    { key: "preparing", label: "Grilling & Cooking", sub: "Chef is preparing your fresh meal", icon: ChefHat },
    { key: "ready", label: "Packed & Ready", sub: "Food is boxed and sealed hot", icon: PackageCheck },
    {
      key: "out_for_delivery",
      label: order?.order_type === "delivery" ? "Out for Delivery" : "Ready for Counter Pickup",
      sub: order?.order_type === "delivery" ? "Rider is heading to your address" : "Ready for collection at counter",
      icon: Truck,
    },
    { key: "delivered", label: "Completed / Delivered", sub: "Enjoy your delicious Sumaiyyah meal!", icon: CookingPot },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "pending":
      case "confirmed":
        return 0;
      case "preparing":
        return 1;
      case "ready":
        return 2;
      case "out_for_delivery":
        return 3;
      case "delivered":
        return 4;
      case "cancelled":
        return -1;
      default:
        return 0;
    }
  };

  const currentStepIndex = order ? getStepIndex(order.fulfillment_status) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      
      {/* Header & Lookup Input */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EBF4FF] border border-blue-200 text-[#0062C3] text-xs font-bold uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5" />
          <span>Real-Time Kitchen Progress</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 font-serif tracking-tight">
          Track Your Live Order
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
          Enter your Receipt Number (e.g. <span className="text-[#0062C3] font-mono font-bold">2026-0001</span>) or Phone Number to view live prep status.
        </p>

        {/* Search input form */}
        <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto pt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="e.g. 2026-0001 or 0712345678"
              className="w-full bg-white border border-slate-200 focus:border-[#0062C3] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            {loading ? "Searching..." : "Track"}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-2xl text-center text-sm flex flex-col items-center gap-2 max-w-md mx-auto">
          <AlertCircle className="w-6 h-6 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {order && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Main Status Hero Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
            
            {/* Header info row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#0062C3]">
                    Receipt #{order.receipt_number}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                    {order.order_type}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                  {order.fulfillment_status === "delivered"
                    ? "Order Delivered & Completed!"
                    : order.fulfillment_status === "cancelled" || order.status === "voided"
                    ? "Order Cancelled / Voided"
                    : order.is_scheduled
                    ? "Scheduled Catering Confirmed"
                    : "Order is Being Prepared Fresh"}
                </h2>
                {order.is_scheduled === 1 && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-800">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Scheduled for {order.scheduled_date} ({order.delivery_window || `${order.delivery_window_start} - ${order.delivery_window_end}`})
                    </span>
                  </div>
                )}
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-500 block">Total Paid</span>
                <span className="text-xl font-bold font-mono text-[#004B93]">
                  TZS {order.total_tsh.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 uppercase block mt-0.5 font-semibold">
                  Via {order.payment_method}
                </span>
              </div>
            </div>

            {/* Visual Timeline Stepper */}
            {order.fulfillment_status !== "cancelled" && order.status !== "voided" ? (
              <div className="py-2">
                <div className="relative flex flex-col md:flex-row justify-between gap-6">
                  {steps.map((step, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const Icon = step.icon;

                    return (
                      <div key={step.key} className="flex md:flex-col items-center md:items-center text-left md:text-center gap-3.5 flex-1 relative">
                        {/* Circle node */}
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                            isCurrent
                              ? "bg-[#0062C3] text-white ring-4 ring-[#0062C3]/20 shadow-md scale-110"
                              : isCompleted
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Step text */}
                        <div className="space-y-0.5">
                          <div className={`text-xs font-bold ${isCurrent ? "text-[#0062C3] font-extrabold" : isCompleted ? "text-slate-900" : "text-slate-400"}`}>
                            {step.label}
                          </div>
                          <div className="text-[11px] text-slate-500 leading-tight">
                            {step.sub}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-xs text-center">
                This order was marked as cancelled or voided. If you have questions, please reach out to our staff.
              </div>
            )}

            {/* Quick WhatsApp Support & Reorder CTAs */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={`https://wa.me/255700000000?text=${encodeURIComponent(`Hello Sumaiyyah Fast Food! I would like to check on my order #${order.receipt_number}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors w-full sm:w-auto justify-center"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat with Kitchen on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleReorder}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors w-full sm:w-auto justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{reordered ? "Loaded into Cart!" : "Reorder These Items"}</span>
              </button>
            </div>
          </div>

          {/* Itemized Receipt Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Items Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700">
                Itemized Dishes ({order.items.length})
              </h3>
              <div className="divide-y divide-slate-100 space-y-2 text-xs">
                {order.items.map((item) => (
                  <div key={item.id} className="pt-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">
                        {item.quantity}x {item.name}
                      </div>
                      {item.variant && (
                        <div className="text-[11px] text-[#0062C3] font-medium">Portion: {item.variant}</div>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <div className="text-[11px] text-slate-500">
                          Add-ons: {item.addons.map((a) => a.name).join(", ")}
                        </div>
                      )}
                      {item.instructions && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded italic">
                          &ldquo;{item.instructions}&rdquo;
                        </div>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-900 shrink-0">
                      TZS {item.total_tsh.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Math breakdown */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900 font-semibold">TZS {order.subtotal_tsh.toLocaleString()}</span>
                </div>
                {order.discount_tsh > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span className="font-mono">- TZS {order.discount_tsh.toLocaleString()}</span>
                  </div>
                )}
                {order.delivery_fee_tsh > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Fee</span>
                    <span className="font-mono text-slate-900 font-semibold">TZS {order.delivery_fee_tsh.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Amount</span>
                  <span className="font-mono text-[#004B93] font-black">TZS {order.total_tsh.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Delivery & Customer Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs uppercase font-bold tracking-wider text-slate-700">
                Delivery & Contact Info
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Customer Name</span>
                  <span className="text-slate-900 font-semibold">{order.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Phone Contact</span>
                  <span className="text-slate-900 font-mono font-medium">{order.customer_phone}</span>
                </div>
                {order.delivery_address && (
                  <div>
                    <span className="text-slate-400 block">Delivery Address / Dining</span>
                    <span className="text-slate-800">{order.delivery_address}</span>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <span className="text-slate-400 block">Special Order Notes</span>
                    <span className="text-slate-700 italic">&ldquo;{order.notes}&rdquo;</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block">Ordered On</span>
                  <span className="text-slate-500 font-mono">
                    {new Date(order.created_at).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
