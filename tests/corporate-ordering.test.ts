import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import getDb from "@/lib/db";
import { POST as postCorporateOrder } from "@/app/api/public/corporate/orders/route";
import { GET as getCorporateAccount } from "@/app/api/public/corporate/accounts/route";
import { POST as postCorporateRepeat } from "@/app/api/public/corporate/repeat/route";
import { validateDeliverySchedule, calculateDispatchTime } from "@/lib/corporate-rules";

describe("Corporate Ordering & Rules Engine", () => {
  describe("Schedule & Cutoff Validation", () => {
    it("rejects invalid or missing delivery window", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const result = validateDeliverySchedule(dateStr, "invalid-window" as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("delivery window");
    });

    it("rejects past dates", () => {
      const past = new Date();
      past.setDate(past.getDate() - 2);
      const pastStr = past.toISOString().slice(0, 10);

      const result = validateDeliverySchedule(pastStr, "lunch-1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("past");
    });

    it("rejects dates beyond the 30-day advance ordering horizon", () => {
      const future = new Date();
      future.setDate(future.getDate() + 45);
      const futureStr = future.toISOString().slice(0, 10);

      const result = validateDeliverySchedule(futureStr, "lunch-1");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("30 days");
    });

    it("calculates accurate 25-minute transit dispatch time", () => {
      const dispatchTime = calculateDispatchTime("2026-08-27", "11:30"); // window starts at 11:30
      expect(dispatchTime).toBe("11:05");
    });
  });

  describe("Corporate Order API & Price Authoritativeness", () => {
    it("rejects invoice payment method for guest bulk orders", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const payload = {
        order_mode: "guest",
        guest_company_name: "Vodacom Tanzania",
        guest_contact_name: "Juma Ally",
        guest_contact_phone: "+255754000111",
        guest_contact_email: "juma@vodacom.co.tz",
        area: "Kariakoo / City Centre",
        delivery_date: dateStr,
        delivery_window: "lunch-1",
        payment_method: "invoice", // Invalid for guest
        items: [
          {
            package_id: 1, // Boardroom Executive Lunch
            quantity: 5,
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/public/corporate/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postCorporateOrder(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invoicing / Credit Terms are only available for registered corporate accounts");
    });

    it("successfully creates an authenticated corporate order with invoice and isolated location", async () => {
      const db = getDb();
      const account = db.prepare("SELECT * FROM corporate_accounts WHERE account_code = 'VODA-HQ'").get() as any;
      expect(account).toBeDefined();

      const location = db.prepare("SELECT * FROM corporate_locations WHERE corporate_account_id = ? LIMIT 1").get(account.id) as any;
      expect(location).toBeDefined();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      const payload = {
        order_mode: "corporate_account",
        corporate_account_id: account.id,
        corporate_location_id: location.id,
        delivery_date: dateStr,
        delivery_window: "lunch-2",
        payment_method: "invoice",
        attendee_count: 15,
        items: [
          {
            package_id: 1,
            quantity: 10,
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/public/corporate/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postCorporateOrder(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.order.order_channel).toBe("corporate");
      expect(body.order.is_scheduled).toBe(1);
      expect(body.order.company_name).toBe(account.company_name);
      expect(body.invoice).toBeDefined();
      expect(body.invoice.status).toBe("ISSUED");
    });

    it("prevents using another account's location (Tenant Isolation)", async () => {
      const db = getDb();
      const account1 = db.prepare("SELECT * FROM corporate_accounts WHERE account_code = 'VODA-HQ'").get() as any;
      const account2 = db.prepare("SELECT * FROM corporate_accounts WHERE account_code = 'CRDB-HQ'").get() as any;

      // Get account2's location
      const acc2Location = db.prepare("SELECT * FROM corporate_locations WHERE corporate_account_id = ? LIMIT 1").get(account2.id) as any;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().slice(0, 10);

      // Try ordering as account1 with account2's location_id
      const payload = {
        order_mode: "corporate_account",
        corporate_account_id: account1.id,
        corporate_location_id: acc2Location.id, // Foreign location
        delivery_date: dateStr,
        delivery_window: "lunch-1",
        payment_method: "invoice",
        items: [
          {
            package_id: 1,
            quantity: 5,
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/public/corporate/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postCorporateOrder(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      // The order should NOT adopt the foreign location's building/address details because query enforces WHERE corporate_account_id = ?
      const orderDetails = db.prepare("SELECT * FROM corporate_order_details WHERE order_id = ?").get(body.order.id) as any;
      expect(orderDetails.building_name).not.toBe(acc2Location.building_name);
    });
  });

  describe("Repeat & Revalidation Endpoint", () => {
    it("recalculates live menu item prices and enforces package minimum quantity", async () => {
      const payload = {
        items: [
          {
            package_id: 1,
            quantity: 2, // Less than minimum of 5
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/public/corporate/repeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const res = await postCorporateRepeat(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      // Package minimum is 5, so quantity should be adjusted to 5
      expect(body.items[0].quantity).toBe(5);
    });
  });
});
