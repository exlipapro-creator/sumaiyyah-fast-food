"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { formatTSH } from "@/lib/money";

interface Order {
  id: number;
  receipt_no: string;
  cashier_name: string;
  subtotal_tsh: number;
  discount_amount_tsh: number;
  total_tsh: number;
  payment_method: string;
  status: "completed" | "voided";
  void_reason: string | null;
  created_at: string;
  order_type?: "pos" | "delivery" | "pickup" | "dine_in";
  order_channel?: string;
  is_scheduled?: number;
  scheduled_date?: string;
  delivery_window_start?: string;
  delivery_window_end?: string;
  target_dispatch_at?: string;
  company_name?: string;
  attendee_count?: number;
  service_context?: string;
  delivery_window?: string;
  building_name?: string;
  floor_office?: string;
  po_reference_number?: string;
  billing_status?: string;
  invoice_number?: string;
  invoice_status?: string;
  fulfillment_status?: "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  notes?: string | null;
}

interface OrderItem {
  id: number;
  name_snapshot: string;
  quantity: number;
  unit_price_tsh: number;
  line_total_tsh: number;
  selected_variant?: string | null;
  selected_addons_json?: string | null;
  special_instructions?: string | null;
}

export default function OrdersClient({ isManager }: { isManager: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"" | "completed" | "voided">("");
  const [channelFilter, setChannelFilter] = useState<"all" | "corporate" | "delivery" | "pos">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [voidOrder, setVoidOrder] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status, from, to]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter(o => {
    if (channelFilter === "corporate") {
      return o.order_channel === "corporate" || o.is_scheduled === 1;
    }
    if (channelFilter === "delivery") {
      return o.order_type === "delivery" && o.order_channel !== "corporate";
    }
    if (channelFilter === "pos") {
      return o.order_type === "pos" || (!o.order_type && !o.order_channel);
    }
    return true;
  });

  async function openDetail(order: Order) {
    setDetailOrder(order);
    setDetailItems([]);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      const data = await res.json();
      setDetailItems(data.items || []);
      if (data.order) {
        setDetailOrder(data.order);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpdateFulfillmentStatus(newStatus: string) {
    if (!detailOrder) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${detailOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", fulfillment_status: newStatus }),
      });
      if (res.ok) {
        const updated = { ...detailOrder, fulfillment_status: newStatus as any };
        setDetailOrder(updated);
        setOrders(prev => prev.map(o => o.id === detailOrder.id ? { ...o, fulfillment_status: newStatus as any } : o));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setUpdatingStatus(false);
    }
  }

  function openVoid(order: Order) {
    setVoidOrder(order);
    setVoidReason("");
    setVoidError("");
  }

  async function confirmVoid() {
    if (!voidOrder) return;
    if (voidReason.trim().length < 3) {
      setVoidError("Please give a reason (at least 3 characters)");
      return;
    }
    setVoidLoading(true);
    setVoidError("");
    try {
      const res = await fetch(`/api/orders/${voidOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "void", reason: voidReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setVoidError(data.error || "Failed to void order"); return; }
      setOrders(prev => prev.map(o => o.id === voidOrder.id ? { ...o, status: "voided", void_reason: voidReason.trim() } : o));
      setVoidOrder(null);
    } catch {
      setVoidError("Network error");
    } finally {
      setVoidLoading(false);
    }
  }

  const isEmpty = !loading && orders.length === 0;

  return (
    <div data-testid="orders-page" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Orders Management</h1>
        <p className="text-slate-400 text-sm mt-1">
          {isManager ? "All POS and customer online orders" : "Your orders"} — most recent first
        </p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">From</label>
            <input
              data-testid="orders-from"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">To</label>
            <input
              data-testid="orders-to"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Status</label>
            <select
              data-testid="orders-status"
              value={status}
              onChange={e => setStatus(e.target.value as typeof status)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="voided">Voided</option>
            </select>
          </div>
          <button
            data-testid="orders-apply"
            onClick={fetchOrders}
            className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2 hover:bg-amber-400 transition-colors text-sm"
          >
            Apply
          </button>
        </div>
      </div>

      {isEmpty && (
        <EmptyState
          testId="orders-empty"
          icon={
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          title="No orders found"
          description="Try a different date range or status filter."
        />
      )}

      {!isEmpty && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div data-testid="orders-table" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Receipt</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Type</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Date</th>
                  {isManager && <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Cashier / Customer</th>}
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Payment</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Total</th>
                  <th className="text-center px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Status</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
                )}
                {!loading && orders.map(order => (
                  <tr key={order.id} data-testid={`order-row-${order.id}`} className="hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3 text-slate-100 font-medium font-mono">{order.receipt_no}</td>
                    <td className="px-5 py-3 text-slate-400 uppercase text-xs font-mono">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-400">
                        {order.order_type || "POS"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{new Date(order.created_at).toLocaleString()}</td>
                    {isManager && (
                      <td className="px-5 py-3 text-slate-300">
                        {order.customer_name ? (
                          <div>
                            <span className="font-semibold text-slate-100">{order.customer_name}</span>
                            {order.customer_phone && <span className="block text-xs text-slate-500 font-mono">{order.customer_phone}</span>}
                          </div>
                        ) : (
                          order.cashier_name
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3 text-slate-400 capitalize">{order.payment_method}</td>
                    <td className="px-5 py-3 text-right text-amber-500 tabular-nums font-mono font-semibold">{formatTSH(order.total_tsh)}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          order.status === "voided" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {order.status === "voided" ? "Voided" : "Completed"}
                        </span>
                        {order.fulfillment_status && (
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {order.fulfillment_status.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          data-testid={`order-view-${order.id}`}
                          onClick={() => openDetail(order)}
                          className="text-slate-400 hover:text-amber-400 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors font-medium"
                        >
                          View
                        </button>
                        {isManager && order.status === "completed" && (
                          <button
                            data-testid={`order-void-${order.id}`}
                            onClick={() => openVoid(order)}
                            className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded hover:bg-rose-900/30 transition-colors"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailOrder && (
        <Modal title={`Receipt ${detailOrder.receipt_no}`} onClose={() => setDetailOrder(null)}>
          <div className="space-y-4">
            {detailLoading ? (
              <div className="text-slate-400 text-sm">Loading...</div>
            ) : (
              <>
                {/* Kitchen / Fulfillment status control */}
                {detailOrder.status !== "voided" && (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-bold text-slate-300 tracking-wider">
                        Kitchen & Delivery Fulfillment Status:
                      </span>
                      {updatingStatus && <span className="text-xs text-amber-400 animate-pulse">Updating...</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "pending", label: "Pending" },
                        { id: "confirmed", label: "Confirmed" },
                        { id: "preparing", label: "Preparing" },
                        { id: "ready", label: "Ready" },
                        { id: "out_for_delivery", label: "Out for Delivery" },
                        { id: "delivered", label: "Delivered" },
                      ].map(st => {
                        const isCurrent = (detailOrder.fulfillment_status || "confirmed") === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => handleUpdateFulfillmentStatus(st.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              isCurrent
                                ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                                : "bg-slate-900 text-slate-300 hover:bg-slate-700 border border-slate-700"
                            }`}
                          >
                            {st.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer Details if delivery/pickup */}
                {(detailOrder.customer_name || detailOrder.delivery_address || detailOrder.notes) && (
                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
                    <div className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">Customer Delivery Details:</div>
                    {detailOrder.customer_name && <div><span className="text-slate-400">Name:</span> {detailOrder.customer_name}</div>}
                    {detailOrder.customer_phone && <div><span className="text-slate-400">Phone:</span> {detailOrder.customer_phone}</div>}
                    {detailOrder.delivery_address && <div><span className="text-slate-400">Address:</span> {detailOrder.delivery_address}</div>}
                    {detailOrder.notes && <div><span className="text-slate-400">Notes:</span> &ldquo;{detailOrder.notes}&rdquo;</div>}
                  </div>
                )}

                {/* Items list */}
                <div className="space-y-2">
                  <h4 className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Items</h4>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                    {detailItems.map(item => {
                      let addons: { name: string; price: number }[] = [];
                      try {
                        if (item.selected_addons_json) addons = JSON.parse(item.selected_addons_json);
                      } catch {}

                      return (
                        <div key={item.id} className="p-3 bg-slate-900/60 flex items-center justify-between text-sm">
                          <div>
                            <span className="text-slate-100 font-medium">{item.name_snapshot}</span>
                            <span className="text-slate-500 text-xs ml-2">× {item.quantity}</span>
                            {item.selected_variant && (
                              <div className="text-xs text-amber-400">Portion: {item.selected_variant}</div>
                            )}
                            {addons.length > 0 && (
                              <div className="text-xs text-slate-400">Add-ons: {addons.map(a => a.name).join(", ")}</div>
                            )}
                            {item.special_instructions && (
                              <div className="text-xs text-slate-400 italic">&ldquo;{item.special_instructions}&rdquo;</div>
                            )}
                          </div>
                          <span className="text-slate-300 font-mono">{formatTSH(item.line_total_tsh)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatTSH(detailOrder.subtotal_tsh)}</span>
                  </div>
                  {detailOrder.discount_amount_tsh > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span className="font-mono">-{formatTSH(detailOrder.discount_amount_tsh)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-100 pt-2 border-t border-slate-800">
                    <span>Total</span>
                    <span className="font-mono text-amber-400">{formatTSH(detailOrder.total_tsh)}</span>
                  </div>
                  <div className="text-xs text-slate-500 pt-2 space-y-1">
                    <div>Payment: <span className="text-slate-300 capitalize">{detailOrder.payment_method}</span></div>
                    <div>Status: <span className="text-slate-300 capitalize">{detailOrder.status}</span></div>
                    {detailOrder.void_reason && (
                      <div className="text-rose-400">Void reason: {detailOrder.void_reason}</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Void modal */}
      {voidOrder && (
        <Modal title={`Void Order ${voidOrder.receipt_no}`} onClose={() => setVoidOrder(null)}>
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Voiding this order will mark it as voided and restore tracked stock. This action cannot be undone.
            </p>
            {voidError && (
              <div className="bg-rose-500/20 border border-rose-500/40 text-rose-400 p-3 rounded-lg text-sm">
                {voidError}
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-300 mb-1">Reason for voiding *</label>
              <textarea
                data-testid="void-reason-input"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="e.g., Customer changed mind, incorrect item scanned..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm resize-none"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVoidOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="void-confirm-btn"
                type="button"
                onClick={confirmVoid}
                disabled={voidLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {voidLoading ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
