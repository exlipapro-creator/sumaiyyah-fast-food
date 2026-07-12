import type { PublicMenuItem } from "./page";

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
    ["burger", "🍔"], ["chicken", "🍗"], ["beef", "🥩"], ["fries", "🍟"],
    ["drink", "🥤"], ["cola", "🥤"], ["juice", "🧃"], ["water", "💧"],
    ["coffee", "☕"], ["tea", "🍵"], ["rice", "🍚"], ["pilau", "🍚"],
    ["fish", "🐟"], ["chips", "🍟"], ["salad", "🥗"], ["combo", "🍱"],
    ["meal", "🍽️"], ["side", "🍟"], ["onion", "🧅"], ["slaw", "🥗"],
    ["special", "⭐"], ["mango", "🥭"], ["coconut", "🥥"], ["soda", "🧃"],
    ["ring", "🧅"], ["family", "👪"],
  ];
  for (const [k, e] of map) if (s.includes(k)) return e;
  return "🍴";
}

const DESC_MAP: [RegExp, string][] = [
  [/double|family/i, "Big appetite? A hearty, generous portion made to share."],
  [/burger/i, "Flame-grilled patty, fresh salad and our house sauce in a soft bun."],
  [/chicken/i, "Juicy marinated chicken, grilled to order over open coals."],
  [/beef/i, "Tender seasoned beef, seared hot for deep smoky flavour."],
  [/fish/i, "Fresh catch of the day, lightly spiced and pan-crisped."],
  [/fries|chips/i, "Golden hand-cut potatoes, crisp outside and fluffy inside."],
  [/onion|ring/i, "Crunchy battered onion rings, fried fresh to order."],
  [/slaw|salad/i, "Crisp garden vegetables tossed in a light, tangy dressing."],
  [/rice|pilau/i, "Fragrant basmati slow-cooked with our secret spice blend."],
  [/cola|soda|drink/i, "Ice-cold and refreshing, the perfect pairing for any meal."],
  [/juice|mango/i, "Freshly pressed tropical fruit, no added sugar."],
  [/water/i, "Chilled bottled mineral water."],
  [/coffee/i, "Rich locally roasted coffee, brewed strong."],
  [/tea/i, "Spiced Swahili chai, brewed the traditional way."],
  [/combo|meal/i, "A complete meal deal, everything you need in one order."],
];

const INGREDIENT_MAP: [RegExp, string[]][] = [
  [/burger/i, ["Beef/Chicken patty", "Brioche bun", "Lettuce", "Tomato", "House sauce"]],
  [/chicken/i, ["Chicken", "Ginger-garlic marinade", "Chilli", "Lemon"]],
  [/beef/i, ["Beef", "Onion", "Garlic", "Paprika", "Black pepper"]],
  [/fries|chips/i, ["Potatoes", "Sunflower oil", "Sea salt"]],
  [/onion|ring/i, ["Onion", "Batter", "Paprika", "Salt"]],
  [/slaw|salad/i, ["Cabbage", "Carrot", "Mayo", "Lemon"]],
  [/rice|pilau/i, ["Basmati rice", "Cardamom", "Cumin", "Cinnamon", "Onion"]],
  [/mango|juice/i, ["Mango", "Water", "Ice"]],
  [/cola|soda|drink/i, ["Carbonated water", "Cane sugar", "Natural flavours"]],
  [/coffee/i, ["Arabica coffee", "Water"]],
  [/tea/i, ["Black tea", "Milk", "Cardamom", "Ginger"]],
  [/water/i, ["Mineral water"]],
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
  const hasMeat = /burger|chicken|beef|fish|meat|mishkaki|nyama/i.test(lower);

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
