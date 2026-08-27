"use client";

import { useEffect, useState, useCallback } from "react";

export interface HeaderTickerPayload {
  is_open: boolean;
  status_label: "LIVE" | "CLOSED";
  default_fallback_text: string;
  opening_time: string;
  closing_time: string;
  timezone: string;
  is_manual_override: boolean;
  manual_status: "OPEN" | "CLOSED";
  current_local_time: string;
  promotions_enabled: boolean;
  promotions_count: number;
  announcements: {
    id: string;
    text: string;
    highlight?: string | null;
    priority: number;
    is_active: boolean;
    start_time?: string | null;
    end_time?: string | null;
  }[];
}

const DEFAULT_FALLBACK: HeaderTickerPayload = {
  is_open: true,
  status_label: "LIVE",
  default_fallback_text: "Top Kitchen Live — Fresh Meals & Juices Delivered Daily across Dar es Salaam",
  opening_time: "08:00:00",
  closing_time: "23:00:00",
  timezone: "Africa/Dar_es_Salaam",
  is_manual_override: false,
  manual_status: "OPEN",
  current_local_time: "12:00:00",
  promotions_enabled: false,
  promotions_count: 0,
  announcements: [
    {
      id: "ann_1",
      text: "TOP KITCHEN LIVE: Grill & Tandoori Wazi Sasa",
      highlight: "Moto & Safi",
      priority: 1,
      is_active: true,
    },
    {
      id: "ann_2",
      text: "Express Bike Delivery: Kariakoo, Posta, Upanga, Ilala & Kisutu",
      highlight: "10-25 Mins",
      priority: 2,
      is_active: true,
    },
    {
      id: "ann_3",
      text: "Jiko Hours: 8:00 AM – 11:00 PM Kila Siku",
      highlight: "Dar es Salaam CBD",
      priority: 3,
      is_active: true,
    },
    {
      id: "ann_4",
      text: "Corporate Office Catering & Lunch Subsidy Accounts",
      highlight: "B2B Portal Active",
      priority: 4,
      is_active: true,
    },
  ],
};

export function useHeaderTicker() {
  const [tickerData, setTickerData] = useState<HeaderTickerPayload>(DEFAULT_FALLBACK);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTickerData = useCallback(async () => {
    try {
      const res = await fetch("/api/public/ticker", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.is_open === "boolean") {
          setTickerData(data);
        }
      }
    } catch (err) {
      console.warn("useHeaderTicker: fallback active", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickerData();

    // Refresh every 25 seconds for synchronized store hours and announcements
    const interval = setInterval(fetchTickerData, 25000);

    // Refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchTickerData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchTickerData]);

  return { tickerData, isLoading, refetch: fetchTickerData };
}
