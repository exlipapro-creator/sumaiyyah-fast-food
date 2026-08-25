import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

class InsufficientStockError extends Error {
  constructor(public itemName: string) {
    super(`Not enough stock for "${itemName}"`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fulfillment_type = body.fulfillment_type || body.order_type || "delivery";
    const customer_name = body.customer_name;
    const customer_phone = body.customer_phone;
    const customer_address = body.customer_address || body.delivery_address || "";
    const special_notes = body.special_notes || body.notes || "";
    const payment_method = body.payment_method || "cash";
    const promo_code = body.promo_code;
    const items = body.items;

    // Validate fulfillment type
    const validFulfillment = ["delivery", "pickup", "dine_in"];
    const fulfillment = validFulfillment.includes(fulfillment_type) ? fulfillment_type : "delivery";

    // Validate customer contact
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
      return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
    }
    if (!customer_phone || typeof customer_phone !== "string" || customer_phone.trim().length < 5) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
    }
    if (fulfillment === "delivery" && (!customer_address || typeof customer_address !== "string" || customer_address.trim().length < 3)) {
      return NextResponse.json({ error: "Please enter your delivery address" }, { status: 400 });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }

    const validPaymentMethods = ["cash", "mobile", "card"];
    const payment = validPaymentMethods.includes(payment_method) ? payment_method : "cash";

    const db = getDb();

    // Fetch restaurant settings for delivery fee
    const settings = db.prepare("SELECT * FROM restaurant_settings WHERE id = 1").get() as {
      delivery_fee_tsh: number;
      min_order_tsh: number;
      delivery_enabled: number;
    } | undefined;

    const deliveryFee = (fulfillment === "delivery" && settings) ? settings.delivery_fee_tsh : 0;
    const minOrder = settings?.min_order_tsh ?? 0;

