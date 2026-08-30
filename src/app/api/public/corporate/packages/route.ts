import { NextResponse } from "next/server";
import getDb from "@/lib/db";
import { CORPORATE_DELIVERY_WINDOWS } from "@/lib/corporate-rules";

export const dynamic = "force-dynamic";

const FALLBACK_PACKAGES = [
  {
    id: 1,
    name: "Executive Boardroom Platter",
    tagline: "Char-grilled whole chicken cuts, mishkaki skewers, gourmet fries & fresh salads",
    description: "Premium corporate assortment designed for executive boardroom sessions, client luncheons, and department meetings.",
    price_tsh: 45000,
    minimum_quantity: 2,
    serves_people_min: 5,
    lead_time_hours: 2,
    badge: "Popular Choice",
    image_url: "/assets/food/platter.jpg",
    items: [
      { menu_item_id: 1, name: "Kuku Choma Quarters", quantity: 4, price_tsh: 28000 },
      { menu_item_id: 2, name: "Mishkaki Beef Skewers (6 pcs)", quantity: 2, price_tsh: 12000 },
      { menu_item_id: 3, name: "Crispy Chips & Pili Pili Sauce", quantity: 4, price_tsh: 10000 },
    ],
  },
  {
    id: 2,
    name: "Swahili Tech Team Lunch Box",
    tagline: "Individual sealed hot lunch box: Kuku Choma / Samaki, Biryani Rice & Kachumbari",
    description: "Individually packaged, hygienic hot meal boxes with labeled dietary tags, cutlery, and napkins for office staff.",
    price_tsh: 12500,
    minimum_quantity: 5,
    serves_people_min: 1,
    lead_time_hours: 2,
    badge: "Best Value",
    image_url: "/assets/food/lunchbox.jpg",
    items: [
      { menu_item_id: 4, name: "Biryani Rice with Tender Chicken", quantity: 1, price_tsh: 10000 },
      { menu_item_id: 5, name: "Fresh Kachumbari & Sauce Cup", quantity: 1, price_tsh: 2500 },
    ],
  },
  {
    id: 3,
    name: "Breakfast & Morning Meeting Platter",
    tagline: "Spiced ginger chai flask, crispy sambusa, chapati roll-ups & boiled eggs",
    description: "Traditional energizing morning spread for early workshops, strategy kick-offs, and team breakfast syncs.",
    price_tsh: 28000,
    minimum_quantity: 2,
    serves_people_min: 5,
    lead_time_hours: 1,
    badge: "Morning Spread",
    image_url: "/assets/food/breakfast.jpg",
    items: [
      { menu_item_id: 6, name: "Beef & Veggie Sambusa (12 pcs)", quantity: 1, price_tsh: 12000 },
      { menu_item_id: 7, name: "Layered Soft Chapatis (8 pcs)", quantity: 1, price_tsh: 8000 },
      { menu_item_id: 8, name: "Hot Spiced Masala Chai (2L Flask)", quantity: 1, price_tsh: 8000 },
    ],
  },
  {
    id: 4,
    name: "Corporate Feast Platter (Nyama Choma & Biryani)",
    tagline: "Grand sharing trays with tender goat roast, whole chicken, aromatic pilau & accompaniments",
    description: "Generous team celebration tray for end-of-month milestones, client signings, and company celebrations.",
    price_tsh: 85000,
    minimum_quantity: 1,
    serves_people_min: 10,
    lead_time_hours: 3,
    badge: "Team Feast",
    image_url: "/assets/food/feast.jpg",
    items: [
      { menu_item_id: 9, name: "Mbuzi Choma (1.5 kg)", quantity: 1, price_tsh: 45000 },
      { menu_item_id: 10, name: "Kuku Mzima Roast", quantity: 1, price_tsh: 25000 },
      { menu_item_id: 11, name: "Pilau Kuu Sharing Tray", quantity: 1, price_tsh: 15000 },
    ],
  },
];

export async function GET() {
  try {
    const db = getDb();

    // Fetch active corporate packages
    let packages: any[] = [];
    try {
      packages = db.prepare(`
        SELECT id, name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, image_url, sort_order
        FROM corporate_menu_packages
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
      `).all() as any[];

      // Attach bundled item details
      for (const pkg of packages) {
        const items = db.prepare(`
          SELECT pi.quantity, mi.id as menu_item_id, mi.name, mi.price_tsh, mi.image_url, mi.track_stock, mi.stock_qty
          FROM corporate_menu_package_items pi
          JOIN menu_items mi ON mi.id = pi.menu_item_id
          WHERE pi.package_id = ? AND mi.active = 1 AND mi.deleted = 0
        `).all(pkg.id);
        pkg.items = items;
      }
    } catch (e) {
      console.warn("[api/public/corporate/packages] Failed to query corporate_menu_packages table, using fallback:", e);
    }

    if (!packages || packages.length === 0) {
      packages = FALLBACK_PACKAGES;
    }

    // Also fetch regular menu items that are available for bulk ordering
    let individualItems: any[] = [];
    try {
      individualItems = db.prepare(`
        SELECT mi.id, mi.name, mi.price_tsh, mi.image_url, mi.description, mi.prep_time_min, mi.calories, mi.spiciness, mi.dietary_tags, mi.options_json, mi.track_stock, mi.stock_qty, c.name as category_name
        FROM menu_items mi
        JOIN categories c ON c.id = mi.category_id
        WHERE mi.active = 1 AND mi.deleted = 0
        ORDER BY c.sort_order ASC, mi.sort_order ASC
      `).all() as any[];
    } catch (e) {
      console.warn("[api/public/corporate/packages] Failed to query menu_items:", e);
    }

    const formattedIndividual = individualItems.map((item) => {
      let options = {};
      let dietary_tags: string[] = [];
      try {
        if (item.options_json) options = JSON.parse(item.options_json);
      } catch {}
      try {
        if (item.dietary_tags) dietary_tags = JSON.parse(item.dietary_tags);
      } catch {}

      return {
        ...item,
        in_stock: !item.track_stock || item.stock_qty > 0,
        options,
        dietary_tags,
      };
    });

    return NextResponse.json({
      success: true,
      packages,
      individual_items: formattedIndividual,
      delivery_windows: CORPORATE_DELIVERY_WINDOWS,
    });
  } catch (error) {
    console.error("[api/public/corporate/packages] Error:", error);
    return NextResponse.json({
      success: true,
      packages: FALLBACK_PACKAGES,
      individual_items: [],
      delivery_windows: CORPORATE_DELIVERY_WINDOWS,
    });
  }
}

