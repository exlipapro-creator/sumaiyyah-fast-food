"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  CheckCircle2,
  Clock,
  Bike,
  ShieldCheck,
  Search,
  ChevronRight,
  Layers,
  Sparkles,
  Compass,
  Building2,
  PhoneCall,
  Flame,
  Zap,
} from "lucide-react";

export interface DeliveryZone {
  id: string;
  name: string;
  swahiliName: string;
  distanceKm: number;
  estimatedTimeMin: string;
  tier: "express" | "core" | "extended";
  coordinates: { x: number; y: number }; // SVG percentage coordinate (0-100)
  landmarks: string[];
  popularSpots: string;
  corridorNote: string;
  available: boolean;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "kariakoo",
    name: "Kariakoo & Msimbazi",
    swahiliName: "Kariakoo, Msimbazi & Gerezani",
    distanceKm: 0.8,
    estimatedTimeMin: "10 - 15 mins",
    tier: "express",
    coordinates: { x: 42, y: 52 },
    landmarks: ["Soko Kuu Kariakoo", "Msimbazi St", "Uhuru St", "Kongo St", "Machinga Complex"],
    popularSpots: "Msimbazi Centre, Uhuru Rd, Kongo St, Nyamwezi St, Swahili St",
    corridorNote: "Express bike dispatch from our central kitchen within 10 minutes.",
    available: true,
  },
  {
    id: "kisutu",
    name: "Kisutu & Bandari",
    swahiliName: "Kisutu, Zanaki & City Mall",
    distanceKm: 0.6,
    estimatedTimeMin: "10 - 15 mins",
    tier: "express",
    coordinates: { x: 48, y: 54 },
    landmarks: ["Kisutu Market", "Zanaki St", "Indira Gandhi St", "Jamhuri St", "City Mall"],
    popularSpots: "Zanaki Street, Mosque St, City Mall, Bandari, Libya St",
    corridorNote: "Direct transit through Zanaki & Jamhuri street corridor.",
    available: true,
  },
  {
    id: "posta",
    name: "Posta / City Center (CBD)",
    swahiliName: "Posta Mpya, Samora & Kivukoni",
    distanceKm: 1.3,
    estimatedTimeMin: "12 - 18 mins",
    tier: "express",
    coordinates: { x: 59, y: 56 },
    landmarks: ["Samora Ave", "Azikiwe St", "Clock Tower", "Askari Monument", "PSPF Towers", "Maktaba St"],
    popularSpots: "Samora Avenue, Ohio St, Posta Mpya, Azikiwe, Bank Towers, Viva Towers",
    corridorNote: "Direct fast-lane motorcycle delivery to all downtown corporate towers.",
    available: true,
  },
  {
    id: "upanga",
    name: "Upanga (East & West)",
    swahiliName: "Upanga Mashariki na Magharibi",
    distanceKm: 1.8,
    estimatedTimeMin: "15 - 20 mins",
    tier: "core",
    coordinates: { x: 50, y: 38 },
    landmarks: ["United Nations Rd", "Malik Rd", "Diamond Jubilee", "Aga Khan Hospital", "Mindu St"],
    popularSpots: "UN Road, Olympic, Diamond Jubilee, Al-Muntazir, Fire Station",
    corridorNote: "Smooth route via Ali Hassan Mwinyi & United Nations Road.",
    available: true,
  },
  {
    id: "muhimbili",
    name: "Muhimbili & Jangwani",
    swahiliName: "Muhimbili (MNH) & Jangwani",
    distanceKm: 2.1,
    estimatedTimeMin: "15 - 20 mins",
    tier: "core",
    coordinates: { x: 38, y: 43 },
    landmarks: ["MNH Main Hospital", "MUHAS Campus", "Jangwani Valley", "Morogoro Rd BRT"],
    popularSpots: "Muhimbili Hospital Wards, Staff Quarters, MUHAS Cafeteria, Jangwani",
    corridorNote: "Direct priority dispatch for doctors, healthcare workers & patients.",
    available: true,
  },
  {
    id: "kivukoni",
    name: "Kivukoni & Ferry",
    swahiliName: "Kivukoni, Ocean Road & Gymkhana",
    distanceKm: 2.4,
    estimatedTimeMin: "15 - 22 mins",
    tier: "core",
    coordinates: { x: 68, y: 62 },
    landmarks: ["Magogoni Ferry", "State House Area", "Ocean Road Hospital", "Gymkhana Club"],
    popularSpots: "Ferry Market, Ocean Road, Kivukoni Front, Hyatt Regency, Tanesco HQ",
    corridorNote: "Waterfront corridor with thermal container temperature retention.",
    available: true,
  },
  {
    id: "ilala",
    name: "Ilala Boma & Karume",
    swahiliName: "Ilala, Amana Hospital & Bungoni",
    distanceKm: 2.8,
    estimatedTimeMin: "18 - 25 mins",
    tier: "core",
    coordinates: { x: 32, y: 64 },
    landmarks: ["Amana Hospital", "Uhuru St", "Karume Stadium", "Ilala Boma", "Mchikichini"],
    popularSpots: "Amana Hospital, Boma, Uhuru St, Shariff Shamba, Bungoni",
    corridorNote: "Transit via Uhuru St & Karume cross-junction.",
    available: true,
  },
  {
    id: "magomeni",
    name: "Magomeni (Mapipa & Kagera)",
    swahiliName: "Magomeni, Mapipa, Kagera & Mikumi",
    distanceKm: 3.9,
    estimatedTimeMin: "20 - 30 mins",
    tier: "extended",
    coordinates: { x: 26, y: 36 },
    landmarks: ["Mapipa BRT", "Morogoro Rd", "Kagera", "Makanya St", "Magomeni Hospital"],
    popularSpots: "Morogoro Road, Mapipa, Magomeni Hospital, Usalama, Kagera",
    corridorNote: "Fast dispatch through Morogoro Road express lanes.",
    available: true,
  },
  {
    id: "kinondoni",
    name: "Kinondoni & Hananasif",
    swahiliName: "Kinondoni, Studio, Manyanya & Morocco",
    distanceKm: 5.1,
    estimatedTimeMin: "25 - 35 mins",
    tier: "extended",
    coordinates: { x: 38, y: 22 },
    landmarks: ["Kinondoni B", "Manyanya", "Hananasif", "Studio", "Biafra Grounds"],
    popularSpots: "Kinondoni Road, Boma, Studio, Biafra, Morocco Junction",
    corridorNote: "Extended perimeter delivery with insulated hot-box bike carriers.",
    available: true,
  },
];

