import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, template_id, previous_order_id } = body;

    const db = getDb();
    let rawItems = items;

    if (!rawItems && template_id) {
      const templateItems = db.prepare(`
        SELECT menu_item_id, package_id, name_snapshot, quantity, options_snapshot
        FROM corporate_order_template_items
        WHERE template_id = ?
      `).all(template_id) as any[];
      rawItems = templateItems.map((ti) => ({
        menu_item_id: ti.menu_item_id,
        package_id: ti.package_id,
        name: ti.name_snapshot,
        quantity: ti.quantity,
        options: ti.options_snapshot ? JSON.parse(ti.options_snapshot) : undefined,
      }));
    } else if (!rawItems && previous_order_id) {
      const orderItems = db.prepare(`
        SELECT menu_item_id, name_snapshot, quantity, options_snapshot
        FROM order_items
        WHERE order_id = ?
      `).all(previous_order_id) as any[];
      rawItems = orderItems.map((oi) => ({
        menu_item_id: oi.menu_item_id,
        name: oi.name_snapshot,
        quantity: oi.quantity,
        options: oi.options_snapshot ? JSON.parse(oi.options_snapshot) : undefined,
      }));
    }

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: "No items specified for repeat order validation." }, { status: 400 });
    }

    const validatedItems: any[] = [];
    const warnings: string[] = [];
    let currentSubtotal = 0;

    for (const item of rawItems) {
      const quantity = Math.max(1, Number(item.quantity) || 1);

      if (item.package_id) {
        const pkg = db.prepare(`
          SELECT id, name, price_tsh, minimum_quantity, is_active
          FROM corporate_menu_packages
          WHERE id = ? AND is_active = 1
        `).get(item.package_id) as any;

        if (!pkg) {
          warnings.push(`Package "${item.name || 'Corporate Package'}" is no longer available and was excluded.`);
          continue;
        }

        const validQty = Math.max(pkg.minimum_quantity, quantity);
        const lineTotal = pkg.price_tsh * validQty;
        currentSubtotal += lineTotal;

        validatedItems.push({
          type: "package",
          package_id: pkg.id,
          name: pkg.name,
          unit_price_tsh: pkg.price_tsh,
          quantity: validQty,
          line_total_tsh: lineTotal,
          minimum_quantity: pkg.minimum_quantity,
        });
      } else if (item.menu_item_id) {
        const menuItem = db.prepare(`
          SELECT id, name, price_tsh, track_stock, stock_qty, active, deleted, options_json
          FROM menu_items
          WHERE id = ?
        `).get(item.menu_item_id) as any;

        if (!menuItem || !menuItem.active || menuItem.deleted) {
          warnings.push(`Item "${item.name || 'Menu item'}" is currently unavailable and was excluded.`);
          continue;
        }

        if (menuItem.track_stock && menuItem.stock_qty < quantity) {
          if (menuItem.stock_qty <= 0) {
            warnings.push(`"${menuItem.name}" is currently out of stock and was excluded.`);
            continue;
          } else {
            warnings.push(`"${menuItem.name}" stock is limited to ${menuItem.stock_qty} (adjusted from ${quantity}).`);
          }
        }

        const adjustedQty = menuItem.track_stock ? Math.min(quantity, Math.max(1, menuItem.stock_qty)) : quantity;
        let unitPrice = menuItem.price_tsh;

        // Parse and validate options if any
        let optionsConfig: any = {};
        try {
          if (menuItem.options_json) optionsConfig = JSON.parse(menuItem.options_json);
        } catch {}

        let selectedVariant = item.options?.variant || item.variant || null;
        let selectedAddons: any[] = [];

        if (selectedVariant && optionsConfig.variants) {
          const foundVariant = optionsConfig.variants.find((v: any) => v.name === selectedVariant);
          if (foundVariant) {
            unitPrice += Number(foundVariant.price_diff || 0);
          }
        }

        if (Array.isArray(item.options?.addons || item.addons) && optionsConfig.addons) {
          for (const rawAddon of item.options?.addons || item.addons) {
            const addonName = typeof rawAddon === "string" ? rawAddon : rawAddon.name;
            const foundAddon = optionsConfig.addons.find((a: any) => a.name === addonName);
            if (foundAddon) {
              unitPrice += Number(foundAddon.price || 0);
              selectedAddons.push({ name: foundAddon.name, price: foundAddon.price });
            }
          }
        }

        const lineTotal = unitPrice * adjustedQty;
        currentSubtotal += lineTotal;

        validatedItems.push({
          type: "item",
          menu_item_id: menuItem.id,
          name: menuItem.name,
          unit_price_tsh: unitPrice,
          quantity: adjustedQty,
          line_total_tsh: lineTotal,
          variant: selectedVariant,
          addons: selectedAddons,
          instructions: item.instructions || item.options?.instructions || "",
        });
      }
    }

    if (validatedItems.length === 0) {
      return NextResponse.json({
        error: "None of the items in this previous order or template are currently active in our kitchen.",
        warnings,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      items: validatedItems,
      subtotal_tsh: currentSubtotal,
      warnings,
    });
  } catch (error) {
    console.error("[api/public/corporate/repeat] Error re-validating order:", error);
    return NextResponse.json({ error: "Failed to validate repeat order." }, { status: 500 });
  }
}
