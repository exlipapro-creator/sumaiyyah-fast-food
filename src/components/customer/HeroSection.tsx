"use client";

import React from "react";
import SteamOverlay from "./SteamOverlay";

interface HeroSectionProps {
  onPlateClick?: () => void;
  dishName?: string;
}

export function HeroSection({ onPlateClick, dishName = "Hot Chips Mayai & Mishkaki" }: HeroSectionProps) {
  return (
    <section className="relative flex flex-col items-center justify-center pt-4 sm:pt-6 pb-2 sm:pb-4 px-4 overflow-hidden select-none">
      {/* 1. Subtle Ambient Radial Glow */}
      <div
        aria-hidden="true"
        className="absolute w-64 h-64 sm:w-80 sm:h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none -top-4"
      />

      {/* 2. Interactive Plate Container */}
      <div
        onClick={onPlateClick}
        role="button"
        tabIndex={0}
        aria-label={`Featured Sizzle: ${dishName}. Tap to order.`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPlateClick?.();
          }
        }}
        className="relative z-10 w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 transition-transform duration-300 active:scale-95 cursor-pointer group focus:outline-none"
      >
        {/* Continuous Steam Effect */}
        <SteamOverlay />

        {/* Isolated Food Dish with Soft Natural Ambient Drop-Shadow */}
        <img
          src="/assets/hero-plate.jpg"
          alt={dishName}
          width={320}
          height={320}
          loading="eager"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-full filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.22)] transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>

      {/* 3. Micro-Caption Text */}
      <p className="mt-2.5 text-[11px] sm:text-xs tracking-[0.25em] uppercase font-bold text-slate-400">
        Hot for you
      </p>
    </section>
  );
}

export default HeroSection;
