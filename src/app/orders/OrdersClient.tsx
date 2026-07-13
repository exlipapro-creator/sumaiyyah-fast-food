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
}

interface OrderItem {
  id: number;
  name_snapshot: string;
  quantity: number;
  unit_price_tsh: number;
  line_total_tsh: number;
}

export default function OrdersClient({ isManager }: { isManager: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"" | "completed" | "voided">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

  async function openDetail(order: Order) {
    setDetailOrder(order);
    setDetailItems([]);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      const data = await res.json();
      setDetailItems(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
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
        <h1 className="text-3xl font-bold text-slate-50">Orders</h1>
        <p className="text-slate-400 text-sm mt-1">
          {isManager ? "All orders" : "Your orders"} — most recent first
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
        <EmptyState testId="orders-empty" icon="🧾" title="No orders found" description="Try a different date range or status filter." />
      )}

      {!isEmpty && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div data-testid="orders-table" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Receipt</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Date</th>
                  {isManager && <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Cashier</th>}
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Payment</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Total</th>
                  <th className="text-center px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Status</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
                )}
                {!loading && orders.map(order => (
                  <tr key={order.id} data-testid={`order-row-${order.id}`} className="hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3 text-slate-100 font-medium font-mono">{order.receipt_no}</td>
                    <td className="px-5 py-3 text-slate-400">{new Date(order.created_at).toLocaleString()}</td>
                    {isManager && <td className="px-5 py-3 text-slate-400">{order.cashier_name}</td>}
                    <td className="px-5 py-3 text-slate-400 capitalize">{order.payment_method}</td>
                    <td className="px-5 py-3 text-right text-amber-500 tabular-nums">{formatTSH(order.total_tsh)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        order.status === "voided" ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {order.status === "voided" ? "Voided" : "Completed"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          data-testid={`order-view-${order.id}`}
                          onClick={() => openDetail(order)}
                          className="text-slate-400 hover:text-amber-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        >
                          View
                        </button>
                        {isManager && order.status === "completed" && (
                          <button
                            data-testid={`order-void-${order.id}`}
                            onClick={() => openVoid(order)}
                            className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
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
                <div data-testid="order-detail-items" className="space-y-2">
                  {detailItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{item.name_snapshot} × {item.quantity}</span>
                      <span className="tabular-nums text-slate-200">{formatTSH(item.line_total_tsh)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 pt-3 border-t border-slate-800 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatTSH(detailOrder.subtotal_tsh)}</span>
                  </div>
                  {detailOrder.discount_amount_tsh > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount</span>
                      <span className="tabular-nums">-{formatTSH(detailOrder.discount_amount_tsh)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-50 pt-1">
                    <span>Total</span>
                    <span className="tabular-nums text-amber-500">{formatTSH(detailOrder.total_tsh)}</span>
                  </div>
                </div>
                {detailOrder.status === "voided" && (
                  <div className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    Voided — {detailOrder.void_reason}
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Void modal */}
      {voidOrder && (
        <Modal title={`Void Receipt ${voidOrder.receipt_no}`} onClose={() => setVoidOrder(null)}>
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              This marks the order as voided and removes it from sales totals. Any tracked stock
              consumed by this order will be restored. This cannot be undone.
            </p>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Reason</label>
              <textarea
                data-testid="void-reason"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                rows={2}
                placeholder="e.g. Customer changed order after payment"
                autoFocus
              />
            </div>
            {voidError && (
              <div data-testid="void-error" className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {voidError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setVoidOrder(null)}
                className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-2 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="void-confirm"
                onClick={confirmVoid}
                disabled={voidLoading}
                className="flex-1 bg-rose-500 text-slate-950 font-semibold rounded-lg py-2 hover:bg-rose-400 disabled:opacity-60 transition-colors"
              >
                {voidLoading ? "Voiding..." : "Void Order"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
