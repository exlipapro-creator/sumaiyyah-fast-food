import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { validateDeliverySchedule } from "@/lib/corporate-rules";

export const dynamic = "force-dynamic";

class InsufficientStockError extends Error {
  constructor(public itemName: string) {
    super(`Not enough stock for "${itemName}"`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      order_mode = "guest_bulk",
      corporate_account_id,
      corporate_location_id,
      corporate_contact_id,
      guest_company_name,
      guest_contact_name,
      guest_contact_phone,
      guest_contact_email,
      area,
      building,
      floor,
      office_number,
      delivery_instructions,
      delivery_date,
      delivery_window,
      service_context = "office_lunch",
      attendee_count = 1,
      po_reference_number,
      payment_method = "mobile",
      invoice_required = false,
      special_notes,
      items,
    } = body;

    // Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Please select at least one corporate package or menu item." }, { status: 400 });
    }

    // Validate Scheduling & Cutoffs
    const scheduleCheck = validateDeliverySchedule(delivery_date, delivery_window);
    if (!scheduleCheck.valid) {
      return NextResponse.json({ error: scheduleCheck.error }, { status: 400 });
    }

    const attendeeCountNum = Math.max(1, Math.min(500, Number(attendee_count) || 1));
    const db = getDb();

    // Resolve Corporate Account or Guest Details
    let resolvedCompanyName = "";
    let resolvedContactName = "";
    let resolvedContactPhone = "";
    let resolvedContactEmail = "";
    let resolvedFullAddress = "";
    let resolvedBuilding = building || "";
    let resolvedFloor = floor || "";
    let resolvedInstructions = delivery_instructions || "";
    let accountPaymentTerms = "DUE_ON_DELIVERY";

    if (order_mode === "corporate_account" && corporate_account_id) {
      const account = db.prepare(`
        SELECT id, company_name, billing_email, billing_phone, payment_terms, credit_limit_tsh, status
        FROM corporate_accounts
        WHERE id = ? AND status = 'ACTIVE'
      `).get(corporate_account_id) as any;

      if (!account) {
        return NextResponse.json({ error: "Selected corporate account is inactive or not found." }, { status: 400 });
      }

      resolvedCompanyName = account.company_name;
      accountPaymentTerms = account.payment_terms;

      // Location
      if (corporate_location_id) {
        const loc = db.prepare(`
          SELECT label, area, building_name, address, floor, office_number, delivery_instructions
          FROM corporate_locations
          WHERE id = ? AND corporate_account_id = ?
        `).get(corporate_location_id, corporate_account_id) as any;

        if (loc) {
          resolvedBuilding = loc.building_name;
          resolvedFloor = `${loc.floor || ""} ${loc.office_number ? `- ${loc.office_number}` : ""}`.trim();
          resolvedFullAddress = `${loc.area}, ${loc.address} (${loc.building_name}, ${resolvedFloor})`;
          if (loc.delivery_instructions) {
            resolvedInstructions = resolvedInstructions
              ? `${resolvedInstructions} | Note: ${loc.delivery_instructions}`
              : loc.delivery_instructions;
          }
        }
      }

      // Contact
      if (corporate_contact_id) {
        const contact = db.prepare(`
          SELECT full_name, email, phone FROM corporate_contacts WHERE id = ? AND corporate_account_id = ?
        `).get(corporate_contact_id, corporate_account_id) as any;

        if (contact) {
          resolvedContactName = contact.full_name;
          resolvedContactPhone = contact.phone;
          resolvedContactEmail = contact.email || account.billing_email;
        }
      } else {
        resolvedContactName = guest_contact_name || "Office Contact";
        resolvedContactPhone = guest_contact_phone || account.billing_phone;
        resolvedContactEmail = guest_contact_email || account.billing_email;
      }
    } else {
      // Guest Bulk Order Mode
      if (!guest_company_name || guest_company_name.trim().length < 2) {
        return NextResponse.json({ error: "Please enter company or organization name." }, { status: 400 });
      }
      if (!guest_contact_name || guest_contact_name.trim().length < 2) {
        return NextResponse.json({ error: "Please enter contact person name." }, { status: 400 });
      }
      if (!guest_contact_phone || guest_contact_phone.trim().length < 5) {
        return NextResponse.json({ error: "Please enter contact phone number." }, { status: 400 });
      }
      if (!area || area.trim().length < 2) {
        return NextResponse.json({ error: "Please select office area/location in Dar es Salaam." }, { status: 400 });
      }

      resolvedCompanyName = guest_company_name.trim();
      resolvedContactName = guest_contact_name.trim();
      resolvedContactPhone = guest_contact_phone.trim();
      resolvedContactEmail = (guest_contact_email || "").trim();
      resolvedBuilding = (building || "").trim();
      resolvedFloor = (floor || "").trim();
      resolvedInstructions = (delivery_instructions || "").trim();
      resolvedFullAddress = `${area}, ${resolvedBuilding ? `${resolvedBuilding}, ` : ""}${resolvedFloor ? `${resolvedFloor}` : ""}`.trim();
    }

