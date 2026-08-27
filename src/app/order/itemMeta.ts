import type { PublicItem } from "@/app/api/public/menu/route";

export type PublicMenuItem = PublicItem;


// ── Deterministic per-item metadata ──────────────────────────────────────────
// The menu_items table only stores {id,name,price,category}. To make the public
// storefront feel like a premium food-ordering app (Uber Eats / DoorDash grade)
// we DERIVE rich, STABLE presentation attributes from each item (description,
// prep time, rating, badges, availability, dietary tags, ingredients, calories,
// spice level). These are deterministic functions of the item so they never
// flicker between renders or re-syncs, and they require no schema/API change.

export type BadgeKind =
  | "bestseller"
  | "new"
  | "chef"
  | "spicy"
  | "vegan"
  | "halal"
  | "hot";

export interface Badge {
  label: string;
  kind: BadgeKind;
}

export type Availability = "Available" | "Few Left" | "Cooking";
export type KitchenStatus = "Ready" | "Cooking" | "Sold Out";

export interface ItemMeta {
  description: string;
  prepMin: number;
  rating: number; // 4.x
  ratingCount: number;
  badges: Badge[];
  availability: Availability;
  calories: number;
  spice: "Mild" | "Medium" | "Hot";
  ingredients: string[];
  emoji: string;
  tags: {
    popular: boolean;
    ready: boolean; // ready in <= 10 min
    veg: boolean;
    spicy: boolean;
    available: boolean;
  };
}

// Small, stable FNV-1a string hash so all derived values are reproducible.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Pick a food emoji from the item/category name so cards look appetising even
// though menu items carry no image in the data model.
export function emojiFor(item: { name: string; category_name?: string }): string {
  const s = (item.name + " " + (item.category_name ?? "")).toLowerCase();
  const map: [string, string][] = [
    ["mishikaki", "🍢"], ["biryani", "🍛"], ["pilau", "🍛"], ["wali", "🍚"],
    ["kuku", "🍗"], ["nyama", "🥩"], ["samaki", "🐟"], ["chips", "🍟"],
    ["zege", "🍳"], ["mayai", "🍳"], ["mboga", "🥗"], ["maharage", "🍲"],
    ["juice", "🧃"], ["smoothy", "🥤"], ["maji", "💧"], ["soda", "🥤"],
    ["chai", "🍵"], ["kahawa", "☕"], ["drink", "🥤"], ["special", "⭐"],
  ];
  for (const [k, e] of map) if (s.includes(k)) return e;
  return "🍽️";
}

const DESC_MAP: [RegExp, string][] = [
  [/biryani/i, "Fragrant spiced rice layered with seasoned tender meat, curry gravy and kachumbari."],
  [/pilau/i, "Authentic spiced rice infused with cardamom, cloves, cinnamon, tender meat, and side beans & veggies."],
  [/wali/i, "Steamed fragrant white rice served with seasoned meat or chicken, tender beans, and fresh greens."],
  [/mishikaki/i, "Tender marinated meat skewers, flame-grilled to perfection with savoury spices."],
  [/zege/i, "Classic fresh potato chips folded and crisped inside golden spiced eggs."],
  [/chips/i, "Golden freshly cut potatoes, fried crisp on the outside and fluffy inside."],
  [/juice|smoothy/i, "Freshly pressed tropical fruit smoothie, chilled and nutritious."],
  [/soda/i, "Ice-cold refreshing beverage in glass bottle or can."],
  [/maji/i, "Pure bottled chilled mineral water."],
  [/chai/i, "Spiced tea brewed with fresh milk, cardamom, and ginger."],
  [/chicken|kuku/i, "Juicy seasoned chicken, cooked to perfection."],
  [/beef|nyama/i, "Tender prime beef slow-cooked in rich flavourful spices."],
  [/fish|samaki/i, "Fresh fish delicately spiced and fried to golden perfection."],
];

const INGREDIENT_MAP: [RegExp, string[]][] = [
  [/biryani/i, ["Basmati rice", "Meat / Chicken", "Saffron spices", "Onions", "Gravy sauce", "Kachumbari"]],
  [/pilau/i, ["Basmati rice", "Beef / Chicken", "Cardamom", "Cloves", "Cinnamon", "Beans", "Vegetables"]],
  [/wali/i, ["White rice", "Beef / Chicken", "Maharage", "Mchicha / Greens", "Kachumbari"]],
  [/mishikaki/i, ["Prime beef chunks", "Ginger-garlic marinade", "Paprika", "Black pepper", "Lime"]],
  [/zege/i, ["Fresh potatoes", "Farm eggs", "Sunflower oil", "Salt", "Kachumbari"]],
  [/chips/i, ["Fresh potatoes", "Sunflower oil", "Sea salt"]],
  [/juice|smoothy/i, ["Fresh seasonal fruits", "Natural fruit nectar", "Ice"]],
  [/soda/i, ["Carbonated water", "Sugar", "Natural flavours"]],
  [/maji/i, ["Mineral water"]],
  [/chai/i, ["Black tea leaves", "Fresh milk", "Cardamom", "Ginger", "Cinnamon"]],
];

