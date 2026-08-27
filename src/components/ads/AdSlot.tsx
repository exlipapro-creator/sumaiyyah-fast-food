"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sparkles, ExternalLink } from "lucide-react";

interface DirectCampaign {
  id: number;
  placement_key: string;
  sponsor_name: string;
  banner_image_url: string;
  destination_url: string;
  alt_text: string;
}

interface AdSenseConfig {
  enabled: boolean;
  clientId: string;
  slots: {
    top: string;
    infeed: string;
    sidebar: string;
  };
}

interface AdSlotProps {
  placement: "home_hero_top" | "menu_infeed" | "order_confirmation" | "deals_top";
  className?: string;
}

export default function AdSlot({ placement, className = "" }: AdSlotProps) {
  const [directCampaign, setDirectCampaign] = useState<DirectCampaign | null>(null);
  const [adsenseConfig, setAdsenseConfig] = useState<AdSenseConfig | null>(null);
  const [directAdsEnabled, setDirectAdsEnabled] = useState(true);
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAd() {
      try {
        const res = await fetch(`/api/public/ads?placement=${placement}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        setDirectCampaign(data.directCampaign || null);
        setAdsenseConfig(data.adsense || null);
        setDirectAdsEnabled(data.directAdsEnabled !== false);
      } catch (e) {
        console.error("Ad slot load error:", e);
      }
    }
    loadAd();
    return () => {
      isMounted = false;
    };
  }, [placement]);

  // Track impression when direct campaign is visible in viewport
  useEffect(() => {
    if (!directCampaign || hasTrackedImpression || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression) {
            setHasTrackedImpression(true);
            try {
              fetch("/api/public/ads/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  campaign_id: directCampaign.id,
                  event_type: "impression",
                }),
              }).catch(() => {});
            } catch (e) {
              // Ignore tracking errors
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [directCampaign, hasTrackedImpression]);

  const handleCampaignClick = () => {
    if (!directCampaign) return;
    try {
      fetch("/api/public/ads/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: directCampaign.id,
          event_type: "click",
        }),
      }).catch(() => {});
    } catch (e) {
      // Ignore tracking errors
    }
  };

  // 1. Direct Sponsored Campaign Active
  if (directAdsEnabled && directCampaign) {
    return (
      <div
        ref={containerRef}
        id={`ad-slot-${placement}`}
        className={`w-full overflow-hidden transition-all ${className}`}
      >
        <div className="relative group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow">
          <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            <span>Tangazo / Sponsored</span>
          </div>

          <a
            href={directCampaign.destination_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleCampaignClick}
            className="block relative w-full overflow-hidden"
          >
            <img
              src={directCampaign.banner_image_url}
              alt={directCampaign.alt_text || directCampaign.sponsor_name}
              className="w-full max-h-[160px] sm:max-h-[200px] object-cover hover:scale-[1.01] transition-transform duration-300"
            />
          </a>

          <div className="px-3.5 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-[300px]">
              {directCampaign.sponsor_name}
            </span>
            <Link
              href="/advertise"
              className="inline-flex items-center gap-1 text-[#0062C3] hover:underline font-bold text-[10px] shrink-0"
            >
              <span>Tangaza Nasi</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Google AdSense Slot Active
  const slotId =
    placement === "home_hero_top"
      ? adsenseConfig?.slots.top
      : placement === "menu_infeed"
      ? adsenseConfig?.slots.infeed
      : adsenseConfig?.slots.sidebar;

  if (adsenseConfig?.enabled && adsenseConfig?.clientId && slotId) {
    return (
      <div id={`ad-slot-adsense-${placement}`} className={`w-full overflow-hidden my-3 ${className}`}>
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-2 text-center">
          <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Advertisement</div>
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={adsenseConfig.clientId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    );
  }

  // If no direct sponsor and no AdSense configured, collapse cleanly
  return null;
}
