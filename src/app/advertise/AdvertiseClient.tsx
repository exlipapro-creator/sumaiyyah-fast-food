"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Send,
  Building,
  Eye,
} from "lucide-react";

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

export default function AdvertiseClient() {
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [directAdsEnabled, setDirectAdsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [selectedSlotKey, setSelectedSlotKey] = useState<string>("home_hero_top");
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date(Date.now() + 8 * 86400000).toISOString().split("T")[0]
  );
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorEmail, setSponsorEmail] = useState("");
  const [sponsorPhone, setSponsorPhone] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlacements() {
      try {
        const res = await fetch("/api/public/ads/placements");
        if (res.ok) {
          const data = await res.json();
          setPlacements(data.placements || []);
          setDirectAdsEnabled(data.direct_ads_enabled !== false);
          if (data.placements && data.placements.length > 0) {
            setSelectedSlotKey(data.placements[0].slot_key);
          }
        }
      } catch (e) {
        console.error("Failed to load ad placements", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlacements();
  }, []);

  const selectedPlacement = placements.find((p) => p.slot_key === selectedSlotKey) || placements[0];

  // Dynamic Price Calculation
  const calculatePrice = () => {
    if (!selectedPlacement) return { days: 0, totalTsh: 0 };
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { days: 0, totalTsh: 0 };
    }
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let total = 0;
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30);
      const remDays = diffDays % 30;
      total = months * selectedPlacement.monthly_price_tsh + remDays * selectedPlacement.daily_price_tsh;
    } else if (diffDays >= 7) {
      const weeks = Math.floor(diffDays / 7);
      const remDays = diffDays % 7;
      total = weeks * selectedPlacement.weekly_price_tsh + remDays * selectedPlacement.daily_price_tsh;
    } else {
      total = diffDays * selectedPlacement.daily_price_tsh;
    }
    return { days: diffDays, totalTsh: total };
  };

  const { days: calculatedDays, totalTsh: calculatedTotalTsh } = calculatePrice();

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/public/ads/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placement_key: selectedSlotKey,
          sponsor_name: sponsorName,
          sponsor_email: sponsorEmail,
          sponsor_phone: sponsorPhone,
          banner_image_url: bannerImageUrl,
          destination_url: destinationUrl,
          alt_text: altText,
          start_date: startDate,
          end_date: endDate,
          notes,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Imeshindikana kutuma ombi lako.");
      }

      setSubmissionSuccess(resData);
    } catch (err: any) {
      setSubmitError(err.message || "Hitilafu imetokea. Tafadhali jaribu tena.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-lg font-black tracking-tight text-white group-hover:text-[#3B82F6] transition-colors">
              SUMAIYYAH
            </span>
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-[#0062C3]/20 text-[#3B82F6] border border-[#0062C3]/30">
              Advertiser Hub
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Rudi Mgahawani
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 flex-1 w-full">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-[#0062C3]/20 border border-[#0062C3]/40 text-[#3B82F6] text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Advertising & Brand Placements</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Fikia maelfu ya wateja wenye nia ya kununua kila siku
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Weka chapa, bidhaa, au huduma yako moja kwa moja mbele ya wateja wanaotembelea menyu na kuagiza chakula Sumaiyyah. Hakuna madalali, viwango wazi kwa TZS, na takwimu halisi za mibofyo.
          </p>
        </div>

        {/* Value Props / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#0062C3]/20 border border-[#0062C3]/30 flex items-center justify-center text-[#3B82F6]">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Wateja Walengwa (High Intent)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mamilioni ya miamala na wageni wanaotafuta milo mizuri, vinywaji, na huduma jijini Dar es Salaam.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Nafasi za Juu Bila Kelele</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mabango yenye muonekano maridadi, yasiyokata mawasiliano ya mteja na yanayopakia papo hapo.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Takwimu Halisi (CTR & Views)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fuatilia mibofyo na mara ngapi tangazo lako limetazamwa na wateja halisi kwa uwazi wa 100%.
            </p>
          </div>
        </div>

        {/* Ad Placements Inventory & Rate Card */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Viwango vya Nafasi za Matangazo</h2>
              <p className="text-xs text-slate-400">Chagua nafasi inayokufaa na utazame viwango rasmi kwa TZS.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {placements.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedSlotKey(p.slot_key)}
                className={`bg-slate-900 border rounded-2xl p-5 cursor-pointer transition-all ${
                  selectedSlotKey === p.slot_key
                    ? "border-[#0062C3] ring-2 ring-[#0062C3]/30 bg-slate-900/90"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{p.location_description}</p>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                    {p.dimensions}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center font-mono mt-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Siku 1</div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      TZS {p.daily_price_tsh.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Wiki 1</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">
                      TZS {p.weekly_price_tsh.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Mwezi 1</div>
                    <div className="text-xs font-bold text-amber-400 mt-0.5">
                      TZS {p.monthly_price_tsh.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Booking & Price Calculator Form */}
        <div id="booking-section" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#3B82F6]" />
              <span>Weka Nafasi na Kokotoa Bei (Book a Slot)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Chagua muda na uweke maelezo ya kampeni yako. Wasimamizi wetu watahakiki na kuwasiliana nawe haraka.
            </p>
          </div>

          {submissionSuccess ? (
            <div className="bg-emerald-950/90 border border-emerald-700 rounded-2xl p-6 text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Ombi Lako Limepokelewa Kikamilifu!</h3>
              <p className="text-xs sm:text-sm text-emerald-200 max-w-md mx-auto">
                {submissionSuccess.message}
              </p>
              <div className="bg-slate-950/80 p-4 rounded-xl max-w-sm mx-auto text-xs font-mono space-y-1 text-slate-300 border border-emerald-900">
                <div>Muda wa Kampeni: <strong>Siku {submissionSuccess.total_days}</strong></div>
                <div>Jumla ya Gharama: <strong className="text-emerald-400">TZS {submissionSuccess.amount_tsh?.toLocaleString()}</strong></div>
              </div>
              <button
                onClick={() => setSubmissionSuccess(null)}
                className="px-6 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Weka Tangazo Lingine
              </button>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {submitError && (
                <div className="bg-rose-950/80 border border-rose-700 text-rose-300 p-4 rounded-xl text-xs sm:text-sm">
                  {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Placement Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Nafasi ya Tangazo (Placement Slot)
                  </label>
                  <select
                    value={selectedSlotKey}
                    onChange={(e) => setSelectedSlotKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
                  >
                    {placements.map((p) => (
                      <option key={p.slot_key} value={p.slot_key}>
                        {p.name} ({p.dimensions})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sponsor Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Jina la Kampuni au Chapa (Brand Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="Mfano: Azam Cola / Kioo LTD"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Simu / WhatsApp <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={sponsorPhone}
                    onChange={(e) => setSponsorPhone(e.target.value)}
                    placeholder="+255 7XX XXX XXX"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Barua Pepe (Email) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={sponsorEmail}
                    onChange={(e) => setSponsorEmail(e.target.value)}
                    placeholder="ads@company.co.tz"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                {/* Dates */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Tarehe ya Kuanza (Start Date) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Tarehe ya Kumaliza (End Date) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none"
                  />
                </div>

                {/* Banner Image URL */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">
                    Kiungo cha Picha ya Bango (Banner Image URL) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://mysite.com/banner-728x90.jpg"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Picha inapaswa kuendana na vipimo vya nafasi uliyochagua ({selectedPlacement?.dimensions}).
                  </p>
                </div>

                {/* Destination URL */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-300">
                    Kiungo cha Tovuti/WhatsApp ya Bidhaa (Destination Link) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://mysite.co.tz au https://wa.me/255XXXXXXXXX"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#0062C3] rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Banner Live Preview */}
              {bannerImageUrl && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <div className="text-xs font-bold text-slate-400">Muonekano wa Bango Lako (Preview):</div>
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 overflow-hidden">
                    <img
                      src={bannerImageUrl}
                      alt="Banner Preview"
                      className="max-h-40 mx-auto object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Price Calculation Summary Banner */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-center sm:text-left">
                  <div className="text-xs text-slate-400">Jumla ya Gharama Iliyokokotolewa:</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">
                    TZS {calculatedTotalTsh.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Muda wa siku {calculatedDays} kwenye nafasi ya {selectedPlacement?.name}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || calculatedDays <= 0}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#0062C3] hover:bg-[#004B93] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Inatuma Ombi..." : "Tuma Ombi la Tangazo"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} Sumaiyyah Restaurant & Catering. Haki Zote Zimehifadhiwa.</p>
          <p>Kwa maswali ya matangazo ya shirika: <span className="text-slate-300">ads@sumaiyyah.co.tz</span> | WhatsApp: <span className="text-slate-300">+255 754 000 000</span></p>
        </div>
      </footer>
    </div>
  );
}
