import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const phone = url.searchParams.get("phone");

    if (!phone || phone.trim().length < 5) {
      return NextResponse.json({ error: "Please provide a valid phone number" }, { status: 400 });
    }

    const db = getDb();
    const orders = db
      .prepare(
        "SELECT id, receipt_no, created_at, order_type, fulfillment_status, status, total_tsh, subtotal_tsh, payment_method, customer_name, customer_phone, customer_address FROM orders WHERE customer_phone = ? ORDER BY id DESC LIMIT 20"
      )
      .all(phone.trim());

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("[api/customer/orders] Error:", err);
    return NextResponse.json({ error: "Failed to load past orders" }, { status: 500 });
  }
}
