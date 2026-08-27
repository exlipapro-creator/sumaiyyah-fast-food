"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  Percent,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointerClick,
  TrendingUp,
  DollarSign,
  Globe,
  Sliders,
  ExternalLink,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Check,
} from "lucide-react";

interface Promotion {
  id: number;
  code: string;
  title: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order_tsh: number;
  badge: string | null;
  active: number;
  created_at: string;
}

interface AdPlacement {
  id: number;
  slot_key: string;
  name: string;
  dimensions: string;
  location_description: string | null;
  daily_price_tsh: number;
  weekly_price_tsh: number;
  monthly_price_tsh: number;
  is_active: number;
}

interface AdCampaign {
  id: number;
  placement_key: string;
  placement_name: string;
  placement_dimensions: string;
  sponsor_name: string;
  sponsor_email: string;
  sponsor_phone: string;
  banner_image_url: string;
  destination_url: string;
  alt_text: string;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "REJECTED" | "EXPIRED";
  start_date: string;
  end_date: string;
  amount_paid_tsh: number;
  payment_status: "UNPAID" | "PAID" | "REFUNDED";
  payment_reference: string | null;
  impressions_count: number;
  clicks_count: number;
  notes: string | null;
  created_at: string;
}

interface MarketingData {
  settings: {
    promotions_enabled: boolean;
    adsense_enabled: boolean;
    adsense_client_id: string;
    adsense_slot_top: string;
    adsense_slot_infeed: string;
    adsense_slot_sidebar: string;
    direct_ads_enabled: boolean;
  };
  promotions: Promotion[];
  placements: AdPlacement[];
  campaigns: AdCampaign[];
  stats: {
    total_impressions: number;
    total_clicks: number;
    avg_ctr: string;
    total_direct_revenue_tsh: number;
    active_promos_count: number;
    active_campaigns_count: number;
    pending_campaigns_count: number;
  };
}

