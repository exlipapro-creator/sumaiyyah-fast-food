"use client";

import React, { useState, useMemo } from "react";
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
  Sparkles,
  Layers,
  Info,
} from "lucide-react";

export interface DeliveryZone {
  id: string;
  name: string;
  swahiliName: string;
  distanceKm: number;
  estimatedTimeMin: string;
  tier: "tier1" | "tier2" | "tier3";
  coordinates: { x: number; y: number }; // Relative SVG percentage (0-100)
  landmarks: string[];
  popularSpots: string;
  available: boolean;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: "kariakoo",
    name: "Kariakoo",
    swahiliName: "Kariakoo & Msimbazi",
    distanceKm: 0.9,
    estimatedTimeMin: "10 - 15 mins",
    tier: "tier1",
    coordinates: { x: 42, y: 52 },
    landmarks: ["Soko Kuu", "Msimbazi St", "Uhuru St", "Kongo St", "Gerezani"],
    popularSpots: "Msimbazi, Uhuru Rd, Machinga Complex, Kongo St",
    available: true,
  },
  {
    id: "posta",
    name: "Posta / City Center (CBD)",
    swahiliName: "Posta & Kivukoni",
    distanceKm: 1.2,
    estimatedTimeMin: "12 - 18 mins",
    tier: "tier1",
    coordinates: { x: 58, y: 56 },
    landmarks: ["Samora Ave", "Azikiwe St", "Clock Tower", "Askari Monument", "Maktaba"],
    popularSpots: "Samora Avenue, Ohio St, Posta Mpya, Azikiwe, Bank Towers",
    available: true,
  },
  {
    id: "upanga",
    name: "Upanga (Mashariki & Magharibi)",
    swahiliName: "Upanga",
    distanceKm: 1.9,
    estimatedTimeMin: "15 - 20 mins",
    tier: "tier1",
    coordinates: { x: 50, y: 38 },
    landmarks: ["United Nations Rd", "Malik Rd", "Al-Muntazir", "Mfaume St", "Fire"],
    popularSpots: "UN Road, Olympic, Diamond Jubilee, Aga Khan, Mindu St",
    available: true,
  },
  {
    id: "ilala",
    name: "Ilala",
    swahiliName: "Ilala Boma & Karume",
    distanceKm: 2.8,
    estimatedTimeMin: "18 - 25 mins",
    tier: "tier1",
    coordinates: { x: 32, y: 64 },
    landmarks: ["Amana Hospital", "Uhuru St", "Karume Stadium", "Ilala Boma", "Bungoni"],
    popularSpots: "Amana, Boma, Uhuru St, Shariff Shamba, Mchikichini",
    available: true,
  },
  {
    id: "magomeni",
    name: "Magomeni",
    swahiliName: "Magomeni (Mapipa, Kagera & Morocco)",
    distanceKm: 3.9,
    estimatedTimeMin: "20 - 30 mins",
    tier: "tier2",
    coordinates: { x: 26, y: 36 },
    landmarks: ["Mapipa BRT", "Morogoro Rd", "Kagera", "Makanya", "Mikumi"],
    popularSpots: "Morogoro Road, Mapipa, Magomeni Hospital, Usalama, Kagera",
    available: true,
  },
  {
    id: "kisutu",
    name: "Kisutu & Gerezani",
    swahiliName: "Kisutu",
    distanceKm: 0.6,
    estimatedTimeMin: "10 - 15 mins",
    tier: "tier1",
    coordinates: { x: 48, y: 54 },
    landmarks: ["Kisutu Market", "Zanaki St", "Indira Gandhi St", "Jamhuri St"],
    popularSpots: "Zanaki Street, Mosque St, City Mall, Bandari",
    available: true,
  },
  {
    id: "kivukoni",
    name: "Kivukoni & Ferry",
    swahiliName: "Kivukoni",
    distanceKm: 2.2,
    estimatedTimeMin: "15 - 22 mins",
    tier: "tier1",
    coordinates: { x: 68, y: 62 },
    landmarks: ["Magogoni Ferry", "State House Area", "Ocean Road", "Gymkhana"],
    popularSpots: "Fish Market, Ocean Road, Kivukoni Front, Hyatt Area",
    available: true,
  },
  {
    id: "muhimbili",
    name: "Muhimbili & Jangwani",
    swahiliName: "Muhimbili / Jangwani",
    distanceKm: 2.3,
    estimatedTimeMin: "15 - 22 mins",
    tier: "tier1",
    coordinates: { x: 38, y: 44 },
    landmarks: ["MNH Hospital", "Jangwani Valley", "Morogoro Rd BRT", "MUHAS"],
    popularSpots: "Muhimbili National Hospital, MUHAS Campus, Jangwani",
    available: true,
  },
  {
    id: "kinondoni",
    name: "Kinondoni & Hananasif",
    swahiliName: "Kinondoni",
    distanceKm: 5.2,
    estimatedTimeMin: "25 - 35 mins",
    tier: "tier2",
    coordinates: { x: 38, y: 22 },
    landmarks: ["Kinondoni B", "Manyanya", "Hananasif", "Studio", "Morocco"],
    popularSpots: "Kinondoni Road, Boma, Studio, Biafra Grounds",
    available: true,
  },
];

