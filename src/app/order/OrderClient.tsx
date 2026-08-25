"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatTSH } from "@/lib/money";
import type { PublicCategory, PublicMenuItem } from "./page";
import {
  metaFor,
  emojiFor,
  kitchenStatusFor,
  unitsLeftFor,
  relatedItems,
  type Availability,
} from "./itemMeta";

// WhatsApp number orders are sent to (international format, no "+"/spaces).
const WHATSAPP_NUMBER = "255700000000";
// How often the customer page re-pulls the live POS menu (ms).
const SYNC_INTERVAL = 20000;

// Rotating hero headlines (ask 3). Each renders with a smooth fade.
const HERO_PHRASES = [
  "Taste the Streets of Bongo",
  "Fresh Every Morning",
  "Cooked Live",
  "Order in Seconds",
  "Made by Local Chefs",
  "Karibu Sumaiyyah",
];

// Quick filters (ask 12).
type QuickFilter = "popular" | "ready" | "veg" | "spicy" | "available";

// Static customer testimonials (ask 16).
const REVIEWS = [
  { id: 1, name: "Hassan M.", stars: 5, quote: "Best pilau in Kariakoo, hands down. Always hot and fresh." },
  { id: 2, name: "Neema K.", stars: 5, quote: "Food arrives hot every single time. My family orders weekly." },
  { id: 3, name: "Juma R.", stars: 4, quote: "Fast pickup and friendly staff. The chicken is incredible." },
];

interface CartEntry {
  item: PublicMenuItem;
  qty: number;
}

// ── Animated count-up number (ask 4 & 21) ────────────────────────────────────
function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1300,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  const shown = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <>{shown}</>;
}

const AVAIL_CLASS: Record<Availability, string> = {
  Available: "avail-ok",
  "Few Left": "avail-few",
  Cooking: "avail-cooking",
};

