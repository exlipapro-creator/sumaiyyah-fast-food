"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Flame,
  Moon,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Sparkles,
  Sliders,
  Calendar,
  Globe,
  Radio,
  Check,
  X,
  Eye,
} from "lucide-react";
import TopKitchenTicker from "@/components/customer/TopKitchenTicker";

interface TickerAnnouncement {
  id: string;
  text: string;
  highlight: string;
  is_active: boolean;
  priority: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

interface StoreSettingsData {
  id: number;
  is_manual_override: boolean;
  manual_status: "OPEN" | "CLOSED";
  opening_time: string;
  closing_time: string;
  timezone: string;
  default_fallback_text: string;
  updated_at: string;
}

interface TickerResponse {
  settings: StoreSettingsData;
  announcements: TickerAnnouncement[];
  computed: {
    is_open: boolean;
    status_label: "LIVE" | "CLOSED";
    default_fallback_text: string;
    opening_time: string;
    closing_time: string;
    timezone: string;
    is_manual_override: boolean;
    manual_status: "OPEN" | "CLOSED";
    current_local_time: string;
    announcements: any[];
  };
}

export default function StoreHoursAndTickerManager() {
  const [data, setData] = useState<TickerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Settings form state
  const [mode, setMode] = useState<"auto" | "force_open" | "force_closed">("auto");
  const [openingTime, setOpeningTime] = useState("08:00:00");
  const [closingTime, setClosingTime] = useState("23:00:00");
  const [timezone, setTimezone] = useState("Africa/Dar_es_Salaam");
  const [fallbackText, setFallbackText] = useState("");

  // Announcement Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<TickerAnnouncement | null>(null);
  const [annForm, setAnnForm] = useState({
    text: "",
    highlight: "",
    priority: 1,
    is_active: true,
    start_time: "",
    end_time: "",
  });

  const flashMessage = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const fetchTickerData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/ticker");
      if (!res.ok) throw new Error("Failed to load store hours and ticker data");
      const json: TickerResponse = await res.json();
      setData(json);

      if (json.settings) {
        if (!json.settings.is_manual_override) {
          setMode("auto");
        } else {
          setMode(json.settings.manual_status === "OPEN" ? "force_open" : "force_closed");
        }
        setOpeningTime(json.settings.opening_time || "08:00:00");
        setClosingTime(json.settings.closing_time || "23:00:00");
        setTimezone(json.settings.timezone || "Africa/Dar_es_Salaam");
        setFallbackText(json.settings.default_fallback_text || "");
      }
    } catch (err: any) {
      setError(err.message || "Network error loading ticker settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickerData();
  }, [fetchTickerData]);

  // Save Store Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const is_manual_override = mode !== "auto";
      const manual_status = mode === "force_closed" ? "CLOSED" : "OPEN";

      const res = await fetch("/api/marketing/ticker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_manual_override,
          manual_status,
          opening_time: openingTime,
          closing_time: closingTime,
          timezone,
          default_fallback_text: fallbackText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update store settings");
      }

      flashMessage("Store operating hours and status settings saved successfully!");
      fetchTickerData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Open modal for new announcement
  const handleOpenNewModal = () => {
    setEditingAnn(null);
    setAnnForm({
      text: "",
      highlight: "",
      priority: (data?.announcements?.length || 0) + 1,
      is_active: true,
      start_time: "",
      end_time: "",
    });
    setModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (ann: TickerAnnouncement) => {
    setEditingAnn(ann);
    setAnnForm({
      text: ann.text,
      highlight: ann.highlight || "",
      priority: ann.priority,
      is_active: ann.is_active,
      start_time: ann.start_time ? ann.start_time.replace(" ", "T").slice(0, 16) : "",
      end_time: ann.end_time ? ann.end_time.replace(" ", "T").slice(0, 16) : "",
    });
    setModalOpen(true);
  };

  // Save Announcement (Create or Update)
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        id: editingAnn?.id,
        text: annForm.text,
        highlight: annForm.highlight,
        priority: Number(annForm.priority) || 1,
        is_active: annForm.is_active,
        start_time: annForm.start_time ? new Date(annForm.start_time).toISOString() : null,
        end_time: annForm.end_time ? new Date(annForm.end_time).toISOString() : null,
      };