export default function DeliveryRadiusMap({
  compact = false,
  showTitle = true,
}: {
  compact?: boolean;
  showTitle?: boolean;
}) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>("kariakoo");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTier, setActiveTier] = useState<"all" | "tier1" | "tier2">("all");

  const selectedZone = useMemo(() => {
    return (
      DELIVERY_ZONES.find((z) => z.id === selectedZoneId) || DELIVERY_ZONES[0]
    );
  }, [selectedZoneId]);

  // Search filter
  const filteredZones = useMemo(() => {
    return DELIVERY_ZONES.filter((zone) => {
      const matchesSearch =
        zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.swahiliName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.landmarks.some((l) =>
          l.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        zone.popularSpots.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTier =
        activeTier === "all" ? true : zone.tier === activeTier;

      return matchesSearch && matchesTier;
    });
  }, [searchQuery, activeTier]);

  return (
    <div className="w-full space-y-5" id="delivery-radius-section">
      {/* ─── SECTION TITLE & DESCRIPTION ───────────────────────────────────── */}
      {showTitle && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/80 pb-3.5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0062C3]/10 text-[#0062C3] text-[11px] font-bold uppercase tracking-wider mb-1">
              <Navigation className="w-3 h-3" />
              <span>Eneo Letu la Uwasilishaji (Delivery Coverage)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kufikia Popote Ulipo City Center na Viunga Vyake
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mt-0.5">
              Jiko letu lipo katikati ya jiji. Tunakuletea chakula moto, safi na kitamu ndani ya dakika 15–30 kupitia madereva wetu wa haraka.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Uwasilishaji Unafanyika Sasa</span>
            </span>
          </div>
        </div>
      )}

      {/* ─── LIVE COVERAGE SEARCH & TIER FILTER ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tafuta eneo lako (mf. Kariakoo, Upanga, Ilala, Magomeni, Posta, Msimbazi)..."
            className="w-full bg-white border border-slate-300 focus:border-[#0062C3] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Futa
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTier("all")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTier === "all"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Maeneo Yote ({DELIVERY_ZONES.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTier("tier1")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTier === "tier1"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            City Center Core (0-3 km)
          </button>
          <button
            type="button"
            onClick={() => setActiveTier("tier2")}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              activeTier === "tier2"
                ? "bg-[#0062C3] text-white shadow-2xs"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Mzunguko wa 3-6 km
          </button>
        </div>
      </div>

      {/* ─── INTERACTIVE MAP & DETAILS GRID ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* LEFT / TOP (lg: 7 cols): Custom Interactive SVG Cartographic Map Display */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 text-white relative overflow-hidden shadow-lg">
          {/* Subtle Grid & Compass Background */}
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#3B82F6_1px,transparent_1px)] [background-size:16px_16px]"></div>

          {/* Map Header */}
          <div className="flex items-center justify-between relative z-10 mb-3 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Dar es Salaam City Center Radar
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#0062C3]"></span> Jiko Letu
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Ndani ya Radius
              </span>
            </div>
          </div>

          {/* Interactive Map Canvas Container */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2 select-none">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full text-slate-400 transition-all duration-300"
            >
              {/* Radar Radii Circles */}
              {/* Radius Tier 3 (Extended: ~6-8km) */}
              <circle
                cx="48"
                cy="50"
                r="44"
                fill="none"
                stroke="#1E293B"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text x="50" y="8" fill="#475569" fontSize="2.8" textAnchor="middle" fontFamily="monospace">
                Radius 6km (Extended Coverage)
              </text>

              {/* Radius Tier 2 (Core Zone: ~4km - Magomeni / Ilala) */}
              <circle
                cx="48"
                cy="50"
                r="30"
                fill="#0062C3"
                fillOpacity="0.04"
                stroke="#0284C7"
                strokeWidth="0.8"
                strokeOpacity="0.4"
                strokeDasharray="3,3"
              />
              <text x="50" y="22" fill="#0284C7" fontSize="2.5" textAnchor="middle" fontFamily="monospace">
                Radius 4km (Upanga, Magomeni, Ilala)
              </text>

              {/* Radius Tier 1 (Fast Dispatch: ~2km - Kariakoo & Posta) */}
              <circle
                cx="48"
                cy="50"
                r="16"
                fill="#10B981"
                fillOpacity="0.08"
                stroke="#10B981"
                strokeWidth="1.2"
                strokeOpacity="0.6"
              />
              <text x="48" y="36" fill="#10B981" fontSize="2.5" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                Radius 2km (10-15 Min Express)
              </text>

              {/* Coastline / Indian Ocean Indicator (East side) */}
              <path
                d="M 78 0 Q 72 30 75 60 T 95 100 L 100 100 L 100 0 Z"
                fill="#0F172A"
                opacity="0.7"
              />
              <text x="88" y="40" fill="#334155" fontSize="3" fontWeight="bold" transform="rotate(70, 88, 40)">
                INDIAN OCEAN
              </text>

              {/* Main Arterial Road Lines (Abstracted Roads) */}
              {/* Morogoro Road */}
              <line x1="10" y1="30" x2="48" y2="50" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
              <text x="22" y="32" fill="#64748B" fontSize="2" transform="rotate(25, 22, 32)">Morogoro Rd</text>

              {/* Ali Hassan Mwinyi Rd (North to Posta) */}
              <line x1="45" y1="10" x2="58" y2="56" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
              <text x="48" y="24" fill="#64748B" fontSize="2" transform="rotate(70, 48, 24)">A.H. Mwinyi Rd</text>

              {/* Uhuru Street (Ilala to Kariakoo) */}
              <line x1="15" y1="75" x2="48" y2="50" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />
              <text x="25" y="68" fill="#64748B" fontSize="2" transform="rotate(-30, 25, 68)">Uhuru St</text>

              {/* Samora & Sokoine Drive */}
              <line x1="48" y1="50" x2="72" y2="60" stroke="#334155" strokeWidth="1.2" strokeLinecap="round" />

              {/* Dynamic Connecting Line to Selected Zone */}
              {selectedZone && (
                <line
                  x1="48"
                  y1="50"
                  x2={selectedZone.coordinates.x}
                  y2={selectedZone.coordinates.y}
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                  className="animate-pulse"
                />
              )}

              {/* Central Restaurant Pin (Origin Kitchen) */}
              <g transform="translate(48, 50)">
                <circle r="6" fill="#0062C3" opacity="0.3" className="animate-ping" />
                <circle r="3.5" fill="#0062C3" stroke="#FFFFFF" strokeWidth="1" />
                <circle r="1.5" fill="#FFFFFF" />
              </g>
              <text x="48" y="56" fill="#60A5FA" fontSize="2.8" textAnchor="middle" fontWeight="bold">
                JIKO LETU (Hub)
              </text>

              {/* Render Zone Pins */}
              {DELIVERY_ZONES.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                return (
                  <g
                    key={zone.id}
                    transform={`translate(${zone.coordinates.x}, ${zone.coordinates.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedZoneId(zone.id)}
                  >
                    {/* Pulsing ring if selected */}
                    {isSelected && (
                      <circle r="5.5" fill="#10B981" opacity="0.4" className="animate-ping" />
                    )}

                    {/* Zone Pin Circle */}
                    <circle
                      r={isSelected ? 3.5 : 2.5}
                      fill={isSelected ? "#10B981" : "#38BDF8"}
                      stroke="#FFFFFF"
                      strokeWidth={isSelected ? 1 : 0.6}
                      className="transition-all duration-200 group-hover:scale-125"
                    />

                    {/* Pin Label */}
                    <text
                      x="0"
                      y={zone.coordinates.y > 60 ? -4 : 6}
                      fill={isSelected ? "#34D399" : "#E2E8F0"}
                      fontSize={isSelected ? "3.2" : "2.6"}
                      fontWeight={isSelected ? "bold" : "normal"}
                      textAnchor="middle"
                      className="transition-all duration-200"
                    >
                      {zone.name.split("/")[0].split("(")[0].trim()}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Floating Map Legend Indicator */}
            <div className="absolute bottom-2 left-2 bg-slate-900/90 backdrop-blur-xs border border-slate-800 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Gusa eneo lolote kwenye ramani kuona muda na maelezo</span>
            </div>
          </div>

          {/* Quick Zone Chips Under Map */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DELIVERY_ZONES.map((zone) => {
              const isSelected = zone.id === selectedZoneId;
              return (
                <button
                  key={zone.id}
                  onClick={() => setSelectedZoneId(zone.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 shadow-xs"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  <span>{zone.name.split("/")[0].split("(")[0].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT / BOTTOM (lg: 5 cols): Selected Zone Card & Direct Delivery Specs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Zone Deep Dive Card */}
          <div className="bg-white border-2 border-[#0062C3]/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0062C3] block">
                  Eneo Lililochaguliwa
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {selectedZone.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {selectedZone.swahiliName}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Huduma Ipo</span>
                </span>
              </div>
            </div>

            {/* Delivery Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#0062C3]" />
                  <span>Muda wa Kufika</span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  {selectedZone.estimatedTimeMin}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mb-1">
                  <Bike className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Umbali Kutoka Jikoni</span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  ~{selectedZone.distanceKm} km
                </div>
              </div>
            </div>

            {/* Popular Landmarks / Streets Covered */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#0062C3]" />
                <span>Mitaa na Vituo Vinavyohudumiwa:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedZone.landmarks.map((spot, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700"
                  >
                    {spot}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 italic pt-1">
                Spot maarufu: {selectedZone.popularSpots}
              </p>
            </div>

            {/* Flat Delivery Guarantee */}
            <div className="bg-[#EBF4FF] border border-[#0062C3]/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#004B93]">
              <ShieldCheck className="w-4 h-4 text-[#0062C3] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Gharama ya Uwasilishaji: TZS 2,500 tu</span>
                <span className="text-[11px] text-slate-600">
                  Chakula kinafungwa vizuri kwenye vyombo maalum vya kuhifadhi joto (thermal packaging) na kukabidhiwa mlangoni pako.
                </span>
              </div>
            </div>

            {/* CTA Order Now Button */}
            <Link
              href={`/order?area=${encodeURIComponent(selectedZone.name)}`}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0062C3] hover:bg-[#004B93] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-98"
            >
              <span>Agiza Chakula Kifikishwe {selectedZone.name.split("/")[0].split("(")[0].trim()}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Quick Zone Directory List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
              <span>Orodha ya Maeneo Yote ({filteredZones.length})</span>
              <span className="text-[11px] text-slate-400 font-normal">Gusa kuchagua</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {filteredZones.map((zone) => {
                const isSelected = zone.id === selectedZoneId;
                return (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-[#EBF4FF] text-[#0062C3] font-bold border border-[#0062C3]/30"
                        : "hover:bg-slate-50 text-slate-700 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#0062C3]" : "text-slate-400"}`} />
                      <span className="truncate">{zone.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0">
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
