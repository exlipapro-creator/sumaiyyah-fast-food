import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const receipt = url.searchParams.get("receipt");
    const phone = url.searchParams.get("phone");

    if (!receipt && !phone) {
      return NextResponse.json({ error: "Please provide an order receipt code or phone number" }, { status: 400 });
    }

    const db = getDb();
    let order: Record<string, unknown> | undefined;

    if (receipt) {
      order = db.prepare(`
        SELECT o.*, cod.service_context, cod.delivery_window, cod.building_name as corp_building,
               cod.floor_office, cod.delivery_instructions as corp_instructions,
               cod.po_reference_number, cod.billing_status,
               inv.invoice_number, inv.status as invoice_status, inv.due_date as invoice_due_date
        FROM orders o
        LEFT JOIN corporate_order_details cod ON cod.order_id = o.id
        LEFT JOIN invoices inv ON inv.order_id = o.id
        WHERE o.receipt_no = ?
      `).get(receipt.trim()) as Record<string, unknown> | undefined;
    } else if (phone) {
      order = db.prepare(`
        SELECT o.*, cod.service_context, cod.delivery_window, cod.building_name as corp_building,
               cod.floor_office, cod.delivery_instructions as corp_instructions,
               cod.po_reference_number, cod.billing_status,
               inv.invoice_number, inv.status as invoice_status, inv.due_date as invoice_due_date
        FROM orders o
        LEFT JOIN corporate_order_details cod ON cod.order_id = o.id
        LEFT JOIN invoices inv ON inv.order_id = o.id
        WHERE o.customer_phone = ? OR cod.guest_contact_phone = ?
        ORDER BY o.id DESC LIMIT 1
      `).get(phone.trim(), phone.trim()) as Record<string, unknown> | undefined;
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found. Please check your receipt code." }, { status: 404 });
    }

    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) as {
      id: number;
      name_snapshot: string;
      unit_price_tsh: number;
      quantity: number;
      line_total_tsh: number;
      options_snapshot: string | null;
      notes: string | null;
    }[];

    const parsedItems = items.map((it) => {
      let options: { variant?: string; addons?: { name: string; price: number }[]; instructions?: string } = {};
      try {
        if (it.options_snapshot) options = JSON.parse(it.options_snapshot);
      } catch {}
      return {
        ...it,
        name: it.name_snapshot,
        total_tsh: it.line_total_tsh,
        variant: options.variant,
        addons: options.addons || [],
        instructions: it.notes || options.instructions || "",
        options,
      };
    });

    const settings = db.prepare("SELECT name, phone, whatsapp, address, opening_hours FROM restaurant_settings WHERE id = 1").get() || {
      name: "Sumaiyyah Fast Food",
      phone: "+255 784 428 877",
      whatsapp: "255784428877",
      address: "Bibi Titi Mohammed Street, Posta, Dar es Salaam, Tanzania",
    };

    const enrichedOrder = {
      ...order,
      receipt_number: order.receipt_no,
      items: parsedItems,
    };

    return NextResponse.json({
      order: enrichedOrder,
      items: parsedItems,
      restaurant: settings,
    });
  } catch (err) {
    console.error("[api/public/orders/track] Error:", err);
    return NextResponse.json({ error: "Failed to look up order" }, { status: 500 });
  }
}