export default function MarketingClient() {
  const [activeTab, setActiveTab] = useState<"promotions" | "adsense" | "placements" | "campaigns">("promotions");
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Promo modal state
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: "",
    title: "",
    description: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: 10,
    min_order_tsh: 0,
    badge: "",
    active: true,
  });

  // AdSense Form state
  const [adsenseForm, setAdsenseForm] = useState({
    adsense_enabled: false,
    adsense_client_id: "",
    adsense_slot_top: "",
    adsense_slot_infeed: "",
    adsense_slot_sidebar: "",
    direct_ads_enabled: true,
  });

  // Placement edit modal
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);
  const [placementForm, setPlacementForm] = useState({
    daily_price_tsh: 15000,
    weekly_price_tsh: 85000,
    monthly_price_tsh: 300000,
    is_active: true,
  });

  // Campaign create/edit modal
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    placement_key: "home_hero_top",
    sponsor_name: "",
    sponsor_email: "",
    sponsor_phone: "",
    banner_image_url: "",
    destination_url: "",
    alt_text: "",
    status: "ACTIVE",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    amount_paid_tsh: 120000,
    payment_status: "PAID",
    payment_reference: "MANUAL-DIRECT",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing");
      if (!res.ok) throw new Error("Failed to load marketing settings");
      const json: MarketingData = await res.json();
      setData(json);
      setAdsenseForm({
        adsense_enabled: json.settings.adsense_enabled,
        adsense_client_id: json.settings.adsense_client_id,
        adsense_slot_top: json.settings.adsense_slot_top,
        adsense_slot_infeed: json.settings.adsense_slot_infeed,
        adsense_slot_sidebar: json.settings.adsense_slot_sidebar,
        direct_ads_enabled: json.settings.direct_ads_enabled,
      });
    } catch (err: any) {
      setError(err.message || "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const flashMessage = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Toggle promotions master switch
  const handleTogglePromotions = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/marketing/promotions-toggle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle promotions");
      flashMessage(`Promotions ${enabled ? "activated" : "disabled"} globally.`);
      fetchData();
    } catch (e: any) {
      alert(e.message || "Failed to update promotions toggle");
    }
  };

  // Save/Create Promotion
  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPromo) {
        const res = await fetch(`/api/marketing/promotions/${editingPromo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promoForm),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update promotion");
        }
        flashMessage(`Promotion ${promoForm.code} updated.`);
      } else {
        const res = await fetch("/api/marketing/promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promoForm),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to create promotion");
        }
        flashMessage(`Promotion ${promoForm.code} created.`);
      }
      setPromoModalOpen(false);
      setEditingPromo(null);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Quick toggle promo active state
  const handleTogglePromoActive = async (promo: Promotion) => {
    try {
      const res = await fetch(`/api/marketing/promotions/${promo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: promo.active === 1 ? false : true }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      flashMessage(`Promotion ${promo.code} status updated.`);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Delete Promo
  const handleDeletePromo = async (id: number, code: string) => {
    if (!confirm(`Are you sure you want to delete promo code ${code}?`)) return;
    try {
      const res = await fetch(`/api/marketing/promotions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      flashMessage(`Promotion ${code} deleted.`);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Save AdSense Settings
  const handleSaveAdSense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/marketing/adsense", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsenseForm),
      });
      if (!res.ok) throw new Error("Failed to save AdSense settings");
      flashMessage("AdSense & Direct Ads settings updated successfully.");
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Save Placement Pricing
  const handleSavePlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlacement) return;
    try {
      const res = await fetch(`/api/marketing/placements/${editingPlacement.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(placementForm),
      });
      if (!res.ok) throw new Error("Failed to update placement");
      flashMessage(`Rates updated for ${editingPlacement.name}`);
      setPlacementModalOpen(false);
      setEditingPlacement(null);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Quick Campaign Actions (Approve, Reject, Pause, Mark Paid)
  const handleCampaignAction = async (id: number, quick_action: string) => {
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quick_action }),
      });
      if (!res.ok) throw new Error("Failed to execute action");
      flashMessage(`Campaign updated (${quick_action}).`);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: number, sponsor: string) => {
    if (!confirm(`Delete campaign for ${sponsor}?`)) return;
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete campaign");
      flashMessage(`Campaign for ${sponsor} removed.`);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Create Campaign Direct
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignForm),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to create campaign");
      }
      flashMessage(`Campaign created for ${campaignForm.sponsor_name}.`);
      setCampaignModalOpen(false);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0062C3]" />
          <span>Loading marketing & monetization hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0062C3]/20 border border-[#0062C3]/40 flex items-center justify-center text-[#3B82F6]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Marketing & Monetization Control Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Manage promotional discount codes, Google AdSense slots, and direct local sponsorship marketplace.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/advertise"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
          >
            <span>Public /advertise Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Success / Notification Banner */}
      {actionSuccess && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm animate-fade-in shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/80 border border-rose-700 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-2 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* High-Level Overview Metrics */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Sponsor Ad Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              TZS {data.stats.total_direct_revenue_tsh.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">Paid direct sponsorships</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Ad Impressions</span>
              <Eye className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {data.stats.total_impressions.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">Customer views tracked</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Clicks & CTR</span>
              <MousePointerClick className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {data.stats.total_clicks.toLocaleString()}{" "}
              <span className="text-xs text-amber-400 font-bold">({data.stats.avg_ctr}%)</span>
            </div>
            <div className="text-[11px] text-slate-400">Interactions on sponsor banners</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Pending Reviews</span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white">
              {data.stats.pending_campaigns_count}
            </div>
            <div className="text-[11px] text-slate-400">
              {data.stats.pending_campaigns_count > 0 ? "Requires manager approval" : "Queue up to date"}
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab("promotions")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
            activeTab === "promotions"
              ? "bg-slate-800 text-white border-b-2 border-[#0062C3]"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Promotions & Vouchers</span>
          {data?.settings.promotions_enabled ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              ON ({data?.stats.active_promos_count})
            </span>
          ) : (
            <span className="bg-slate-700 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              OFF
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("adsense")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
            activeTab === "adsense"
              ? "bg-slate-800 text-white border-b-2 border-[#0062C3]"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Google AdSense</span>
          {data?.settings.adsense_enabled ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              ACTIVE
            </span>
          ) : (
            <span className="bg-slate-700 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
              DISABLED
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("placements")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
            activeTab === "placements"
              ? "bg-slate-800 text-white border-b-2 border-[#0062C3]"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Ad Slots & Pricing</span>
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
            activeTab === "campaigns"
              ? "bg-slate-800 text-white border-b-2 border-[#0062C3]"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Sponsorship Campaigns</span>
          {data && data.stats.pending_campaigns_count > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
              {data.stats.pending_campaigns_count} PENDING
            </span>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: PROMOTIONS & VOUCHERS                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "promotions" && data && (
        <div className="space-y-6">
          {/* Master Toggle Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-sm uppercase font-bold tracking-wider text-slate-400">
                  Global Promotions Engine
                </span>
                {data.settings.promotions_enabled ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active & Displaying to Customers
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    <XCircle className="w-3.5 h-3.5" />
                    Disabled (Zero Customer Promos)
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-300">
                When toggled <span className="font-semibold text-rose-400">OFF</span>, all promotional voucher displays, banners, and promo code inputs on the home page, deals page, and cart checkout are completely hidden. When toggled <span className="font-semibold text-emerald-400">ON</span>, only configured active vouchers will display cleanly.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTogglePromotions(!data.settings.promotions_enabled)}
                className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 ${
                  data.settings.promotions_enabled
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {data.settings.promotions_enabled ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Turn OFF Promotions</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Turn ON Promotions</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Configured Discount Vouchers</h3>
              <p className="text-xs text-slate-400">Create, edit, or toggle specific promo codes.</p>
            </div>

            <button
              onClick={() => {
                setEditingPromo(null);
                setPromoForm({
                  code: "",
                  title: "",
                  description: "",
                  discount_type: "percent",
                  discount_value: 10,
                  min_order_tsh: 0,
                  badge: "10% OFF",
                  active: true,
                });
                setPromoModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Promo Code</span>
            </button>
          </div>

          {/* Promos Grid */}
          {data.promotions.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
              <Tag className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold">No promotional codes configured yet.</p>
              <p className="text-xs text-slate-500">
                Click &ldquo;Create New Promo Code&rdquo; above to add your first voucher.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.promotions.map((promo) => (
                <div
                  key={promo.id}
                  className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all ${
                    promo.active === 1
                      ? "border-slate-800 hover:border-slate-700 shadow-md"
                      : "border-slate-800/40 opacity-60 bg-slate-950"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#0062C3]/20 border border-[#0062C3]/30 flex items-center justify-center text-[#3B82F6]">
                          <Percent className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-sm font-black text-white tracking-wider">
                          {promo.code}
                        </span>
                      </div>

                      {promo.badge && (
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#E5002B] text-white">
                          {promo.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{promo.title}</h4>
                      {promo.description && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{promo.description}</p>
                      )}
                    </div>

                    <div className="bg-slate-950 rounded-xl p-3 text-xs space-y-1 border border-slate-800/80 font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Discount:</span>
                        <span className="text-emerald-400 font-bold">
                          {promo.discount_type === "percent" ? `${promo.discount_value}% OFF` : `TZS ${promo.discount_value.toLocaleString()} OFF`}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Min Order:</span>
                        <span className="text-white">TZS {promo.min_order_tsh.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePromoActive(promo)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        promo.active === 1
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800 hover:bg-emerald-900"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {promo.active === 1 ? "Active ✓" : "Inactive ✕"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingPromo(promo);
                          setPromoForm({
                            code: promo.code,
                            title: promo.title,
                            description: promo.description || "",
                            discount_type: promo.discount_type,
                            discount_value: promo.discount_value,
                            min_order_tsh: promo.min_order_tsh,
                            badge: promo.badge || "",
                            active: promo.active === 1,
                          });
                          setPromoModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Edit Promo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeletePromo(promo.id, promo.code)}
                        className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-400 border border-rose-800 transition-colors"
                        title="Delete Promo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: GOOGLE ADSENSE HUB                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "adsense" && data && (
        <div className="space-y-6">
          <form onSubmit={handleSaveAdSense} className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#3B82F6]" />
                    <span>Google AdSense Display Settings</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect your official Google AdSense Publisher account to serve automated and display ads across customer pages.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adsenseForm.adsense_enabled}
                      onChange={(e) => setAdsenseForm({ ...adsenseForm, adsense_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0062C3]"></div>
                    <span className="ml-3 text-xs sm:text-sm font-bold text-slate-200">
                      {adsenseForm.adsense_enabled ? "AdSense Active" : "AdSense Disabled"}
                    </span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">
                    Google AdSense Publisher Client ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={adsenseForm.adsense_client_id}
                    onChange={(e) => setAdsenseForm({ ...adsenseForm, adsense_client_id: e.target.value })}
                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Your unique AdSense account identifier provided by Google (starts with <span className="font-mono">ca-pub-</span>).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Home Header Leaderboard Slot ID
                  </label>
                  <input
                    type="text"
                    value={adsenseForm.adsense_slot_top}
                    onChange={(e) => setAdsenseForm({ ...adsenseForm, adsense_slot_top: e.target.value })}
                    placeholder="e.g. 1234567890"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Menu In-Feed Responsive Unit Slot ID
                  </label>
                  <input
                    type="text"
                    value={adsenseForm.adsense_slot_infeed}
                    onChange={(e) => setAdsenseForm({ ...adsenseForm, adsense_slot_infeed: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">
                    Order Tracking Live Screen Slot ID
                  </label>
                  <input
                    type="text"
                    value={adsenseForm.adsense_slot_sidebar}
                    onChange={(e) => setAdsenseForm({ ...adsenseForm, adsense_slot_sidebar: e.target.value })}
                    placeholder="e.g. 5566778899"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save AdSense Configuration</span>
                </button>
              </div>
            </div>
          </form>

          {/* AdSense Implementation Note */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Core Web Vitals & Zero-CLS Guarantee</span>
            </div>
            <p>
              AdSense units are executed using non-blocking lazy loading with reserved placeholder aspect ratios. If an ad slot fails to fill or AdSense is deactivated, the container cleanly collapses with zero Cumulative Layout Shift (CLS), keeping customer navigation instant.
            </p>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: SPONSORED PLACEMENTS & RATE CARD                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "placements" && data && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Direct Sponsored Ad Slots & Rate Card</h3>
              <p className="text-xs text-slate-400">
                Configure self-serve booking rates (Daily, Weekly, Monthly in TZS) for prospective local sponsors.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.placements.map((placement) => (
              <div
                key={placement.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{placement.name}</h4>
                      <span className="font-mono text-xs text-[#3B82F6]">{placement.slot_key}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {placement.dimensions}
                    </span>
                  </div>

                  {placement.location_description && (
                    <p className="text-xs text-slate-400 leading-snug">{placement.location_description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Daily</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        TZS {placement.daily_price_tsh.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Weekly</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">
                        TZS {placement.weekly_price_tsh.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Monthly</div>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">
                        TZS {placement.monthly_price_tsh.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      placement.is_active === 1
                        ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {placement.is_active === 1 ? "Slot Available" : "Slot Disabled"}
                  </span>

                  <button
                    onClick={() => {
                      setEditingPlacement(placement);
                      setPlacementForm({
                        daily_price_tsh: placement.daily_price_tsh,
                        weekly_price_tsh: placement.weekly_price_tsh,
                        monthly_price_tsh: placement.monthly_price_tsh,
                        is_active: placement.is_active === 1,
                      });
                      setPlacementModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Rates</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: ADVERTISER CAMPAIGNS & APPROVALS                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "campaigns" && data && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Sponsorship Campaigns & Submissions</h3>
              <p className="text-xs text-slate-400">
                Review self-serve advertiser submissions, activate direct campaigns, and monitor CTR performance.
              </p>
            </div>

            <button
              onClick={() => {
                setCampaignForm({
                  placement_key: data.placements[0]?.slot_key || "home_hero_top",
                  sponsor_name: "",
                  sponsor_email: "",
                  sponsor_phone: "",
                  banner_image_url: "",
                  destination_url: "",
                  alt_text: "",
                  status: "ACTIVE",
                  start_date: new Date().toISOString().split("T")[0],
                  end_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
                  amount_paid_tsh: 120000,
                  payment_status: "PAID",
                  payment_reference: "DIRECT-ADMIN",
                  notes: "",
                });
                setCampaignModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0062C3] hover:bg-[#004B93] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Direct Campaign</span>
            </button>
          </div>

          {data.campaigns.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-semibold">No advertiser campaigns found.</p>
              <p className="text-xs text-slate-500">
                Sponsors who book via the public <span className="font-mono text-slate-300">/advertise</span> page will appear here for review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-sm hover:border-slate-700 transition-colors"
                >
                  {/* Creative Preview & Details */}
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="w-full sm:w-36 h-20 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={camp.banner_image_url}
                        alt={camp.sponsor_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-white">{camp.sponsor_name}</span>
                        <span
                          className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                            camp.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : camp.status === "PENDING"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                              : camp.status === "PAUSED"
                              ? "bg-slate-700 text-slate-300"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {camp.status}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            camp.payment_status === "PAID"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-rose-950 text-rose-300 border border-rose-800"
                          }`}
                        >
                          {camp.payment_status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Slot: <strong className="text-slate-200">{camp.placement_name}</strong></span>
                        <span>Schedule: <strong className="text-slate-200">{camp.start_date} – {camp.end_date}</strong></span>
                        <span>Contacts: <strong className="text-slate-200">{camp.sponsor_phone || camp.sponsor_email}</strong></span>
                      </div>

                      <div className="text-xs text-[#3B82F6] truncate max-w-md">
                        <a href={camp.destination_url} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                          <span>Target: {camp.destination_url}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Performance & Revenue Metrics */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase">Revenue</div>
                      <div className="text-sm font-bold text-white">
                        TZS {camp.amount_paid_tsh.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase">Views / Clicks</div>
                      <div className="text-sm font-bold text-white">
                        {camp.impressions_count} / {camp.clicks_count}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {camp.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleCampaignAction(camp.id, "APPROVE")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                            title="Approve and activate"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleCampaignAction(camp.id, "REJECT")}
                            className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-colors"
                            title="Reject submission"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {camp.status === "ACTIVE" && (
                        <button
                          onClick={() => handleCampaignAction(camp.id, "PAUSE")}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                        >
                          Pause
                        </button>
                      )}

                      {camp.status === "PAUSED" && (
                        <button
                          onClick={() => handleCampaignAction(camp.id, "ACTIVATE")}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                        >
                          Resume
                        </button>
                      )}

                      {camp.payment_status === "UNPAID" && (
                        <button
                          onClick={() => handleCampaignAction(camp.id, "MARK_PAID")}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold hover:bg-emerald-900 transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteCampaign(camp.id, camp.sponsor_name)}
                        className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 transition-colors"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: PROMOTION BUILDER                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingPromo ? `Edit Promo Code: ${editingPromo.code}` : "Create New Promotion Voucher"}
              </h3>
              <button
                onClick={() => setPromoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Promo Code (e.g. VIP20)</label>
                  <input
                    type="text"
                    required
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                    placeholder="VIP20"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs font-mono uppercase text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Badge Label (Optional)</label>
                  <input
                    type="text"
                    value={promoForm.badge}
                    onChange={(e) => setPromoForm({ ...promoForm, badge: e.target.value })}
                    placeholder="20% OFF"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Voucher Title</label>
                <input
                  type="text"
                  required
                  value={promoForm.title}
                  onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                  placeholder="Weekend Feast Special"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Description</label>
                <input
                  type="text"
                  value={promoForm.description}
                  onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  placeholder="Enjoy 20% off on all family platters over TZS 25,000"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Type</label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed TZS</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Value {promoForm.discount_type === "percent" ? "(%)" : "(TZS)"}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={promoForm.discount_value}
                    onChange={(e) => setPromoForm({ ...promoForm, discount_value: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Min. Order (TZS)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={promoForm.min_order_tsh}
                    onChange={(e) => setPromoForm({ ...promoForm, min_order_tsh: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="promo_active_chk"
                  checked={promoForm.active}
                  onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-[#0062C3] focus:ring-0"
                />
                <label htmlFor="promo_active_chk" className="text-xs font-bold text-slate-300">
                  Set this promotional voucher as active immediately
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0062C3] hover:bg-[#004B93] text-white text-xs font-bold transition-colors shadow-md"
                >
                  {editingPromo ? "Update Voucher" : "Save & Publish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: PLACEMENT RATES                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {placementModalOpen && editingPlacement && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Slot Pricing: {editingPlacement.name}</h3>
              <button onClick={() => setPlacementModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSavePlacement} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Daily Rate (TZS)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={1000}
                  value={placementForm.daily_price_tsh}
                  onChange={(e) => setPlacementForm({ ...placementForm, daily_price_tsh: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Weekly Rate (TZS)</label>
                <input
                  type="number"
                  required
                  min={5000}
                  step={1000}
                  value={placementForm.weekly_price_tsh}
                  onChange={(e) => setPlacementForm({ ...placementForm, weekly_price_tsh: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Monthly Rate (TZS)</label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={5000}
                  value={placementForm.monthly_price_tsh}
                  onChange={(e) => setPlacementForm({ ...placementForm, monthly_price_tsh: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="slot_active_chk"
                  checked={placementForm.is_active}
                  onChange={(e) => setPlacementForm({ ...placementForm, is_active: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-[#0062C3]"
                />
                <label htmlFor="slot_active_chk" className="text-xs font-bold text-slate-300">
                  Allow advertisers to book this slot
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPlacementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0062C3] text-white text-xs font-bold shadow-md"
                >
                  Save Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: DIRECT CAMPAIGN CREATOR                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {campaignModalOpen && data && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Direct Sponsor Campaign</h3>
              <button onClick={() => setCampaignModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Target Placement Slot</label>
                <select
                  value={campaignForm.placement_key}
                  onChange={(e) => setCampaignForm({ ...campaignForm, placement_key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {data.placements.map((p) => (
                    <option key={p.slot_key} value={p.slot_key}>
                      {p.name} ({p.dimensions})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Sponsor / Brand Name</label>
                  <input
                    type="text"
                    required
                    value={campaignForm.sponsor_name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, sponsor_name: e.target.value })}
                    placeholder="Coca-Cola Kwanza"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={campaignForm.sponsor_phone}
                    onChange={(e) => setCampaignForm({ ...campaignForm, sponsor_phone: e.target.value })}
                    placeholder="+255 7XX XXX XXX"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Banner Image URL</label>
                <input
                  type="url"
                  required
                  value={campaignForm.banner_image_url}
                  onChange={(e) => setCampaignForm({ ...campaignForm, banner_image_url: e.target.value })}
                  placeholder="https://example.com/banner.png"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Destination Website / Link</label>
                <input
                  type="text"
                  required
                  value={campaignForm.destination_url}
                  onChange={(e) => setCampaignForm({ ...campaignForm, destination_url: e.target.value })}
                  placeholder="https://mybrand.co.tz"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Start Date</label>
                  <input
                    type="date"
                    required
                    value={campaignForm.start_date}
                    onChange={(e) => setCampaignForm({ ...campaignForm, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">End Date</label>
                  <input
                    type="date"
                    required
                    value={campaignForm.end_date}
                    onChange={(e) => setCampaignForm({ ...campaignForm, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Amount (TZS)</label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={campaignForm.amount_paid_tsh}
                    onChange={(e) => setCampaignForm({ ...campaignForm, amount_paid_tsh: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Payment Status</label>
                  <select
                    value={campaignForm.payment_status}
                    onChange={(e) => setCampaignForm({ ...campaignForm, payment_status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCampaignModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0062C3] hover:bg-[#004B93] text-white text-xs font-bold shadow-md"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