export default function OrderClient({
  initialCategories,
  initialItems,
}: {
  initialCategories: PublicCategory[];
  initialItems: PublicMenuItem[];
}) {
  const [categories, setCategories] = useState<PublicCategory[]>(initialCategories);
  const [items, setItems] = useState<PublicMenuItem[]>(initialItems);
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QuickFilter | null>(null);
  const [cart, setCart] = useState<Record<number, CartEntry>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<PublicMenuItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [poppedId, setPoppedId] = useState<number | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(() => Date.now());
  const [lastSyncAt, setLastSyncAt] = useState<number>(() => Date.now());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // ── Live sync with the POS database ──
  const syncMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/public/menu", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.items) && Array.isArray(data.categories)) {
        setItems(data.items);
        setCategories(data.categories);
        setLastSyncAt(Date.now());
      }
    } catch {
      /* offline / transient: keep showing last known menu */
    }
  }, []);

  useEffect(() => {
    const id = setInterval(syncMenu, SYNC_INTERVAL);
    const onVisible = () => { if (document.visibilityState === "visible") syncMenu(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncMenu]);

  // Briefly show skeletons on first client paint, then reveal the live menu.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, []);

  // Rotate the hero headline (ask 3).
  useEffect(() => {
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_PHRASES.length), 3000);
    return () => clearInterval(id);
  }, []);

  // 1s ticker powering the "updated Ns ago" live indicators (ask 1 & 20).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Drop cart entries whose item was removed/deactivated in the POS.
  useEffect(() => {
    setCart((prev) => {
      const valid = new Set(items.map((i) => i.id));
      const next: Record<number, CartEntry> = {};
      let changed = false;
      for (const [id, entry] of Object.entries(prev)) {
        const nid = Number(id);
        if (valid.has(nid)) {
          const fresh = items.find((i) => i.id === nid)!;
          next[nid] = { item: fresh, qty: entry.qty };
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }

  function addItem(item: PublicMenuItem) {
    if (!item.in_stock) {
      showToast(`😔 ${item.name} is sold out`);
      return;
    }
    setCart((prev) => {
      const cur = prev[item.id];
      return { ...prev, [item.id]: { item, qty: (cur?.qty ?? 0) + 1 } };
    });
    setPoppedId(item.id);
    setTimeout(() => setPoppedId(null), 360);
    showToast(`${emojiFor(item)} ${item.name} added`);
  }

  function decItem(id: number) {
    setCart((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      if (cur.qty <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: { ...cur, qty: cur.qty - 1 } };
    });
  }

  const cartEntries = Object.values(cart);
  const totalItems = cartEntries.reduce((a, c) => a + c.qty, 0);
  const totalPrice = cartEntries.reduce((a, c) => a + c.item.price_tsh * c.qty, 0);

  // Precompute metadata once per item list.
  const metaById = useMemo(() => {
    const m = new Map<number, ReturnType<typeof metaFor>>();
    for (const it of items) m.set(it.id, metaFor(it));
    return m;
  }, [items]);

  const itemsPerCat = useMemo(() => {
    const m = new Map<number, number>();
    for (const it of items) m.set(it.category_id, (m.get(it.category_id) ?? 0) + 1);
    return m;
  }, [items]);

  // Average kitchen wait + cooking count for the live kitchen widget (ask 1).
  const avgWait = useMemo(() => {
    if (items.length === 0) return 12;
    const total = items.reduce((a, it) => a + (metaById.get(it.id)?.prepMin ?? 10), 0);
    return Math.max(6, Math.round(total / items.length));
  }, [items, metaById]);
  const mealsCooking = 8 + items.length;
  const secondsAgo = Math.max(0, Math.floor((now - lastSyncAt) / 1000));

  // Apply category → filter → search, in that order.
  const visibleItems = useMemo(() => {
    let list = activeCat === "all" ? items : items.filter((i) => i.category_id === activeCat);
    if (filter) {
      list = list.filter((i) => {
        const m = metaById.get(i.id);
        if (!m) return false;
        return m.tags[filter];
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category_name.toLowerCase().includes(q) ||
          (metaById.get(i.id)?.description.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [activeCat, filter, search, items, metaById]);

  const specials = useMemo(() => items.slice(0, Math.min(3, items.length)), [items]);

  function openSheet() {
    setSuccess(false);
    setConfetti(false);
    setOrderError("");
    setSheetOpen(true);
  }
  function closeSheet() {
    setSheetOpen(false);
  }
  function focusSearch() {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => searchRef.current?.focus(), 260);
  }

  function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setOrderError("");
    if (cartEntries.length === 0) {
      setOrderError("Your cart is empty. Add some food first.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setOrderError("Please enter your name and phone number.");
      return;
    }
    setSubmitting(true);
    const lines = cartEntries
      .map((c) => `• ${c.item.name} x${c.qty} = ${formatTSH(c.item.price_tsh * c.qty)}`)
      .join("%0A");
    const msg =
      `*NEW ORDER - Sumaiyyah Fast Food*%0A%0A` +
      `*Name:* ${encodeURIComponent(name.trim())}%0A` +
      `*Phone:* ${encodeURIComponent(phone.trim())}%0A%0A` +
      `*Order:*%0A${lines}%0A%0A` +
      `*TOTAL: ${formatTSH(totalPrice)}*` +
      (note.trim() ? `%0A%0A*Note:* ${encodeURIComponent(note.trim())}` : "");
    setTimeout(() => {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank", "noopener");
      setCart({});
      setName("");
      setPhone("");
      setNote("");
      setSuccess(true);
      setConfetti(true);
      setSubmitting(false);
      showToast("🎉 Order sent via WhatsApp!");
      setTimeout(() => setConfetti(false), 3200);
    }, 600);
  }

  const heroPhrase = HERO_PHRASES[heroIdx];

  return (
    <div className="sff" data-testid="landing-page">
      {/* TOP BAR — Uber-Eats-style: logo · location · search · cart · profile (ask 5) */}
      <header className="sff-topbar">
        <a href="/order" className="sff-logo">Sumaiyyah<span>.</span></a>
        <button className="sff-loc" data-testid="landing-header-location" onClick={focusSearch} aria-label="Current location">
          <span className="sff-loc-pin" aria-hidden="true">📍</span>
          <span className="sff-loc-text">Kariakoo, Dar</span>
          <span className="sff-loc-caret" aria-hidden="true">▾</span>
        </button>
        <div className="sff-top-actions">
          <button className="sff-icon-btn" data-testid="landing-header-search" onClick={focusSearch} aria-label="Search dishes">🔍</button>
          <button className="sff-icon-btn" data-testid="landing-header-cart" onClick={openSheet} aria-label="View cart">
            🛒{totalItems > 0 && <span className="sff-icon-badge">{totalItems}</span>}
          </button>
          <a className="sff-icon-btn" data-testid="landing-header-profile" href="/login" aria-label="Profile / staff login">👤</a>
          <a href="/login" className="sff-staff-link" data-testid="landing-staff-link">Staff</a>
        </div>
      </header>

      {/* HERO */}
      <section className="sff-hero">
        <span className="sff-blob sff-blob-1" aria-hidden="true" />
        <span className="sff-blob sff-blob-2" aria-hidden="true" />
        <span className="sff-blob sff-blob-3" aria-hidden="true" />

        {/* Subtle floating ingredients / steam particles (ask 2) */}
        <div className="sff-particles" data-testid="landing-particles" aria-hidden="true">
          <span className="sff-particle p1">🌶️</span>
          <span className="sff-particle p2">🌿</span>
          <span className="sff-particle p3">✨</span>
          <span className="sff-particle p4">🧄</span>
          <span className="sff-particle p5">💨</span>
          <span className="sff-particle p6">🥄</span>
          <span className="sff-particle p7">🌾</span>
        </div>

        {/* Existing orbiting-food ring animation — preserved */}
        <div className="sff-ring" aria-hidden="true">
          <span className="sff-orbit">🍢</span>
          <span className="sff-orbit">🌶️</span>
          <span className="sff-orbit">🍖</span>
          <span className="sff-orbit">🍚</span>
        </div>

        <div className="sff-hero-content">
          <div className="sff-badge">📍 Kariakoo, Dar es Salaam</div>
          <h1 className="sff-title">
            <span key={heroIdx} className="sff-rotator" data-testid="landing-hero-rotator">
              {heroPhrase}
            </span>
            <span className="sff-title-flame"> 🔥</span>
          </h1>
          <p className="sff-sub">
            Authentic Swahili street food, hot and fresh. Our menu updates live from the
            kitchen counter, so what you see is what is cooking right now.
          </p>

          {/* Live kitchen status widget (ask 1) */}
          <div className="sff-kitchen" data-testid="landing-kitchen-status">
            <div className="sff-kitchen-head">
              <span className="sff-kitchen-dot" aria-hidden="true" />
              <span className="sff-kitchen-title">Kitchen Live</span>
              <span className="sff-kitchen-updated" data-testid="landing-kitchen-updated">
                updated {secondsAgo}s ago
              </span>
            </div>
            <div className="sff-kitchen-metrics">
              <div className="sff-kitchen-metric">
                <span className="sff-kitchen-num" data-testid="landing-kitchen-cooking">{mealsCooking}</span>
                <span className="sff-kitchen-lbl">meals cooking</span>
              </div>
              <div className="sff-kitchen-metric">
                <span className="sff-kitchen-num" data-testid="landing-kitchen-wait">{avgWait} min</span>
                <span className="sff-kitchen-lbl">average wait</span>
              </div>
            </div>
          </div>

          {/* CTA hierarchy: large filled primary + lighter secondary (ask 6) */}
          <div className="sff-cta-row">
            <button
              className="sff-btn-primary"
              data-testid="landing-hero-order"
              onClick={() =>
                document.getElementById("landing-menu-section")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              🍽 Order Now
            </button>
            <button className="sff-btn-ghost" data-testid="landing-hero-secondary" onClick={openSheet}>
              {totalItems > 0 ? "Track Order" : "View Cart"}
            </button>
          </div>
        </div>
        <svg className="sff-wave" viewBox="0 0 390 56" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,28 C80,56 160,0 260,28 C320,44 360,14 390,28 L390,56 L0,56 Z" fill="var(--gray-100)" />
        </svg>
      </section>

      {/* SOCIAL PROOF with animated counters (ask 4) */}
      <section className="sff-social" data-testid="landing-social-proof">
        <div className="sff-social-item">
          <div className="sff-social-num sff-star" data-testid="landing-proof-rating">
            <AnimatedNumber value={4.9} decimals={1} />★
          </div>
          <div className="sff-social-lbl">Rating</div>
        </div>
        <div className="sff-social-item">
          <div className="sff-social-num" data-testid="landing-proof-orders">
            <AnimatedNumber value={2400} />+
          </div>
          <div className="sff-social-lbl">Orders</div>
        </div>
        <div className="sff-social-item">
          <div className="sff-social-num" data-testid="landing-proof-returning">
            <AnimatedNumber value={1300} />
          </div>
          <div className="sff-social-lbl">Returning</div>
        </div>
        <div className="sff-social-item">
          <div className="sff-social-num" data-testid="landing-proof-recommend">
            <AnimatedNumber value={98} />%
          </div>
          <div className="sff-social-lbl">Recommend</div>
        </div>
      </section>

      {/* TRUST BAR (ask 20) */}
      <section className="sff-trust" data-testid="landing-trust">
        <span className="sff-trust-chip open">🟢 Open now</span>
        <span className="sff-trust-chip">⏱ Avg pickup {avgWait} min</span>
        <span className="sff-trust-chip" data-testid="landing-trust-updated">🔄 Menu updated {secondsAgo}s ago</span>
        <span className="sff-trust-chip">💳 Cash · M-Pesa · Tigo · Airtel</span>
        <span className="sff-trust-chip halal">✔ Halal certified</span>
      </section>

      {/* MENU */}
      <main id="landing-menu-section">
        <section className="sff-section">
          <div className="sff-section-head">
            <div>
              <span className="sff-section-tag">What are you craving?</span>
              <h2 className="sff-section-title">Live <span>Menu</span></h2>
            </div>
            <span className="sff-live" data-testid="landing-live-badge">
              <span className="sff-live-dot" aria-hidden="true" />
              Synced with kitchen
            </span>
          </div>
        </section>

        {/* STICKY SEARCH (ask 11) */}
        <div className="sff-search-wrap">
          <div className="sff-search-box">
            <span className="sff-search-icon" aria-hidden="true">🔍</span>
            <input
              ref={searchRef}
              className="sff-search"
              data-testid="landing-search"
              type="search"
              placeholder="Search dishes… e.g. Pilau, Chicken, Chips"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search dishes"
            />
            {search && (
              <button className="sff-search-clear" onClick={() => setSearch("")} aria-label="Clear search">✕</button>
            )}
          </div>

          {/* QUICK FILTERS (ask 12) */}
          <div className="sff-filters" role="group" aria-label="Quick filters">
            {([
              ["popular", "🔥 Popular"],
              ["ready", "⚡ Ready in 10 min"],
              ["veg", "🌿 Vegetarian"],
              ["spicy", "🌶️ Spicy"],
              ["available", "✅ Available now"],
            ] as [QuickFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                className={`sff-filter ${filter === key ? "active" : ""}`}
                data-testid={`landing-filter-${key}`}
                aria-pressed={filter === key}
                onClick={() => setFilter((f) => (f === key ? null : key))}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* CATEGORY TABS with counts (ask 13) */}
        <div className="sff-cats" role="tablist" aria-label="Menu categories">
          <button
            className={`sff-pill ${activeCat === "all" ? "active" : ""}`}
            data-testid="landing-cat-all"
            onClick={() => setActiveCat("all")}
            role="tab"
            aria-selected={activeCat === "all"}
          >
            🍽 All <span className="sff-pill-count" data-testid="landing-cat-count-all">{items.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`sff-pill ${activeCat === c.id ? "active" : ""}`}
              data-testid={`landing-cat-${c.id}`}
              onClick={() => setActiveCat(c.id)}
              role="tab"
              aria-selected={activeCat === c.id}
            >
              {c.name}{" "}
              <span className="sff-pill-count" data-testid={`landing-cat-count-${c.id}`}>
                {itemsPerCat.get(c.id) ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* SKELETON LOADERS (ask 21) — present in the DOM, shown only while loading */}
        <div className={`sff-skeletons ${loading ? "show" : ""}`} data-testid="landing-skeleton" aria-hidden={!loading}>
          {[0, 1, 2, 3].map((i) => (
            <div className="sff-skel-card" key={i}>
              <div className="sff-skel-thumb" />
              <div className="sff-skel-lines">
                <div className="sff-skel-line w70" />
                <div className="sff-skel-line w90" />
                <div className="sff-skel-line w40" />
              </div>
            </div>
          ))}
        </div>

        {/* FOOD CARDS (ask 7, 8, 9, 10) */}
        {!loading && visibleItems.length === 0 ? (
          search.trim() || filter ? (
            <div className="sff-empty" data-testid="landing-search-empty">
              <div className="sff-empty-icon" aria-hidden="true">🔎</div>
              <p>No dishes match your search.<br />Try another name or clear the filters.</p>
              <button className="sff-btn-order sff-btn-inline" onClick={() => { setSearch(""); setFilter(null); }}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="sff-empty" data-testid="landing-empty">
              <div className="sff-empty-icon" aria-hidden="true">🍽️</div>
              <p>No items available right now. Please check back soon!</p>
            </div>
          )
        ) : (
          <div className={`sff-grid ${loading ? "is-hidden" : ""}`} data-testid="landing-menu">
            {visibleItems.map((item, i) => {
              const m = metaById.get(item.id)!;
              const qty = cart[item.id]?.qty ?? 0;
              return (
                <article
                  key={item.id}
                  className="sff-card"
                  data-testid={`landing-item-${item.id}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
                  onClick={() => setDetailItem(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") setDetailItem(item); }}
                >
                  <div className="sff-thumb" aria-hidden="true">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                    ) : (
                      m.emoji
                    )}
                    {m.badges[0] && (
                      <span
                        className={`sff-badge-chip badge-${m.badges[0].kind}`}
                        data-testid={`landing-badge-${item.id}`}
                      >
                        {m.badges[0].label}
                      </span>
                    )}
                  </div>
                  <div className="sff-info">
                    <div className="sff-name">{item.name}</div>
                    <div className="sff-desc" data-testid={`landing-desc-${item.id}`}>{m.description}</div>
                    <div className="sff-meta-row">
                      <span className="sff-rating" data-testid={`landing-rating-${item.id}`}>★ {m.rating.toFixed(1)}</span>
                      <span className="sff-dot" aria-hidden="true">·</span>
                      <span className="sff-prep" data-testid={`landing-prep-${item.id}`}>{m.prepMin} min</span>
                      {item.in_stock ? (
                        <span
                          className={`sff-avail ${AVAIL_CLASS[m.availability]}`}
                          data-testid={`landing-availability-${item.id}`}
                        >
                          {m.availability}
                        </span>
                      ) : (
                        <span className="sff-avail avail-soldout" data-testid={`landing-availability-${item.id}`}>
                          Sold Out
                        </span>
                      )}
                    </div>
                    <div className="sff-card-foot">
                      <span className="sff-price" data-testid={`landing-price-${item.id}`}>
                        {formatTSH(item.price_tsh)}
                      </span>
                      {qty > 0 ? (
                        <div className="sff-card-stepper" onClick={(e) => e.stopPropagation()}>
                          <button className="sff-step-btn" data-testid={`landing-card-dec-${item.id}`} aria-label={`Remove one ${item.name}`} onClick={() => decItem(item.id)}>−</button>
                          <span className="sff-step-qty" data-testid={`landing-card-qty-${item.id}`}>{qty}</span>
                          <button className="sff-step-btn" data-testid={`landing-card-inc-${item.id}`} aria-label={`Add one more ${item.name}`} onClick={() => addItem(item)}>+</button>
                        </div>
                      ) : (
                        <button
                          className={`sff-add ${poppedId === item.id ? "added" : ""}`}
                          data-testid={`landing-add-${item.id}`}
                          aria-label={`Add ${item.name}`}
                          disabled={!item.in_stock}
                          onClick={(e) => { e.stopPropagation(); addItem(item); }}
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* TODAY'S SPECIALS with scarcity (ask 17) */}
        {specials.length > 0 && (
          <section className="sff-block">
            <div className="sff-block-head">
              <h2 className="sff-section-title">Today&apos;s <span>Specials</span></h2>
              <span className="sff-block-tag">Limited today</span>
            </div>
            <div className="sff-specials" data-testid="landing-specials">
              {specials.map((item) => {
                const m = metaById.get(item.id)!;
                const left = unitsLeftFor(item);
                return (
                  <article className="sff-special" key={item.id} data-testid={`landing-special-${item.id}`}>
                    <div className="sff-special-thumb" aria-hidden="true">{m.emoji}</div>
                    <span className="sff-special-left" data-testid={`landing-special-left-${item.id}`}>Only {left} left</span>
                    <div className="sff-special-name">{item.name}</div>
                    <div className="sff-special-foot">
                      <span className="sff-price">{formatTSH(item.price_tsh)}</span>
                      <button className="sff-add sm" aria-label={`Add ${item.name}`} disabled={!item.in_stock} onClick={() => addItem(item)}>+</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* LIVE KITCHEN FEED (ask 15) */}
        {items.length > 0 && (
          <section className="sff-block">
            <div className="sff-block-head">
              <h2 className="sff-section-title">Kitchen <span>Now</span></h2>
              <span className="sff-live sm">
                <span className="sff-live-dot" aria-hidden="true" /> Live
              </span>
            </div>
            <div className="sff-kfeed" data-testid="landing-kitchen-feed">
              {items.slice(0, 6).map((item, i) => {
                const status = kitchenStatusFor(item, i);
                const m = metaById.get(item.id)!;
                const cls = status === "Ready" ? "ready" : status === "Cooking" ? "cooking" : "sold";
                return (
                  <div className="sff-krow" key={item.id} data-testid={`landing-kitchen-row-${item.id}`}>
                    <span className="sff-krow-emoji" aria-hidden="true">{m.emoji}</span>
                    <span className="sff-krow-name">{item.name}</span>
                    <span className={`sff-krow-status ${cls}`}>
                      {status === "Ready" && "🟢 "}
                      {status === "Cooking" && "🟡 "}
                      {status === "Sold Out" && "🔴 "}
                      {status}
                      {status === "Cooking" ? ` · ${m.prepMin} min` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CUSTOMER REVIEWS (ask 16) */}
        <section className="sff-block">
          <div className="sff-block-head">
            <h2 className="sff-section-title">Loved by <span>Customers</span></h2>
          </div>
          <div className="sff-reviews" data-testid="landing-reviews">
            {REVIEWS.map((r) => (
              <article className="sff-review" key={r.id} data-testid={`landing-review-${r.id}`}>
                <div className="sff-review-stars" aria-label={`${r.stars} stars`}>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
                <p className="sff-review-quote">“{r.quote}”</p>
                <div className="sff-review-name">— {r.name}</div>
              </article>
            ))}
          </div>
        </section>

        {/* WHY CHOOSE US with concrete numbers (ask 18) */}
        <section className="sff-block">
          <div className="sff-block-head">
            <h2 className="sff-section-title">Why <span>Sumaiyyah</span></h2>
          </div>
          <div className="sff-why" data-testid="landing-why">
            <div className="sff-why-card" data-testid="landing-why-1">
              <div className="sff-why-icon" aria-hidden="true">⚡</div>
              <div className="sff-why-num">15 min</div>
              <div className="sff-why-desc">Average pickup time</div>
            </div>
            <div className="sff-why-card" data-testid="landing-why-2">
              <div className="sff-why-icon" aria-hidden="true">😋</div>
              <div className="sff-why-num">2,400+</div>
              <div className="sff-why-desc">Happy customers</div>
            </div>
            <div className="sff-why-card" data-testid="landing-why-3">
              <div className="sff-why-icon" aria-hidden="true">🌿</div>
              <div className="sff-why-num">100%</div>
              <div className="sff-why-desc">Fresh ingredients daily</div>
            </div>
            <div className="sff-why-card" data-testid="landing-why-4">
              <div className="sff-why-icon" aria-hidden="true">🕚</div>
              <div className="sff-why-num">until 11 PM</div>
              <div className="sff-why-desc">Open every day</div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER (ask 19) */}
      <footer className="sff-footer" data-testid="landing-footer">
        <div className="sff-footer-inner">
          <div className="sff-footer-top">
            <div className="sff-footer-logo">Sumaiyyah<span>.</span></div>
            <p className="sff-footer-desc">
              Dar es Salaam&apos;s most beloved Swahili street food, serving the community since 2012.
            </p>
          </div>
          <div className="sff-footer-cols">
            <div className="sff-footer-col">
              <div className="sff-footer-h">Visit us</div>
              <div className="sff-footer-line" data-testid="landing-footer-hours">🕒 Mon–Sun, 8:00 AM – 11:00 PM</div>
              <a className="sff-footer-line" data-testid="landing-footer-maps" href="https://maps.google.com/?q=Kariakoo+Dar+es+Salaam" target="_blank" rel="noopener noreferrer">📍 Kariakoo, Dar es Salaam (Map)</a>
            </div>
            <div className="sff-footer-col">
              <div className="sff-footer-h">Contact</div>
              <a className="sff-footer-line" data-testid="landing-footer-phone" href="tel:+255700000000">📞 +255 700 000 000</a>
              <a className="sff-footer-line" data-testid="landing-footer-whatsapp" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">💬 WhatsApp order</a>
            </div>
            <div className="sff-footer-col">
              <div className="sff-footer-h">Follow</div>
              <a className="sff-footer-line" data-testid="landing-footer-instagram" href="https://instagram.com/" target="_blank" rel="noopener noreferrer">📸 Instagram</a>
              <a className="sff-footer-line" data-testid="landing-footer-tiktok" href="https://tiktok.com/" target="_blank" rel="noopener noreferrer">🎵 TikTok</a>
            </div>
          </div>
          <div className="sff-footer-pay" data-testid="landing-footer-payments">
            Payments: 💵 Cash · 📱 M-Pesa · 📱 Tigo Pesa · 📱 Airtel Money
          </div>
          <div className="sff-footer-legal">
            <a href="#" data-testid="landing-footer-privacy">Privacy Policy</a>
            <span aria-hidden="true">·</span>
            <a href="#" data-testid="landing-footer-terms">Terms of Service</a>
          </div>
          <p className="sff-footer-copy">© 2025 Sumaiyyah Fast Food. All rights reserved.</p>
        </div>
      </footer>

      {/* FLOATING CART (ask 24) */}
      <div
        className={`sff-fab ${totalItems > 0 ? "visible" : ""}`}
        data-testid="landing-cart-fab"
        role="button"
        tabIndex={0}
        onClick={openSheet}
        onKeyDown={(e) => { if (e.key === "Enter") openSheet(); }}
      >
        <div className="sff-fab-left">
          <div className="sff-fab-badge" data-testid="landing-cart-count">{totalItems}</div>
          <div>
            <div className="sff-fab-label">View Order</div>
            <div className="sff-fab-preview">
              {totalItems > 0 ? `${totalItems} item${totalItems > 1 ? "s" : ""}` : "No items yet"}
            </div>
          </div>
        </div>
        <div className="sff-fab-total" data-testid="landing-cart-total">{formatTSH(totalPrice)}</div>
      </div>

      {/* FOOD DETAIL VIEW (ask 14) */}
      <div className={`sff-overlay ${detailItem ? "open" : ""}`} onClick={() => setDetailItem(null)} />
      {detailItem && (() => {
        const m = metaById.get(detailItem.id) ?? metaFor(detailItem);
        const related = relatedItems(detailItem, items, 3);
        return (
          <div className="sff-sheet detail open" data-testid="landing-detail" role="dialog" aria-modal="true">
            <div className="sff-handle" aria-hidden="true" />
            <div className="sff-sheet-header">
              <h2 className="sff-sheet-title">{detailItem.name}</h2>
              <button className="sff-close" data-testid="landing-detail-close" aria-label="Close details" onClick={() => setDetailItem(null)}>✕</button>
            </div>
            <div className="sff-sheet-body">
              <div className="sff-detail-hero" aria-hidden="true">{m.emoji}</div>
              <div className="sff-detail-badges">
                {m.badges.map((b) => (
                  <span key={b.label} className={`sff-badge-chip badge-${b.kind}`}>{b.label}</span>
                ))}
                {detailItem.in_stock ? (
                  <span className={`sff-avail ${AVAIL_CLASS[m.availability]}`}>{m.availability}</span>
                ) : (
                  <span className="sff-avail avail-soldout">Sold Out</span>
                )}
              </div>
              <p className="sff-detail-desc">{m.description}</p>
              <div className="sff-detail-stats">
                <div><span className="k">Rating</span><span className="v">★ {m.rating.toFixed(1)} ({m.ratingCount})</span></div>
                <div><span className="k">Prep time</span><span className="v" data-testid="landing-detail-prep">{m.prepMin} min</span></div>
                <div><span className="k">Calories</span><span className="v" data-testid="landing-detail-calories">{m.calories} kcal</span></div>
                <div><span className="k">Spice level</span><span className="v" data-testid="landing-detail-spice">{m.spice}</span></div>
              </div>
              <div className="sff-detail-section">
                <div className="sff-detail-h">Ingredients</div>
                <div className="sff-detail-ingredients" data-testid="landing-detail-ingredients">
                  {m.ingredients.map((ing) => (
                    <span className="sff-ing" key={ing}>{ing}</span>
                  ))}
                </div>
              </div>
              <div className="sff-detail-section">
                <div className="sff-detail-h">Reviews</div>
                <div className="sff-detail-reviews" data-testid="landing-detail-reviews">
                  {REVIEWS.slice(0, 2).map((r) => (
                    <div className="sff-detail-review" key={r.id}>
                      <span className="sff-review-stars">{"★".repeat(r.stars)}</span>
                      <span className="sff-detail-review-q">“{r.quote}” — {r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sff-detail-section">
                <div className="sff-detail-h">People also ordered</div>
                <div className="sff-detail-related" data-testid="landing-detail-related">
                  {related.map((r) => {
                    const rm = metaById.get(r.id) ?? metaFor(r);
                    return (
                      <button className="sff-related" key={r.id} onClick={() => setDetailItem(r)}>
                        <span className="sff-related-emoji" aria-hidden="true">{rm.emoji}</span>
                        <span className="sff-related-name">{r.name}</span>
                        <span className="sff-related-price">{formatTSH(r.price_tsh)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                className="sff-btn-order"
                data-testid="landing-detail-add"
                disabled={!detailItem.in_stock}
                onClick={() => { addItem(detailItem); setDetailItem(null); }}
              >
                {detailItem.in_stock ? `Add to order · ${formatTSH(detailItem.price_tsh)}` : "Sold Out"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* CART OVERLAY + BOTTOM SHEET */}
      <div className={`sff-overlay ${sheetOpen ? "open" : ""}`} onClick={closeSheet} />
      <div className={`sff-sheet ${sheetOpen ? "open" : ""}`} data-testid="landing-sheet" role="dialog" aria-modal="true">
        <div className="sff-handle" aria-hidden="true" />
        <div className="sff-sheet-header">
          <h2 className="sff-sheet-title">{success ? "Order Sent" : "Your Order"}</h2>
          <button className="sff-close" onClick={closeSheet} aria-label="Close cart" data-testid="landing-close">✕</button>
        </div>
        <div className="sff-sheet-body">
          {success ? (
            <div className="sff-success" data-testid="landing-success">
              <div className="sff-success-icon" aria-hidden="true">🎉</div>
              <h3>Order Sent!</h3>
              <p>Your order has been sent via WhatsApp.<br />We&apos;ll confirm shortly. Asante sana!</p>
              <button className="sff-btn-order" onClick={closeSheet}>Back to Menu</button>
            </div>
          ) : cartEntries.length === 0 ? (
            <div className="sff-sheet-empty" data-testid="landing-cart-empty">
              <div className="sff-empty-illus" aria-hidden="true">
                <span className="sff-empty-plate">🍽️</span>
                <span className="sff-empty-spark s1">✨</span>
                <span className="sff-empty-spark s2">✨</span>
              </div>
              <h3>No delicious food yet</h3>
              <p>Your cart is empty.<br />Add some fresh Swahili street food to get started!</p>
              <button className="sff-btn-order sff-btn-inline" onClick={closeSheet}>Browse the menu</button>
            </div>
          ) : (
            <>
              <div role="list" aria-label="Cart items">
                {cartEntries.map(({ item, qty }) => (
                  <div className="sff-line" key={item.id} data-testid={`landing-line-${item.id}`} role="listitem">
                    <div className="sff-line-thumb" aria-hidden="true">{emojiFor(item)}</div>
                    <div className="sff-line-info">
                      <div className="sff-line-name">{item.name}</div>
                      <div className="sff-line-price">{formatTSH(item.price_tsh)} each</div>
                    </div>
                    <div className="sff-qty-ctrl">
                      <button className="sff-qty-btn" data-testid={`landing-dec-${item.id}`} aria-label={`Remove one ${item.name}`} onClick={() => decItem(item.id)}>−</button>
                      <span className="sff-qty-num">{qty}</span>
                      <button className="sff-qty-btn" data-testid={`landing-inc-${item.id}`} aria-label={`Add one more ${item.name}`} onClick={() => addItem(item)}>+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sff-summary">
                <div className="sff-summary-row"><span>Subtotal</span><span className="sff-summary-val">{formatTSH(totalPrice)}</span></div>
                <div className="sff-summary-row"><span>Pickup</span><span className="sff-summary-val">Free</span></div>
                <div className="sff-summary-row"><span>Total</span><span className="sff-summary-val" data-testid="landing-sheet-total">{formatTSH(totalPrice)}</span></div>
              </div>

              <form onSubmit={placeOrder} noValidate>
                <label className="sff-form-lbl" htmlFor="sff-name">Your Name</label>
                <input
                  className="sff-input" id="sff-name" data-testid="landing-name" type="text"
                  placeholder="e.g. Amina Hassan" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
                />
                <label className="sff-form-lbl" htmlFor="sff-phone">Phone Number</label>
                <input
                  className="sff-input" id="sff-phone" data-testid="landing-phone" type="tel"
                  placeholder="e.g. 0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel"
                />
                <label className="sff-form-lbl" htmlFor="sff-note">Special Request (optional)</label>
                <input
                  className="sff-input" id="sff-note" data-testid="landing-note" type="text"
                  placeholder="e.g. Extra spicy, no onions" value={note} onChange={(e) => setNote(e.target.value)}
                />
                {orderError && (
                  <div className="sff-field-error" data-testid="landing-order-error">{orderError}</div>
                )}
                <button type="submit" className="sff-btn-order" data-testid="landing-checkout" disabled={submitting}>
                  {submitting ? "Opening WhatsApp…" : "Confirm via WhatsApp"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* CONFETTI (ask 21) */}
      {confetti && (
        <div className="sff-confetti" data-testid="landing-confetti" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className={`sff-conf c${i % 6}`} style={{ left: `${(i * 100) / 28}%`, animationDelay: `${(i % 7) * 0.08}s` }} />
          ))}
        </div>
      )}

      {/* TOAST */}
      <div className={`sff-toast ${toast ? "show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
