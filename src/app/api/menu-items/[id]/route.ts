import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/auth";
import { sanitizeImageUrl } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole("manager", req);
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    const auditDetails: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Item name required" }, { status: 400 });
      }
      fields.push("name = ?"); values.push(body.name.trim());
      auditDetails.name = body.name.trim();
    }
    if (body.price_tsh !== undefined) {
      const price = Number(body.price_tsh);
      if (!Number.isInteger(price) || price < 0) {
        return NextResponse.json({ error: "Price must be a non-negative integer" }, { status: 400 });
      }
      fields.push("price_tsh = ?"); values.push(price);
      auditDetails.price_tsh = price;
    }
    if (body.active !== undefined) {
      fields.push("active = ?"); values.push(body.active ? 1 : 0);
      auditDetails.active = !!body.active;
    }
    if (body.category_id !== undefined) {
      const catId = Number(body.category_id);
      if (!Number.isInteger(catId) || catId < 1) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      const cat = db.prepare("SELECT id FROM categories WHERE id = ?").get(catId);
      if (!cat) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      fields.push("category_id = ?"); values.push(catId);
    }
    if (body.deleted !== undefined) {
      fields.push("deleted = ?"); values.push(body.deleted ? 1 : 0);
      auditDetails.deleted = !!body.deleted;
    }
    if (body.image_url !== undefined) { fields.push("image_url = ?"); values.push(sanitizeImageUrl(body.image_url)); }
    if (body.sort_order !== undefined) {
      const so = Number(body.sort_order);
      if (!Number.isInteger(so)) {
        return NextResponse.json({ error: "Invalid sort order" }, { status: 400 });
      }
      fields.push("sort_order = ?"); values.push(so);
    }
    if (body.track_stock !== undefined) {
      fields.push("track_stock = ?"); values.push(body.track_stock ? 1 : 0);
      auditDetails.track_stock = !!body.track_stock;
    }
    if (body.stock_qty !== undefined) {
      const stockQty = Number(body.stock_qty);
      if (!Number.isInteger(stockQty) || stockQty < 0) {
        return NextResponse.json({ error: "Stock quantity must be a non-negative integer" }, { status: 400 });
      }
      fields.push("stock_qty = ?"); values.push(stockQty);
      auditDetails.stock_qty = stockQty;
    }
    if (fields.length > 0) {
      values.push(numId);
      db.prepare(`UPDATE menu_items SET ${fields.join(", ")} WHERE id = ?`).run(...values);
      const action = body.deleted ? "delete" : body.active !== undefined ? (body.active ? "activate" : "deactivate") : "update";
      logAudit(db, session, action, "menu_item", numId, auditDetails);
    }
    const item = db.prepare("SELECT mi.*, c.name as category_name FROM menu_items mi JOIN categories c ON mi.category_id = c.id WHERE mi.id = ?").get(numId);
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
