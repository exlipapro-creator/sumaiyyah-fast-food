"use client";

import React from "react";

export function SteamOverlay() {
  return (
    <div
      aria-hidden="true"
      className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 w-44 sm:w-56 h-32 sm:h-40 pointer-events-none z-20 overflow-visible flex items-center justify-center"
    >
      <svg
        viewBox="0 0 200 140"
        className="w-full h-full filter blur-[1.5px]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Steam Wisp 1 */}
        <path
          d="M75 120 C 65 95, 90 70, 78 40 C 70 20, 85 10, 80 0"
          stroke="url(#steam-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          className="animate-steam-1 opacity-70"
        />

        {/* Steam Wisp 2 (Center-Right) */}
        <path
          d="M110 125 C 122 95, 98 65, 112 35 C 120 15, 108 5, 115 0"
          stroke="url(#steam-gradient)"
          strokeWidth="12"
          strokeLinecap="round"
          className="animate-steam-2 opacity-65"
        />

        {/* Steam Wisp 3 (Left-Center) */}
        <path
          d="M92 130 C 80 100, 105 75, 95 45 C 88 25, 98 12, 94 0"
          stroke="url(#steam-gradient-soft)"
          strokeWidth="8"
          strokeLinecap="round"
          className="animate-steam-3 opacity-60"
        />

        {/* Subtle Ambient Steam Cloud */}
        <ellipse
          cx="100"
          cy="90"
          rx="45"
          ry="18"
          fill="url(#steam-radial)"
          className="animate-steam-1 opacity-40 filter blur-md"
        />

        <defs>
          <linearGradient id="steam-gradient" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#fed7aa" stopOpacity="0.45" />
            <stop offset="85%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="steam-gradient-soft" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#ffedd5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="steam-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#fed7aa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export default SteamOverlay;
