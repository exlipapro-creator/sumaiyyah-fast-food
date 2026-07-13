"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";

interface AuditEntry {
  id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

const ENTITY_TYPES = ["menu_item", "category", "user", "supplier_payment", "order"];
const ACTIONS = ["create", "update", "delete", "activate", "deactivate", "reactivate", "void"];

function formatDetails(details: string | null): string {
  if (!details) return "—";
  try {
    const obj = JSON.parse(details);
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(", ");
  } catch {
    return details;
  }
}

export default function AuditClient() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      const res = await fetch(`/api/audit-log?${params}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 25);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function applyFilters() {
    setPage(1);
  }

  const totalPages = Math.ceil(total / pageSize) || 1;
  const isEmpty = !loading && entries.length === 0;

  return (
    <div data-testid="audit-page" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Audit Log</h1>
        <p className="text-slate-400 text-sm mt-1">Who changed what, and when</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Entity</label>
            <select
              data-testid="audit-filter-entity"
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            >
              <option value="">All</option>
              {ENTITY_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Action</label>
            <select
              data-testid="audit-filter-action"
              value={action}
              onChange={e => setAction(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            >
              <option value="">All</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button
            data-testid="audit-apply"
            onClick={applyFilters}
            className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2 hover:bg-amber-400 transition-colors text-sm"
          >
            Apply
          </button>
        </div>
      </div>

      {isEmpty && (
        <EmptyState testId="audit-empty" icon="🗒️" title="No audit entries" description="Changes to menu, users, orders, and suppliers will show up here." />
      )}

      {!isEmpty && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl">
          <div data-testid="audit-table" className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Time</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">User</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Action</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Entity</th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wide text-slate-400">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading...</td></tr>
                )}
                {!loading && entries.map(entry => (
                  <tr key={entry.id} data-testid={`audit-row-${entry.id}`} className="hover:bg-slate-800/60 transition-colors">
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-100 font-medium">{entry.user_name}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-700 text-slate-300 capitalize">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {entry.entity_type.replace("_", " ")}{entry.entity_id ? ` #${entry.entity_id}` : ""}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs max-w-md truncate" title={formatDetails(entry.details)}>
                      {formatDetails(entry.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div data-testid="audit-pagination" className="flex items-center justify-between px-5 py-3 border-t border-slate-800">
              <span className="text-slate-400 text-sm">Page {page} of {totalPages} ({total} total)</span>
              <div className="flex gap-2">
                <button
                  data-testid="audit-page-prev"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  data-testid="audit-page-next"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-1.5 text-sm hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
