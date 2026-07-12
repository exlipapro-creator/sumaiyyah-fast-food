import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { sanitizeImageUrl } from "@/lib/validation";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("any", req);
    const db = getDb();
    const url = new URL(req.url);
    const activeOnly = url.searchParams.get("activeOnly") === "1";
    let query = "SELECT mi.*, c.name as category_name FROM menu_items mi JOIN categories c ON mi.category_id = c.id WHERE mi.deleted = 0";
    if (activeOnly) query += " AND mi.active = 1";
    query += " ORDER BY c.sort_order ASC, mi.sort_order ASC, mi.id ASC";
    const items = db.prepare(query).all();
    return NextResponse.json({ items });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const { name, category_id, price_tsh, image_url, active } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Item name required" }, { status: 400 });
    }
    const price = Number(price_tsh);
    if (!Number.isInteger(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a non-negative integer" }, { status: 400 });
    }
    const catId = Number(category_id);
    if (!Number.isInteger(catId) || catId < 1) {
      return NextResponse.json({ error: "Category required" }, { status: 400 });
    }
    const db = getDb();
    const cat = db.prepare("SELECT id FROM categories WHERE id = ?").get(catId);
    if (!cat) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order),0) as m FROM menu_items WHERE category_id = ?").get(catId) as { m: number };
    const result = db.prepare(
      "INSERT INTO menu_items (category_id, name, price_tsh, image_url, active, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(catId, name.trim(), price, sanitizeImageUrl(image_url), active !== false ? 1 : 0, maxOrder.m + 1);
    const item = db.prepare("SELECT mi.*, c.name as category_name FROM menu_items mi JOIN categories c ON mi.category_id = c.id WHERE mi.id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
