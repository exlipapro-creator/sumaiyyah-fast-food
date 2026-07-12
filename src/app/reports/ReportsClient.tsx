"use client";

import { useState } from "react";
import { formatTSH } from "@/lib/money";
import EmptyState from "@/components/EmptyState";

interface ReportItem {
  id: number;
  name: string;
  qty: number;
  revenue: number;
}

interface BestSeller {
  id: number;
  name: string;
  qty: number;
  revenue: number;
}

export default function ReportsClient() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [perItem, setPerItem] = useState<ReportItem[]>([]);
  const [totals, setTotals] = useState<{ totalRevenue: number; totalOrders: number; totalPlates: number } | null>(null);
  const [bestSellers, setBestSellers] = useState<{ byQty: BestSeller[]; byRevenue: BestSeller[] } | null>(null);

  async function runReport() {
    setLoading(true);
    setHasRun(true);
    try {
      const [salesRes, bsRes] = await Promise.all([
        fetch(`/api/reports/sales?from=${from}&to=${to}`),
        fetch(`/api/reports/best-sellers?from=${from}&to=${to}`),
      ]);
      const salesData = await salesRes.json();
      const bsData = await bsRes.json();
      setPerItem(salesData.perItem || []);
      setTotals(salesData.totals || null);
      setBestSellers(bsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const csvUrl = `/api/reports/sales.csv?from=${from}&to=${to}`;
  const isEmpty = hasRun && perItem.length === 0;

  return (
    <div data-testid="reports-page" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Sales Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Date-range analytics and best sellers</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">From</label>
            <input
              data-testid="report-from"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">To</label>
            <input
              data-testid="report-to"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>
          <button
            data-testid="report-run"
            onClick={runReport}
            disabled={loading}
            className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2 hover:bg-amber-400 disabled:opacity-60 transition-colors"
          >
            {loading ? "Loading..." : "Run Report"}
          </button>
          <a
            data-testid="report-export-csv"
            href={csvUrl}
            download
            className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-5 py-2 hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Totals */}
      {totals && !isEmpty && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Total Revenue</div>
            <div className="text-xl font-bold text-amber-500 tabular-nums">{formatTSH(totals.totalRevenue)}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Total Plates</div>
            <div className="text-xl font-bold text-sky-400 tabular-nums">{totals.totalPlates.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Transactions</div>
            <div className="text-xl font-bold text-sky-400 tabular-nums">{totals.totalOrders.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          testId="report-empty"
          icon="📊"
          title="No sales in this period"
          description="Try a different date range to find sales data."
        />
      )}

      {/* Per-item table */}
      {!isEmpty && hasRun && perItem.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-xl font-semibold text-slate-100">Sales by Item</h2>
          </div>
          <div data-testid="report-table" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Item</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Qty Sold</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {perItem.map(item => (
                  <tr
                    key={item.id}
                    data-testid={`report-row-${item.id}`}
                    className="hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-100 font-medium">{item.name}</td>
                    <td className="px-5 py-3 text-right text-slate-300 tabular-nums">{item.qty.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-amber-500 tabular-nums">{formatTSH(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Best sellers */}
      {bestSellers && !isEmpty && (bestSellers.byQty.length > 0 || bestSellers.byRevenue.length > 0) && (
        <div data-testid="best-sellers" className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Best Sellers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-semibold text-slate-300 mb-3">By Quantity</h3>
              <div className="space-y-2">
                {bestSellers.byQty.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-amber-500 font-bold text-sm w-5 tabular-nums">{i + 1}</span>
                    <span className="flex-1 text-slate-200 text-sm truncate">{item.name}</span>
                    <span className="text-slate-400 text-sm tabular-nums">{item.qty} plates</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-300 mb-3">By Revenue</h3>
              <div className="space-y-2">
                {bestSellers.byRevenue.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-emerald-500 font-bold text-sm w-5 tabular-nums">{i + 1}</span>
                    <span className="flex-1 text-slate-200 text-sm truncate">{item.name}</span>
                    <span className="text-amber-500 text-sm tabular-nums">{formatTSH(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