function firstMatch<T>(map: [RegExp, T][], name: string, fallback: T): T {
  for (const [re, val] of map) if (re.test(name)) return val;
  return fallback;
}

export function metaFor(item: PublicMenuItem): ItemMeta {
  const h = hashStr(item.name + ":" + item.id);
  const name = item.name;
  const lower = name.toLowerCase();

  const isDrink = /cola|soda|juice|water|coffee|tea|drink/i.test(lower);
  const isSpicy = /spicy|chilli|pepper|bbq|chicken|masala/i.test(lower);
  const isVeg = isDrink || /fries|chips|slaw|salad|onion|ring|rice|pilau|veg/i.test(lower);
  const hasMeat = /chicken|kuku|beef|nyama|fish|samaki|meat|mishkaki|zege/i.test(lower);

  // Prep time 6..20 min; drinks are quick.
  const prepMin = isDrink ? 2 + (h % 4) : 8 + (h % 13);
  // Rating 4.3..4.9
  const rating = Math.round((4.3 + (h % 7) * 0.1) * 10) / 10;
  const ratingCount = 40 + (h % 260);

  const availStates: Availability[] = ["Available", "Available", "Few Left", "Cooking"];
  const availability = availStates[h % availStates.length];

  const badges: Badge[] = [];
  const popular = h % 3 === 0;
  if (popular) badges.push({ label: "Best Seller", kind: "bestseller" });
  if (isSpicy) badges.push({ label: "Spicy", kind: "spicy" });
  if (!popular && h % 5 === 0) badges.push({ label: "New", kind: "new" });
  if (!popular && !isSpicy && h % 4 === 0) badges.push({ label: "Chef's Pick", kind: "chef" });
  if (isVeg && !hasMeat && badges.length < 2) badges.push({ label: "Vegan", kind: "vegan" });
  if (hasMeat && badges.length < 2) badges.push({ label: "Halal", kind: "halal" });
  // Guarantee at least one badge on every card for a consistent premium look.
  if (badges.length === 0) badges.push({ label: "Popular", kind: "hot" });

  const description = firstMatch(DESC_MAP, name, "A Sumaiyyah favourite, cooked fresh to order.");
  const ingredients = firstMatch(INGREDIENT_MAP, name, ["Fresh local ingredients"]);
  const calories = isDrink ? 60 + (h % 180) : 220 + (h % 620);
  const spice: ItemMeta["spice"] = isSpicy ? (["Medium", "Hot", "Hot"][h % 3] as ItemMeta["spice"]) : "Mild";

  return {
    description,
    prepMin,
    rating,
    ratingCount,
    badges,
    availability,
    calories,
    spice,
    ingredients,
    emoji: emojiFor(item),
    tags: {
      popular,
      ready: prepMin <= 10,
      veg: isVeg && !hasMeat,
      spicy: isSpicy,
      available: availability === "Available",
    },
  };
}

// Kitchen "cooking now" status, deterministic but spread across the three states
// so the live feed always shows Ready / Cooking / Sold Out variety.
export function kitchenStatusFor(item: PublicMenuItem, index: number): KitchenStatus {
  const cycle: KitchenStatus[] = ["Ready", "Cooking", "Ready", "Sold Out", "Cooking", "Ready"];
  return cycle[index % cycle.length];
}

// "Only N left" scarcity number for Today's Specials.
export function unitsLeftFor(item: PublicMenuItem): number {
  const h = hashStr("left:" + item.name + item.id);
  return 3 + (h % 10); // 3..12
}

// Related "people also ordered" items: prefer same category, then fill from the
// rest of the menu, excluding the item itself. Deterministic ordering.
export function relatedItems(item: PublicMenuItem, all: PublicMenuItem[], n = 3): PublicMenuItem[] {
  const others = all.filter((i) => i.id !== item.id);
  const sameCat = others.filter((i) => i.category_id === item.category_id);
  const rest = others.filter((i) => i.category_id !== item.category_id);
  return [...sameCat, ...rest].slice(0, n);
}