interface DeliveryRadiusMapProps {
  compact?: boolean;
  showTitle?: boolean;
  activeZoneId?: string;
  onZoneSelect?: (zone: DeliveryZone) => void;
  highlightAddress?: string | null;
  className?: string;
}

export default function DeliveryRadiusMap({
  compact = false,
  showTitle = true,
  activeZoneId,
  onZoneSelect,
  highlightAddress,
  className = "",
}: DeliveryRadiusMapProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(activeZoneId || "kariakoo");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTier, setActiveTier] = useState<"all" | "express" | "core" | "extended">("all");

  // Keep internal selected state synchronized if parent passes activeZoneId
  useEffect(() => {
    if (activeZoneId) {
      setSelectedZoneId(activeZoneId);
    }
  }, [activeZoneId]);

  // If highlightAddress is provided, detect matching zone
  useEffect(() => {
    if (highlightAddress) {
      const lower = highlightAddress.toLowerCase();
      const matched = DELIVERY_ZONES.find(
        (z) =>
          lower.includes(z.id) ||
          lower.includes(z.name.toLowerCase()) ||
          z.landmarks.some((l) => lower.includes(l.toLowerCase())) ||
          lower.includes(z.swahiliName.toLowerCase())
      );
      if (matched) {
        setSelectedZoneId(matched.id);
      }
    }
  }, [highlightAddress]);

  const selectedZone = useMemo(() => {
    return DELIVERY_ZONES.find((z) => z.id === selectedZoneId) || DELIVERY_ZONES[0];
  }, [selectedZoneId]);

  const handleSelectZone = (zone: DeliveryZone) => {
    setSelectedZoneId(zone.id);
    if (onZoneSelect) {
      onZoneSelect(zone);
    }
  };

  // Search and tier filtering
  const filteredZones = useMemo(() => {
    return DELIVERY_ZONES.filter((zone) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        zone.name.toLowerCase().includes(q) ||
        zone.swahiliName.toLowerCase().includes(q) ||
        zone.landmarks.some((l) => l.toLowerCase().includes(q)) ||
        zone.popularSpots.toLowerCase().includes(q);

      const matchesTier = activeTier === "all" ? true : zone.tier === activeTier;

      return matchesSearch && matchesTier;
    });
  }, [searchQuery, activeTier]);

  return (
    <div
      id="delivery-coverage-section"
      className={`w-full bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 transition-all ${className}`}
    >
      {/* ─── SECTION HEADER & SYNC BADGE ─────────────────────────────────── */}
      {showTitle && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0062C3]/10 border border-[#0062C3]/20 text-[#0062C3] text-xs font-bold uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5" />
              <span>Dar es Salaam City Coverage & Transit Radar</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif">
              Live Delivery Radius & Dispatch Zones
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Our central restaurant at Bibi Titi Mohammed Street, Posta prepares and delivers hot, fresh Swahili street food across Posta, Upanga, Kariakoo, Ilala, and surrounding corridors in <span className="font-semibold text-slate-800">10–30 minutes</span>.
            </p>
          </div>

          {/* Real-time kitchen hub status indicator */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Kitchen Dispatch Active</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-[#0062C3] text-xs font-mono font-bold">
              <Bike className="w-3.5 h-3.5" />
              <span>TZS 2,500 Flat Delivery</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIVE SEARCH & FILTER TABS ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tafuta mtaa, ofisi au jengo..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#0062C3] focus:bg-white rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-200 hover:bg-slate-300 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
            >
              &times;
            </button>
          )}
        </div>

        {/* Tier filter pill buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTier("all")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTier === "all"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
            }`}
          >
            Maeneo Yote
          </button>
          <button
            type="button"
            onClick={() => setActiveTier("express")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTier === "express"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Express (10-15m)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTier("core")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTier === "core"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
            }`}
          >
            Core City (15-22m)
          </button>
          <button
            type="button"
            onClick={() => setActiveTier("extended")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTier === "extended"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
            }`}
          >
            Outer (20-35m)
          </button>
        </div>
      </div>

      {/* ─── INTERACTIVE MAP & DETAILS VIEWPORT ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* LEFT (7 cols): High Polish SVG Cartographic Radar Display */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-800 text-white relative overflow-hidden flex flex-col justify-between shadow-md">
          {/* Subtle Grid & Radar Pulse Animation */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#38BDF8_1px,transparent_1px)] [background-size:18px_18px]"></div>

          {/* Top Radar Bar */}
          <div className="flex items-center justify-between relative z-10 mb-3 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Dar es Salaam Cartographic Radar
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> Jiko Kuu (Hub)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Active (TZS 2,500)
              </span>
            </div>
          </div>

          {/* Interactive SVG Stage */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center p-2 select-none">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full text-slate-400 transition-all duration-300"
            >
              {/* Outer Range Ring (6km Extended) */}
              <circle
                cx="48"
                cy="50"
                r="44"
                fill="none"
                stroke="#1E293B"
                strokeWidth="0.8"
                strokeDasharray="2,2"
              />
              <text x="50" y="8" fill="#475569" fontSize="2.4" textAnchor="middle" fontFamily="monospace">
                6.0 KM EXTENDED PERIMETER
              </text>

              {/* Mid Range Ring (4km Core) */}
              <circle
                cx="48"
                cy="50"
                r="30"
                fill="#0062C3"
                fillOpacity="0.05"
                stroke="#0284C7"
                strokeWidth="0.8"
                strokeDasharray="3,3"
                strokeOpacity="0.5"
              />
              <text x="50" y="22" fill="#38BDF8" fontSize="2.3" textAnchor="middle" fontFamily="monospace">
                4.0 KM CORE TRANSIT
              </text>

              {/* Inner Range Ring (2km Express) */}
              <circle
                cx="48"
                cy="50"
                r="16"
                fill="#10B981"
                fillOpacity="0.08"
                stroke="#10B981"
                strokeWidth="1.2"
                strokeOpacity="0.7"
              />
              <text x="48" y="36" fill="#34D399" fontSize="2.3" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                2.0 KM EXPRESS DISPATCH (10-15m)
              </text>

              {/* Coastline / Indian Ocean Indicator (East / Kivukoni side) */}
              <path
                d="M 78 0 Q 72 30 75 60 T 95 100 L 100 100 L 100 0 Z"
                fill="#0284C7"
                fillOpacity="0.12"
                stroke="#0369A1"
                strokeWidth="0.6"
              />
              <text
                x="88"
                y="40"
                fill="#1E3A5F"
                fontSize="3"
                fontWeight="bold"
                fontFamily="sans-serif"
                letterSpacing="1"
                transform="rotate(70, 88, 40)"
              >
                INDIAN OCEAN
              </text>

              {/* Major Transit Corridors (Abstracted Arteries) */}
              {/* Morogoro Road / BRT Line */}
              <line x1="10" y1="30" x2="48" y2="50" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
              <text x="22" y="32" fill="#64748B" fontSize="2.1" transform="rotate(25, 22, 32)">Morogoro Rd (BRT)</text>

              {/* Ali Hassan Mwinyi Road (North) */}
              <line x1="45" y1="10" x2="58" y2="56" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
              <text x="49" y="23" fill="#64748B" fontSize="2.1" transform="rotate(70, 49, 23)">A.H. Mwinyi Rd</text>

              {/* Uhuru Street (Ilala / Karume to Kariakoo) */}
              <line x1="15" y1="75" x2="48" y2="50" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
              <text x="24" y="69" fill="#64748B" fontSize="2.1" transform="rotate(-30, 24, 69)">Uhuru St</text>

              {/* Samora Avenue to Kivukoni */}
              <line x1="48" y1="50" x2="72" y2="60" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
              <text x="59" y="61" fill="#64748B" fontSize="2.1" transform="rotate(20, 59, 61)">Samora Ave</text>

              {/* Active Vector Ray from Kitchen to Selected Zone */}
              {selectedZone && (
                <g>
                  <line
                    x1="48"
                    y1="50"
                    x2={selectedZone.coordinates.x}
                    y2={selectedZone.coordinates.y}
                    stroke="#F59E0B"
                    strokeWidth="1.8"
                    strokeDasharray="3,3"
                    className="animate-pulse"
                  />
                  {/* Distance badge on vector ray midpoint */}
                  <rect
                    x={(48 + selectedZone.coordinates.x) / 2 - 5}
                    y={(50 + selectedZone.coordinates.y) / 2 - 2.5}
                    width="10"
                    height="5"
                    rx="1.5"
                    fill="#0F172A"
                    stroke="#F59E0B"
                    strokeWidth="0.5"
                  />
                  <text
                    x={(48 + selectedZone.coordinates.x) / 2}
                    y={(50 + selectedZone.coordinates.y) / 2 + 1}
                    fill="#FDE68A"
                    fontSize="2.1"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {selectedZone.distanceKm}km
                  </text>
                </g>
              )}

              {/* Central Kitchen Origin Hub */}
              <g transform="translate(48, 50)">
                <circle r="7" fill="#F59E0B" opacity="0.25" className="animate-ping" />
                <circle r="4" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="1" />
                <circle r="1.8" fill="#1E293B" />
              </g>
              <text x="48" y="57" fill="#FBBF24" fontSize="2.7" textAnchor="middle" fontWeight="bold">
                JIKO KUU (Hub)
              </text>

              {/* Destination Zone Pins with Enlarged Touch Hit Targets */}
              {DELIVERY_ZONES.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                const isTierMatched = activeTier === "all" || zone.tier === activeTier;
                return (
                  <g
                    key={zone.id}
                    transform={`translate(${zone.coordinates.x}, ${zone.coordinates.y})`}
                    className="cursor-pointer group"
                    onClick={() => handleSelectZone(zone)}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      handleSelectZone(zone);
                    }}
                  >
                    {/* Generous invisible touch circle hit area for mobile */}
                    <circle r="12" fill="transparent" className="cursor-pointer" />

                    {/* Pulsing ring for selected pin */}
                    {isSelected && (
                      <circle r="7" fill="#10B981" opacity="0.45" className="animate-ping" />
                    )}

                    {/* Node Dot */}
                    <circle
                      r={isSelected ? 4.5 : isTierMatched ? 3.2 : 2.2}
                      fill={isSelected ? "#10B981" : isTierMatched ? "#38BDF8" : "#475569"}
                      stroke="#FFFFFF"
                      strokeWidth={isSelected ? 1.4 : 0.7}
                      className="transition-all duration-200 group-hover:scale-125"
                    />

                    {/* Zone Title Label */}
                    <text
                      x="0"
                      y={zone.coordinates.y > 60 ? -5.5 : 7.5}
                      fill={isSelected ? "#34D399" : isTierMatched ? "#F1F5F9" : "#64748B"}
                      fontSize={isSelected ? "3.4" : "2.6"}
                      fontWeight={isSelected ? "bold" : "600"}
                      textAnchor="middle"
                      className="transition-all duration-200 filter drop-shadow-sm select-none"
                    >
                      {zone.name.split("/")[0].split("&")[0].trim()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Quick Zone Navigation Strip */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DELIVERY_ZONES.map((zone) => {
              const isSelected = zone.id === selectedZoneId;
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => handleSelectZone(zone)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{zone.name.split("/")[0].split("&")[0].trim()}</span>
                  <span className="text-[10px] opacity-75 font-mono">({zone.distanceKm}km)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT (5 cols): Selected Zone Card & Direct Delivery Specs */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          {/* Main Selected Area Dossier Card */}
          <div className="bg-[#F8FAFD] border-2 border-[#0062C3]/25 rounded-2xl p-5 shadow-xs space-y-4">
            
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#0062C3]">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Selected Delivery Zone</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 leading-tight">
                  {selectedZone.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedZone.swahiliName}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Available Now</span>
                </span>
              </div>
            </div>

            {/* Metrics Dual Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-[#0062C3]" />
                  <span>Estimated Arrival</span>
                </div>
                <div className="text-base font-black text-slate-900">
                  {selectedZone.estimatedTimeMin}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">
                  Kitchen to Table Time
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <Bike className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Road Distance</span>
                </div>
                <div className="text-base font-black text-slate-900 font-mono">
                  ~{selectedZone.distanceKm} km
                </div>
                <div className="text-[10px] text-slate-500">
                  From Bibi Titi Mohammed St, Posta
                </div>
              </div>
            </div>

            {/* Landmarks & Covered Offices */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0062C3]" />
                <span>Streets, Offices & Landmarks Covered:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedZone.landmarks.map((spot, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 shadow-2xs"
                  >
                    {spot}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                <span className="font-semibold text-slate-700">Popular drops:</span> {selectedZone.popularSpots}
              </p>
            </div>

            {/* Corridor Dispatch Note */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#004B93]">
              <ShieldCheck className="w-4 h-4 text-[#0062C3] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Thermal Insulated Packaging</span>
                <span className="text-[11px] text-slate-600">
                  {selectedZone.corridorNote} Sealed hot containers ensure pristine temperature and crispness.
                </span>
              </div>
            </div>

            {/* Direct Order Button with Area Prefilled */}
            <Link
              href={`/order?area=${encodeURIComponent(selectedZone.name)}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0062C3] hover:bg-[#004B93] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-98"
            >
              <span>Order Food for Delivery to {selectedZone.name.split("/")[0].split("&")[0].trim()}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Zone Directory List for Fast Scanning */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
              <span>Maeneo Yanayofikiwa</span>
              <span className="text-[11px] text-slate-400 font-normal">Bonyeza kuchagua eneo</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {filteredZones.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => handleSelectZone(zone)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? "bg-[#0062C3] text-white font-bold shadow-2xs"
                        : "hover:bg-slate-50 text-slate-700 border border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-300" : "text-slate-400"}`} />
                      <span className="truncate">{zone.name}</span>
                    </div>
                    <span className={`text-[11px] font-mono shrink-0 ${isSelected ? "text-blue-100 font-bold" : "text-slate-500"}`}>
                      {zone.estimatedTimeMin}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