      const res = await fetch("/api/marketing/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save announcement");
      }

      flashMessage(editingAnn ? "Announcement updated." : "New announcement created.");
      setModalOpen(false);
      fetchTickerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Quick toggle active state
  const handleToggleActive = async (ann: TickerAnnouncement) => {
    try {
      const res = await fetch("/api/marketing/ticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ann.id,
          text: ann.text,
          highlight: ann.highlight,
          priority: ann.priority,
          is_active: !ann.is_active,
          start_time: ann.start_time,
          end_time: ann.end_time,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle announcement status");
      flashMessage(`Announcement ${!ann.is_active ? "activated" : "deactivated"}.`);
      fetchTickerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/marketing/ticker?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      flashMessage("Announcement deleted.");
      fetchTickerData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-[#0062C3]" />
        <span>Loading store hours & ticker configuration...</span>
      </div>
    );
  }

  const computed = data?.computed;
  const isOpen = computed?.is_open;

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── LIVE HEADER TICKER PREVIEW ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Eye className="w-4 h-4 text-[#0062C3]" />
            <span>Live Header Ticker Preview (Client Realtime Display)</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Speed: Medium-Slow (58s) • Pause on Hover
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-700 shadow-md">
          <TopKitchenTicker />
        </div>
      </div>

      {/* ─── SECTION 1: STORE OPERATING HOURS & OVERRIDE ────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white">Store Operating Status & Postgres RPC Control</span>
              {isOpen ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE & LIVE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black">
                  <Moon className="w-3 h-3" />
                  CLOSED (SCHEDULED)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Computed natively via PostgreSQL function <code className="text-sky-300">get_header_ticker_data()</code> with timezone <code className="text-amber-200">{timezone}</code>.
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
            <div className="text-[11px] text-slate-400">Current Local Time:</div>
            <div className="text-sm font-mono font-bold text-amber-300">
              {computed?.current_local_time || "12:00:00"} (EAT)
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Operating Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">Operating Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode("auto")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === "auto"
                    ? "bg-[#0062C3]/15 border-[#0062C3] text-white shadow-xs"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>Automatic (Scheduled)</span>
                  {mode === "auto" && <Check className="w-4 h-4 text-[#0062C3]" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Follows daily opening and closing hours in Dar es Salaam timezone.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("force_open")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === "force_open"
                    ? "bg-emerald-500/15 border-emerald-500 text-white shadow-xs"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>Force OPEN (Manual)</span>
                  {mode === "force_open" && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Overrides schedule to keep kitchen banner marked LIVE 24/7.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("force_closed")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === "force_closed"
                    ? "bg-rose-500/15 border-rose-500 text-white shadow-xs"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs text-white mb-1">
                  <span>Force CLOSED (Manual)</span>
                  {mode === "force_closed" && <Check className="w-4 h-4 text-rose-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Emergency override for staff meetings, maintenance, or stock inventory.
                </p>
              </button>
            </div>
          </div>

          {/* Time and Timezone Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Daily Opening Time</span>
              </label>
              <input
                type="text"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                placeholder="08:00:00"
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Format: HH:MM:SS (24-hour)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Daily Closing Time</span>
              </label>
              <input
                type="text"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                placeholder="23:00:00"
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Supports overnight schedules (e.g. 20:00 to 04:00)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Timezone</span>
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">Default: Africa/Dar_es_Salaam (UTC+3)</span>
            </div>
          </div>

          {/* Default Fallback Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              Default Fallback Ticker Text (When no announcements are active)
            </label>
            <input
              type="text"
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder="Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam"
              className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl bg-[#0062C3] hover:bg-[#004B93] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save Operating Hours & Status</span>
            </button>
          </div>
        </form>
      </div>

      {/* ─── SECTION 2: TICKER ANNOUNCEMENTS CRUD ───────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Header Ticker Announcements</h3>
            <p className="text-xs text-slate-400">
              Manage items gliding across the top bar. Ordered by priority ascending.
            </p>
          </div>

          <button
            onClick={handleOpenNewModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Announcement</span>
          </button>
        </div>

        {/* Announcements List / Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-2">Priority</th>
                <th className="py-3 px-3">Announcement Text</th>
                <th className="py-3 px-2">Badge / Tag</th>
                <th className="py-3 px-2">Schedule</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.announcements && data.announcements.length > 0 ? (
                data.announcements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-amber-400">
                      #{ann.priority}
                    </td>
                    <td className="py-3 px-3 max-w-xs font-medium text-slate-200">
                      {ann.text}
                    </td>
                    <td className="py-3 px-2">
                      {ann.highlight ? (
                        <span className="px-2 py-0.5 rounded bg-white/10 text-amber-200 text-[10px] font-bold">
                          {ann.highlight}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-slate-400 text-[11px]">
                      {ann.start_time || ann.end_time ? (
                        <span>
                          {ann.start_time ? new Date(ann.start_time).toLocaleDateString() : "Always"} &rarr;{" "}
                          {ann.end_time ? new Date(ann.end_time).toLocaleDateString() : "Indefinite"}
                        </span>
                      ) : (
                        <span className="text-slate-400">Always active</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => handleToggleActive(ann)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          ann.is_active
                            ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                        }`}
                      >
                        {ann.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(ann)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit announcement"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                    No custom announcements configured. Ticker is displaying fallback text.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: ADD / EDIT ANNOUNCEMENT ──────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{editingAnn ? "Edit Announcement" : "New Ticker Announcement"}</span>
              </h4>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Announcement Message / Text <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={annForm.text}
                  onChange={(e) => setAnnForm({ ...annForm, text: e.target.value })}
                  placeholder="e.g. Express Bike Delivery: Kariakoo, Posta, Upanga & Ilala"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Highlight Tag (Optional)</label>
                  <input
                    type="text"
                    value={annForm.highlight}
                    onChange={(e) => setAnnForm({ ...annForm, highlight: e.target.value })}
                    placeholder="e.g. 10-25 Mins or Moto & Safi"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Priority (1 = First)</label>
                  <input
                    type="number"
                    min={1}
                    value={annForm.priority}
                    onChange={(e) => setAnnForm({ ...annForm, priority: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Start Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={annForm.start_time}
                    onChange={(e) => setAnnForm({ ...annForm, start_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">End Time (Optional)</label>
                  <input
                    type="datetime-local"
                    value={annForm.end_time}
                    onChange={(e) => setAnnForm({ ...annForm, end_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ann-active"
                  checked={annForm.is_active}
                  onChange={(e) => setAnnForm({ ...annForm, is_active: e.target.checked })}
                  className="rounded border-slate-700 text-[#0062C3] focus:ring-0"
                />
                <label htmlFor="ann-active" className="text-xs text-slate-300 font-medium">
                  Active immediately on header ticker
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0062C3] hover:bg-[#004B93] text-white text-xs font-bold shadow-md"
                >
                  {editingAnn ? "Update Announcement" : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