    // Compute subtotal from authoritative prices & options
    let subtotal = 0;
    const lineItems: {
      menu_item_id: number;
      name_snapshot: string;
      unit_price_tsh: number;
      quantity: number;
      line_total_tsh: number;
      trackStock: boolean;
      options_snapshot: string;
      notes?: string;
    }[] = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "Invalid item payload" }, { status: 400 });
      }
      const menuItemId = Number(item.menu_item_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(menuItemId) || menuItemId < 1) {
        return NextResponse.json({ error: "Invalid item id" }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }

      const menuItem = db.prepare(
        "SELECT id, name, price_tsh, track_stock, stock_qty, options_json FROM menu_items WHERE id = ? AND active = 1 AND deleted = 0"
      ).get(menuItemId) as {
        id: number;
        name: string;
        price_tsh: number;
        track_stock: number;
        stock_qty: number;
        options_json: string | null;
      } | undefined;

      if (!menuItem) {
        return NextResponse.json({ error: `Dish "${item.name || menuItemId}" is currently unavailable` }, { status: 400 });
      }

      if (menuItem.track_stock && menuItem.stock_qty < quantity) {
        return NextResponse.json(
          { error: `Only ${menuItem.stock_qty} left of "${menuItem.name}". Please adjust quantity.` },
          { status: 400 }
        );
      }

      // Parse item options configuration from DB
      let optionsConfig: {
        variants?: { name: string; price_diff: number }[];
        addons?: { name: string; price: number }[];
      } = {};
      try {
        if (menuItem.options_json) {
          optionsConfig = JSON.parse(menuItem.options_json);
        }
      } catch {}

      // Calculate unit price based on verified variant and addons
      let unitPrice = menuItem.price_tsh;
      let selectedVariant = item.variant || null;
      let selectedAddons: { name: string; price: number }[] = [];

      if (selectedVariant && optionsConfig.variants) {
        const foundVariant = optionsConfig.variants.find((v) => v.name === selectedVariant);
        if (foundVariant) {
          unitPrice += Number(foundVariant.price_diff || 0);
        }
      }

      if (Array.isArray(item.addons) && optionsConfig.addons) {
        for (const rawAddon of item.addons) {
          const addonName = typeof rawAddon === "string" ? rawAddon : rawAddon.name;
          const foundAddon = optionsConfig.addons.find((a) => a.name === addonName);
          if (foundAddon) {
            unitPrice += Number(foundAddon.price || 0);
            selectedAddons.push({ name: foundAddon.name, price: foundAddon.price });
          }
        }
      }

      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      const optionsSnapshot = JSON.stringify({
        variant: selectedVariant,
        addons: selectedAddons,
        instructions: item.instructions || "",
      });

      lineItems.push({
        menu_item_id: menuItem.id,
        name_snapshot: menuItem.name,
        unit_price_tsh: unitPrice,
        quantity,
        line_total_tsh: lineTotal,
        trackStock: !!menuItem.track_stock,
        options_snapshot: optionsSnapshot,
        notes: item.instructions ? String(item.instructions).slice(0, 200) : undefined,
      });
    }

    if (subtotal < minOrder && fulfillment === "delivery") {
      return NextResponse.json(
        { error: `Minimum order for delivery is TZS ${minOrder.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Process promotion code
    let discountType: "none" | "percent" | "fixed" = "none";
    let discountValue = 0;
    let discountAmount = 0;

    if (promo_code && typeof promo_code === "string") {
      const cleanCode = promo_code.trim().toUpperCase();
      const promo = db.prepare(
        "SELECT * FROM promotions WHERE code = ? AND active = 1"
      ).get(cleanCode) as {
        code: string;
        discount_type: "percent" | "fixed";
        discount_value: number;
        min_order_tsh: number;
      } | undefined;

      if (promo) {
        if (subtotal >= promo.min_order_tsh) {
          discountType = promo.discount_type;
          discountValue = promo.discount_value;
          if (discountType === "percent") {
            discountAmount = Math.round((subtotal * discountValue) / 100);
          } else if (discountType === "fixed") {
            discountAmount = Math.min(subtotal, discountValue);
          }
        }
      }
    }

    const totalBeforeDelivery = subtotal - discountAmount;
    const grandTotal = totalBeforeDelivery + deliveryFee;

    // Generate receipt number YYYY-NNNN in atomic transaction
    const year = new Date().getFullYear();
    const result = db.transaction(() => {
      const maxSeq = db.prepare(
        `SELECT COALESCE(MAX(CAST(substr(receipt_no, 6) AS INTEGER)), 0) as m FROM orders WHERE receipt_no LIKE ?`
      ).get(`${year}-%`) as { m: number };
      const seq = maxSeq.m + 1;
      const receipt_no = `${year}-${String(seq).padStart(4, "0")}`;

      // Set cashier_id = 1 (default cashier/manager system user)
      const orderResult = db.prepare(`
        INSERT INTO orders (
          receipt_no, cashier_id, subtotal_tsh, discount_type, discount_value, discount_amount_tsh, total_tsh,
          payment_method, order_type, customer_name, customer_phone, customer_address, special_notes,
          fulfillment_status, status
        )
        VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'completed')
      `).run(
        receipt_no,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        grandTotal,
        payment,
        fulfillment,
        customer_name.trim(),
        customer_phone.trim(),
        customer_address ? customer_address.trim() : null,
        special_notes ? special_notes.trim() : null
      );

      const orderId = orderResult.lastInsertRowid;

      for (const li of lineItems) {
        db.prepare(`
          INSERT INTO order_items (order_id, menu_item_id, name_snapshot, unit_price_tsh, quantity, line_total_tsh, options_snapshot, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          orderId,
          li.menu_item_id,
          li.name_snapshot,
          li.unit_price_tsh,
          li.quantity,
          li.line_total_tsh,
          li.options_snapshot,
          li.notes || null
        );

        // Atomic stock decrement
        if (li.trackStock) {
          const stockUpdate = db.prepare(
            "UPDATE menu_items SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?"
          ).run(li.quantity, li.menu_item_id, li.quantity);
          if (stockUpdate.changes === 0) {
            throw new InsufficientStockError(li.name_snapshot);
          }
        }
      }

      return { orderId, receipt_no };
    })();

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(result.orderId);
    const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(result.orderId);

    return NextResponse.json(
      {
        success: true,
        order,
        items: orderItems,
        receipt_no: result.receipt_no,
        receipt_number: result.receipt_no,
        total_tsh: (order as any).total_tsh,
        subtotal_tsh: (order as any).subtotal_tsh,
        tracking_url: `/track-order?receipt=${result.receipt_no}`,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("[api/public/orders] Error creating customer order:", e);
    return NextResponse.json({ error: "Failed to place order. Please try again." }, { status: 500 });
  }
}