    // Payment validation: Invoice is only permissible for Corporate Accounts
    const validPayments = ["mobile", "bank_transfer", "card", "cash", "invoice"];
    let finalPayment = validPayments.includes(payment_method) ? payment_method : "mobile";

    if (finalPayment === "invoice" && order_mode !== "corporate_account") {
      return NextResponse.json({ error: "Invoicing / Credit Terms are only available for registered corporate accounts." }, { status: 400 });
    }

    // Delivery fee & minimums from settings
    const settings = db.prepare("SELECT * FROM restaurant_settings WHERE id = 1").get() as any;
    const deliveryFee = settings?.delivery_fee_tsh ?? 2500;

    // Process & calculate authoritative line items
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
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: "Invalid item quantity" }, { status: 400 });
      }

      if (item.package_id) {
        // Corporate Package
        const pkg = db.prepare(`
          SELECT id, name, price_tsh, minimum_quantity, is_active
          FROM corporate_menu_packages
          WHERE id = ? AND is_active = 1
        `).get(item.package_id) as any;

        if (!pkg) {
          return NextResponse.json({ error: `Package "${item.name || item.package_id}" is currently unavailable.` }, { status: 400 });
        }

        if (quantity < pkg.minimum_quantity) {
          return NextResponse.json(
            { error: `"${pkg.name}" requires a minimum quantity of ${pkg.minimum_quantity}.` },
            { status: 400 }
          );
        }

        // Fetch primary or fallback menu item ID to fulfill order_items foreign key
        const firstPackageItem = db.prepare(`
          SELECT menu_item_id FROM corporate_menu_package_items WHERE package_id = ? LIMIT 1
        `).get(pkg.id) as { menu_item_id: number } | undefined;

        const fallbackItemId = firstPackageItem ? firstPackageItem.menu_item_id : 1;
        const lineTotal = pkg.price_tsh * quantity;
        subtotal += lineTotal;

        lineItems.push({
          menu_item_id: fallbackItemId,
          name_snapshot: `[PACKAGE] ${pkg.name}`,
          unit_price_tsh: pkg.price_tsh,
          quantity,
          line_total_tsh: lineTotal,
          trackStock: false,
          options_snapshot: JSON.stringify({
            package_id: pkg.id,
            package_name: pkg.name,
            notes: item.notes || item.instructions || "",
          }),
          notes: item.notes || item.instructions || undefined,
        });
      } else if (item.menu_item_id) {
        // Individual Menu Item
        const menuItem = db.prepare(`
          SELECT id, name, price_tsh, track_stock, stock_qty, options_json
          FROM menu_items
          WHERE id = ? AND active = 1 AND deleted = 0
        `).get(item.menu_item_id) as any;

        if (!menuItem) {
          return NextResponse.json({ error: `Dish "${item.name || item.menu_item_id}" is unavailable.` }, { status: 400 });
        }

        if (menuItem.track_stock && menuItem.stock_qty < quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for "${menuItem.name}". Available: ${menuItem.stock_qty}` },
            { status: 400 }
          );
        }

        let unitPrice = menuItem.price_tsh;
        let optionsConfig: any = {};
        try {
          if (menuItem.options_json) optionsConfig = JSON.parse(menuItem.options_json);
        } catch {}

        let selectedVariant = item.variant || null;
        let selectedAddons: any[] = [];

        if (selectedVariant && optionsConfig.variants) {
          const found = optionsConfig.variants.find((v: any) => v.name === selectedVariant);
          if (found) unitPrice += Number(found.price_diff || 0);
        }

        if (Array.isArray(item.addons) && optionsConfig.addons) {
          for (const rawAddon of item.addons) {
            const addonName = typeof rawAddon === "string" ? rawAddon : rawAddon.name;
            const found = optionsConfig.addons.find((a: any) => a.name === addonName);
            if (found) {
              unitPrice += Number(found.price || 0);
              selectedAddons.push({ name: found.name, price: found.price });
            }
          }
        }

        const lineTotal = unitPrice * quantity;
        subtotal += lineTotal;

        lineItems.push({
          menu_item_id: menuItem.id,
          name_snapshot: menuItem.name,
          unit_price_tsh: unitPrice,
          quantity,
          line_total_tsh: lineTotal,
          trackStock: !!menuItem.track_stock,
          options_snapshot: JSON.stringify({
            variant: selectedVariant,
            addons: selectedAddons,
            instructions: item.instructions || "",
          }),
          notes: item.instructions || undefined,
        });
      }
    }

    const grandTotal = subtotal + deliveryFee;
    const year = new Date().getFullYear();

    // Atomic execution of Order, Details, Items, and Invoice
    const transactionResult = db.transaction(() => {
      const maxSeq = db.prepare(
        `SELECT COALESCE(MAX(CAST(substr(receipt_no, 6) AS INTEGER)), 0) as m FROM orders WHERE receipt_no LIKE ?`
      ).get(`${year}-%`) as { m: number };
      const seq = maxSeq.m + 1;
      const receipt_no = `${year}-${String(seq).padStart(4, "0")}`;

      const orderResult = db.prepare(`
        INSERT INTO orders (
          receipt_no, cashier_id, subtotal_tsh, discount_type, discount_value, discount_amount_tsh, total_tsh,
          payment_method, order_type, order_channel, is_scheduled, scheduled_date,
          delivery_window_start, delivery_window_end, target_dispatch_at, company_name, attendee_count,
          customer_name, customer_phone, customer_address, special_notes,
          fulfillment_status, status, corporate_account_id
        )
        VALUES (?, 1, ?, 'none', 0, 0, ?, ?, 'delivery', 'corporate', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'completed', ?)
      `).run(
        receipt_no,
        subtotal,
        grandTotal,
        finalPayment,
        delivery_date,
        scheduleCheck.start_time,
        scheduleCheck.end_time,
        scheduleCheck.target_dispatch_time,
        resolvedCompanyName,
        attendeeCountNum,
        resolvedContactName,
        resolvedContactPhone,
        resolvedFullAddress,
        special_notes ? special_notes.trim() : null,
        corporate_account_id || null
      );

      const orderId = orderResult.lastInsertRowid as number;

      // Insert Corporate Order Details
      db.prepare(`
        INSERT INTO corporate_order_details (
          order_id, corporate_account_id, corporate_location_id, corporate_contact_id,
          guest_company_name, guest_contact_name, guest_contact_phone, guest_contact_email,
          attendee_count, service_context, delivery_date, delivery_window,
          delivery_window_start, delivery_window_end, target_dispatch_time,
          building_name, floor_office, delivery_instructions, po_reference_number,
          invoice_required, billing_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        corporate_account_id || null,
        corporate_location_id || null,
        corporate_contact_id || null,
        resolvedCompanyName,
        resolvedContactName,
        resolvedContactPhone,
        resolvedContactEmail || null,
        attendeeCountNum,
        service_context,
        delivery_date,
        scheduleCheck.delivery_window_label,
        scheduleCheck.start_time,
        scheduleCheck.end_time,
        scheduleCheck.target_dispatch_time,
        resolvedBuilding || null,
        resolvedFloor || null,
        resolvedInstructions || null,
        po_reference_number || null,
        invoice_required || finalPayment === "invoice" ? 1 : 0,
        finalPayment === "invoice" ? "invoiced" : "unbilled"
      );

      // Insert line items & deduct stock
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

        if (li.trackStock) {
          const update = db.prepare(
            "UPDATE menu_items SET stock_qty = stock_qty - ? WHERE id = ? AND stock_qty >= ?"
          ).run(li.quantity, li.menu_item_id, li.quantity);
          if (update.changes === 0) {
            throw new InsufficientStockError(li.name_snapshot);
          }
        }
      }

      // Generate invoice if corporate account payment terms or requested
      let generatedInvoiceNumber: string | null = null;
      if (corporate_account_id && (finalPayment === "invoice" || invoice_required)) {
        const invSeq = db.prepare(`SELECT COUNT(*) as n FROM invoices WHERE invoice_number LIKE ?`).get(`INV-${year}-%`) as { n: number };
        generatedInvoiceNumber = `INV-${year}-${String(invSeq.n + 1).padStart(4, "0")}`;

        // Calculate due date based on payment terms
        const targetDelivery = new Date(delivery_date);
        let daysToAdd = 0;
        if (accountPaymentTerms === "NET_30") daysToAdd = 30;
        else if (accountPaymentTerms === "NET_14") daysToAdd = 14;
        else if (accountPaymentTerms === "NET_7") daysToAdd = 7;

        const dueDateObj = new Date(targetDelivery);
        dueDateObj.setDate(dueDateObj.getDate() + daysToAdd);
        const dueDateStr = dueDateObj.toISOString().split("T")[0];

        db.prepare(`
          INSERT INTO invoices (
            invoice_number, corporate_account_id, order_id, status, subtotal_tsh, tax_amount_tsh, total_amount_tsh,
            amount_paid_tsh, due_date, notes
          )
          VALUES (?, ?, ?, 'ISSUED', ?, 0, ?, 0, ?, ?)
        `).run(
          generatedInvoiceNumber,
          corporate_account_id,
          orderId,
          subtotal,
          grandTotal,
          dueDateStr,
          `Corporate scheduled order #${receipt_no} for ${resolvedCompanyName}`
        );
      }

      return { orderId, receipt_no, invoiceNumber: generatedInvoiceNumber };
    })();

    const orderRecord = db.prepare("SELECT * FROM orders WHERE id = ?").get(transactionResult.orderId);
    const orderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(transactionResult.orderId);

    return NextResponse.json(
      {
        success: true,
        order: orderRecord,
        items: orderItems,
        receipt_no: transactionResult.receipt_no,
        invoice_number: transactionResult.invoiceNumber,
        company_name: resolvedCompanyName,
        scheduled_date: delivery_date,
        delivery_window: scheduleCheck.delivery_window_label,
        target_dispatch_at: scheduleCheck.target_dispatch_time,
        fulfillment_status: "pending",
        total_tsh: grandTotal,
        subtotal_tsh: subtotal,
        delivery_fee_tsh: deliveryFee,
        tracking_url: `/track-order?receipt=${transactionResult.receipt_no}`,
        message: "Corporate order submitted successfully. Awaiting kitchen confirmation.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/public/corporate/orders] Error creating corporate order:", error);
    return NextResponse.json({ error: "Failed to place corporate order. Please try again." }, { status: 500 });
  }
}
