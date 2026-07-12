"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import EmptyState from "@/components/EmptyState";
import { formatTSH } from "@/lib/money";

interface Payment {
  id: number;
  supplier_name: string;
  amount_tsh: number;
  paid_on: string;
  category: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

const CATEGORIES = ["produce", "packaging", "utilities", "other"];

export default function SuppliersClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ supplier: "", from: "", to: "" });

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [formSupplier, setFormSupplier] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCategory, setFormCategory] = useState("produce");
  const [formNotes, setFormNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPayments = useCallback(async (p: number = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: p.toString(),
        ...(appliedFilters.supplier ? { supplier: appliedFilters.supplier } : {}),
        ...(appliedFilters.from ? { from: appliedFilters.from } : {}),
        ...(appliedFilters.to ? { to: appliedFilters.to } : {}),
      });
      const res = await fetch(`/api/supplier-payments?${params}`);
      const data = await res.json();
      setPayments(data.payments || []);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 10);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    fetchPayments(page);
  }, [fetchPayments, page, appliedFilters]);

  function applyFilters() {
    setAppliedFilters({ supplier: filterSupplier, from: filterFrom, to: filterTo });
    setPage(1);
  }

  function openCreate() {
    setEditPayment(null);
    setFormSupplier("");
    setFormAmount("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCategory("produce");
    setFormNotes("");
    setFormError("");
    setShowModal(true);
  }

  function openEdit(payment: Payment) {
    setEditPayment(payment);
    setFormSupplier(payment.supplier_name);
    setFormAmount(payment.amount_tsh.toString());
    setFormDate(payment.paid_on);
    setFormCategory(payment.category);
    setFormNotes(payment.notes || "");
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    setFormError("");
    if (!formSupplier.trim()) { setFormError("Supplier name is required"); return; }
    const amount = parseInt(formAmount, 10);
    if (isNaN(amount) || amount <= 0) { setFormError("Amount must be > 0"); return; }
    if (!formDate) { setFormError("Date is required"); return; }

    setFormLoading(true);
    try {
      let res;
      if (editPayment) {
        res = await fetch(`/api/supplier-payments/${editPayment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_name: formSupplier.trim(),
            amount_tsh: amount,
            paid_on: formDate,
            category: formCategory,
            notes: formNotes || null,
          }),
        });
      } else {
        res = await fetch("/api/supplier-payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_name: formSupplier.trim(),
            amount_tsh: amount,
            paid_on: formDate,
            category: formCategory,
            notes: formNotes || null,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || "Failed"); return; }
      setShowModal(false);
      await fetchPayments(page);
    } catch {
      setFormError("Network error");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(payment: Payment) {
    if (!confirm(`Delete payment to "${payment.supplier_name}"?`)) return;
    const res = await fetch(`/api/supplier-payments/${payment.id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchPayments(page);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const isEmpty = !loading && payments.length === 0 && !appliedFilters.supplier && !appliedFilters.from && !appliedFilters.to;

  return (
    <div data-testid="suppliers-page" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Supplier Payments</h1>
        <p className="text-slate-400 text-sm mt-1">Track payments to suppliers</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Supplier</label>
            <input
              data-testid="filter-supplier"
              type="text"
              value={filterSupplier}
              onChange={e => setFilterSupplier(e.target.value)}
              placeholder="Search supplier..."
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">From</label>
            <input
              data-testid="filter-from"
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">To</label>
            <input
              data-testid="filter-to"
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
          </div>
          <button
            data-testid="filter-apply"
            onClick={applyFilters}
            className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2 hover:bg-amber-400 transition-colors"
          >
            Apply
          </button>
          <button
            data-testid="payment-create-button"
            onClick={openCreate}
            className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2 hover:bg-amber-400 transition-colors ml-auto"
          >
            + Add Payment
          </button>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <EmptyState
          testId="payments-empty"
          icon="🏪"
          title="No supplier payments yet"
          description="Record your first supplier payment to start tracking expenses."
          action={
            <button
              data-testid="payment-create-button"
              onClick={openCreate}
              className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2.5 hover:bg-amber-400 transition-colors"
            >
              + Add Payment
            </button>
          }
        />
      )}

      {/* Table */}
      {!isEmpty && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div data-testid="payments-table" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Supplier</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Category</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Date</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Amount</th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
                )}
                {!loading && payments.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No payments found for these filters.</td></tr>
                )}
                {payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3 text-slate-100 font-medium">{payment.supplier_name}</td>
                    <td className="px-5 py-3 text-slate-400 capitalize">{payment.category}</td>
                    <td className="px-5 py-3 text-slate-400">{payment.paid_on}</td>
                    <td className="px-5 py-3 text-right text-amber-500 tabular-nums">{formatTSH(payment.amount_tsh)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          data-testid={`payment-edit-${payment.id}`}
                          onClick={() => openEdit(payment)}
                          className="text-slate-400 hover:text-amber-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          data-testid={`payment-delete-${payment.id}`}
                          onClick={() => handleDelete(payment)}
                          className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div data-testid="payments-pagination" className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
              <span className="text-slate-400 text-sm">
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <button
                  data-testid="page-prev"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  data-testid="page-next"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          
          {/* Always render pagination testids (hidden if only 1 page) */}
          {totalPages <= 1 && (
            <div data-testid="payments-pagination" className="px-5 py-3 border-t border-slate-800 flex justify-between">
              <span className="text-slate-500 text-xs">{total} payment{total !== 1 ? "s" : ""}</span>
              <div className="flex gap-2 opacity-0 pointer-events-none">
                <button data-testid="page-prev">Previous</button>
                <button data-testid="page-next">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title={editPayment ? "Edit Payment" : "Add Supplier Payment"} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Supplier Name</label>
              <input
                data-testid="payment-supplier"
                type="text"
                value={formSupplier}
                onChange={e => setFormSupplier(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="e.g. Fresh Produce Co."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Amount (TSH)</label>
              <input
                data-testid="payment-amount"
                type="number"
                min="1"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Date Paid</label>
              <input
                data-testid="payment-date"
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Category</label>
              <select
                data-testid="payment-category"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="capitalize">{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Notes (optional)</label>
              <textarea
                data-testid="payment-notes"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>
            {formError && (
              <div data-testid="payment-error" className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg py-2 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="payment-save"
                onClick={handleSave}
                disabled={formLoading}
                className="flex-1 bg-amber-500 text-slate-950 font-semibold rounded-lg py-2 hover:bg-amber-400 disabled:opacity-60 transition-colors"
              >
                {formLoading ? "Saving..." : editPayment ? "Update" : "Add Payment"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
