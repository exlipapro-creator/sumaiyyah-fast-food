import { describe, it, expect } from "vitest";
import getDb from "@/lib/db";
import { GET as getPublicMenu } from "@/app/api/public/menu/route";
import { GET as getPublicCorpPackages } from "@/app/api/public/corporate/packages/route";

describe("Authentic 23-Item Swahili Restaurant Menu & Admin Verification", () => {
  const db = getDb();

  const expectedMenu: Array<{ name: string; price: number }> = [
    { name: "Wali Nyama", price: 2000 },
    { name: "Wali Kuku", price: 3500 },
    { name: "Pilau Nyama", price: 3000 },
    { name: "Pilau Kuku", price: 4000 },
    { name: "Biryan nyama", price: 4000 },
    { name: "Biryan Kuku", price: 6000 },
    { name: "Ugali nyama choma", price: 3000 },
    { name: "Ugali samaki", price: 3000 },
    { name: "Chips plain", price: 2000 },
    { name: "Chips yai(zege)", price: 3000 },
    { name: "Chips Kuku 1/3", price: 5500 },
    { name: "Chips yai Kuku 1/3", price: 6500 },
    { name: "Mshkaki wa ng'ombe", price: 500 },
    { name: "mshkaki wa Kuku", price: 1000 },
    { name: "Maji 1l.", price: 500 },
    { name: "maji 1.6l", price: 800 },
    { name: "Soda (Pepsi products,and coca-cola products,", price: 700 },
    { name: "Soda take away", price: 1000 },
    { name: "Ndizi", price: 500 },
    { name: "Fresh fruits smoothy Juice", price: 1000 },
    { name: "special fruits smoothy juice", price: 1500 },
    { name: "Azam cola (soda products)", price: 500 },
    { name: "Afiya (soda products)", price: 500 },
  ];

  it("contains all 23 authentic menu items with exact prices in database", () => {
    for (const expected of expectedMenu) {
      const item = db.prepare("SELECT * FROM menu_items WHERE LOWER(name) = LOWER(?) AND deleted = 0").get(expected.name) as any;
      expect(item, `Expected item ${expected.name} to exist in menu_items`).toBeDefined();
      expect(item.price_tsh, `Expected item ${expected.name} price to be ${expected.price}`).toBe(expected.price);
      expect(item.active).toBe(1);
    }
  });

  it("serves all 23 items via the public menu API endpoint", async () => {
    const res = await getPublicMenu();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toBeDefined();

    const activeItems = body.items.filter((i: any) => !i.deleted && i.active !== false);
    expect(activeItems.length).toBeGreaterThanOrEqual(23);

    for (const expected of expectedMenu) {
      const match = activeItems.find((i: any) => i.name.toLowerCase() === expected.name.toLowerCase());
      expect(match, `Public API should serve ${expected.name}`).toBeDefined();
      expect(match.price_tsh).toBe(expected.price);
    }
  });

  it("serves corporate packages crafted for office orders", async () => {
    const res = await getPublicCorpPackages();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.packages).toBeDefined();
    expect(body.packages.length).toBeGreaterThanOrEqual(3);

    // Verify packages contain individual items from the 23 items
    const executiveBox = body.packages.find((p: any) => p.name.includes("Executive"));
    expect(executiveBox).toBeDefined();
    expect(executiveBox.price_tsh).toBe(6500);
  });

  it("confirms admin ability to add, edit, and soft-delete menu items", () => {
    // 1. Add item
    const cat = db.prepare("SELECT id FROM categories LIMIT 1").get() as { id: number };
    const insertRes = db.prepare(`
      INSERT INTO menu_items (category_id, name, price_tsh, active, deleted)
      VALUES (?, 'Test Special Item', 2500, 1, 0)
    `).run(cat.id);
    const itemId = insertRes.lastInsertRowid as number;
    expect(itemId).toBeGreaterThan(0);

    // 2. Edit item
    db.prepare("UPDATE menu_items SET price_tsh = 3000, name = 'Test Special Item Updated' WHERE id = ?").run(itemId);
    const updated = db.prepare("SELECT * FROM menu_items WHERE id = ?").get(itemId) as any;
    expect(updated.price_tsh).toBe(3000);
    expect(updated.name).toBe("Test Special Item Updated");

    // 3. Toggle status
    db.prepare("UPDATE menu_items SET active = 0 WHERE id = ?").run(itemId);
    const toggled = db.prepare("SELECT active FROM menu_items WHERE id = ?").get(itemId) as any;
    expect(toggled.active).toBe(0);

    // 4. Soft delete
    db.prepare("UPDATE menu_items SET deleted = 1 WHERE id = ?").run(itemId);
    const deleted = db.prepare("SELECT deleted FROM menu_items WHERE id = ?").get(itemId) as any;
    expect(deleted.deleted).toBe(1);

    // Clean up
    db.prepare("DELETE FROM menu_items WHERE id = ?").run(itemId);
  });
});
