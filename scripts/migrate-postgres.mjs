import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is not defined.");
    console.error("Please ensure DATABASE_URL is set in your environment / secrets.");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL / Supabase database...");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    console.log("Connected successfully! Creating PostgreSQL schema tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('cashier','manager')),
        active INTEGER NOT NULL DEFAULT 1,
        token_version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        name TEXT NOT NULL,
        price_tsh INTEGER NOT NULL CHECK(price_tsh >= 0),
        image_url TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        deleted INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        track_stock INTEGER NOT NULL DEFAULT 0,
        stock_qty INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        is_featured INTEGER NOT NULL DEFAULT 0,
        is_deal INTEGER NOT NULL DEFAULT 0,
        prep_time_min INTEGER NOT NULL DEFAULT 15,
        calories INTEGER NOT NULL DEFAULT 0,
        spiciness TEXT NOT NULL DEFAULT 'Mild',
        dietary_tags TEXT DEFAULT '[]',
        options_json TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS corporate_accounts (
        id SERIAL PRIMARY KEY,
        company_name TEXT NOT NULL,
        legal_name TEXT,
        account_code TEXT NOT NULL UNIQUE,
        billing_email TEXT NOT NULL,
        billing_phone TEXT NOT NULL,
        tax_id TEXT,
        payment_terms TEXT NOT NULL DEFAULT 'DUE_ON_DELIVERY' CHECK(payment_terms IN ('PREPAID','DUE_ON_DELIVERY','NET_7','NET_14','NET_30')),
        credit_limit_tsh INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED','INACTIVE')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_corp_accounts_code ON corporate_accounts(account_code);

      CREATE TABLE IF NOT EXISTS corporate_locations (
        id SERIAL PRIMARY KEY,
        corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        area TEXT NOT NULL,
        building_name TEXT NOT NULL,
        address TEXT NOT NULL,
        floor TEXT,
        office_number TEXT,
        delivery_instructions TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS corporate_contacts (
        id SERIAL PRIMARY KEY,
        corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'order_contact' CHECK(role IN ('order_contact','billing_contact','approver','administrator')),
        is_primary INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        receipt_no TEXT NOT NULL UNIQUE,
        cashier_id INTEGER NOT NULL REFERENCES users(id),
        subtotal_tsh INTEGER NOT NULL,
        discount_type TEXT NOT NULL DEFAULT 'none' CHECK(discount_type IN ('none','percent','fixed')),
        discount_value INTEGER NOT NULL DEFAULT 0,
        discount_amount_tsh INTEGER NOT NULL DEFAULT 0,
        total_tsh INTEGER NOT NULL,
        payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','mobile','card','bank_transfer','invoice')),
        status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed','voided')),
        voided_at TIMESTAMPTZ,
        voided_by INTEGER REFERENCES users(id),
        void_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        order_type TEXT NOT NULL DEFAULT 'pos',
        customer_name TEXT,
        customer_phone TEXT,
        customer_address TEXT,
        special_notes TEXT,
        fulfillment_status TEXT NOT NULL DEFAULT 'completed',
        estimated_delivery_at TIMESTAMPTZ,
        customer_id INTEGER,
        order_channel TEXT NOT NULL DEFAULT 'pos',
        is_scheduled INTEGER NOT NULL DEFAULT 0,
        scheduled_date TEXT,
        delivery_window_start TEXT,
        delivery_window_end TEXT,
        target_dispatch_at TEXT,
        company_name TEXT,
        attendee_count INTEGER,
        corporate_account_id INTEGER REFERENCES corporate_accounts(id)
      );
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(order_channel, fulfillment_status);
      CREATE INDEX IF NOT EXISTS idx_orders_scheduled ON orders(is_scheduled, scheduled_date);

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
        name_snapshot TEXT NOT NULL,
        unit_price_tsh INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        line_total_tsh INTEGER NOT NULL,
        options_snapshot TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS supplier_payments (
        id SERIAL PRIMARY KEY,
        supplier_name TEXT NOT NULL,
        amount_tsh INTEGER NOT NULL CHECK(amount_tsh > 0),
        paid_on DATE NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('produce','packaging','utilities','other')),
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_supplier_paid_on ON supplier_payments(paid_on);

      CREATE TABLE IF NOT EXISTS customer_accounts (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT,
        default_address TEXT,
        favorites_json TEXT DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS restaurant_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        name TEXT NOT NULL DEFAULT 'Sumaiyyah Fast Food',
        tagline TEXT NOT NULL DEFAULT 'Authentic Swahili Street Food, Hot & Fresh',
        phone TEXT NOT NULL DEFAULT '+255 700 000 000',
        whatsapp TEXT NOT NULL DEFAULT '255700000000',
        address TEXT NOT NULL DEFAULT 'Kariakoo, Dar es Salaam, Tanzania',
        opening_hours TEXT NOT NULL DEFAULT 'Mon–Sun: 8:00 AM – 11:00 PM',
        delivery_enabled INTEGER NOT NULL DEFAULT 1,
        delivery_fee_tsh INTEGER NOT NULL DEFAULT 2500,
        min_order_tsh INTEGER NOT NULL DEFAULT 5000,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        discount_type TEXT NOT NULL CHECK(discount_type IN ('percent','fixed')),
        discount_value INTEGER NOT NULL CHECK(discount_value > 0),
        min_order_tsh INTEGER NOT NULL DEFAULT 0,
        badge TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        user_name TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

      CREATE TABLE IF NOT EXISTS corporate_order_details (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        corporate_account_id INTEGER REFERENCES corporate_accounts(id),
        corporate_location_id INTEGER REFERENCES corporate_locations(id),
        corporate_contact_id INTEGER REFERENCES corporate_contacts(id),
        guest_company_name TEXT,
        guest_contact_name TEXT,
        guest_contact_phone TEXT,
        guest_contact_email TEXT,
        attendee_count INTEGER NOT NULL DEFAULT 1,
        service_context TEXT NOT NULL DEFAULT 'office_lunch' CHECK(service_context IN ('office_lunch','meeting_event','team_celebration','custom_bulk')),
        delivery_date TEXT NOT NULL,
        delivery_window TEXT NOT NULL,
        delivery_window_start TEXT,
        delivery_window_end TEXT,
        target_dispatch_time TEXT,
        building_name TEXT,
        floor_office TEXT,
        delivery_instructions TEXT,
        po_reference_number TEXT,
        invoice_required INTEGER NOT NULL DEFAULT 0,
        billing_status TEXT NOT NULL DEFAULT 'unbilled' CHECK(billing_status IN ('unbilled','invoiced','paid','waived')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_corp_order_date ON corporate_order_details(delivery_date);
      CREATE INDEX IF NOT EXISTS idx_corp_order_account ON corporate_order_details(corporate_account_id);

      CREATE TABLE IF NOT EXISTS corporate_menu_packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        tagline TEXT,
        description TEXT,
        price_tsh INTEGER NOT NULL CHECK(price_tsh > 0),
        minimum_quantity INTEGER NOT NULL DEFAULT 5,
        serves_people_min INTEGER NOT NULL DEFAULT 5,
        lead_time_hours INTEGER NOT NULL DEFAULT 2,
        badge TEXT,
        image_url TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS corporate_menu_package_items (
        id SERIAL PRIMARY KEY,
        package_id INTEGER NOT NULL REFERENCES corporate_menu_packages(id) ON DELETE CASCADE,
        menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
        quantity INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS corporate_order_templates (
        id SERIAL PRIMARY KEY,
        corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        default_location_id INTEGER REFERENCES corporate_locations(id),
        default_attendee_count INTEGER NOT NULL DEFAULT 10,
        created_by_name TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS corporate_order_template_items (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES corporate_order_templates(id) ON DELETE CASCADE,
        menu_item_id INTEGER REFERENCES menu_items(id),
        package_id INTEGER REFERENCES corporate_menu_packages(id),
        name_snapshot TEXT NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        options_snapshot TEXT
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        corporate_account_id INTEGER NOT NULL REFERENCES corporate_accounts(id),
        order_id INTEGER REFERENCES orders(id),
        status TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','OVERDUE','VOID')),
        subtotal_tsh INTEGER NOT NULL,
        tax_amount_tsh INTEGER NOT NULL DEFAULT 0,
        total_amount_tsh INTEGER NOT NULL,
        amount_paid_tsh INTEGER NOT NULL DEFAULT 0,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        due_date TEXT NOT NULL,
        paid_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_account ON invoices(corporate_account_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

      CREATE TABLE IF NOT EXISTS invoice_payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        amount_tsh INTEGER NOT NULL CHECK(amount_tsh > 0),
        payment_method TEXT NOT NULL CHECK(payment_method IN ('bank_transfer','mobile_money','cash','card','cheque')),
        reference_number TEXT,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        recorded_by INTEGER REFERENCES users(id),
        notes TEXT
      );
    `);

    console.log("Schema tables created/verified successfully.");

    // Check & Seed Restaurant Settings
    const resSettings = await client.query("SELECT COUNT(*) as n FROM restaurant_settings");
    if (parseInt(resSettings.rows[0].n, 10) === 0) {
      await client.query(`
        INSERT INTO restaurant_settings (id, name, tagline, phone, whatsapp, address, opening_hours, delivery_enabled, delivery_fee_tsh, min_order_tsh)
        VALUES (1, 'Sumaiyyah Fast Food', 'Authentic Swahili Street Food, Hot & Fresh', '+255 700 000 000', '255700000000', 'Kariakoo, Dar es Salaam, Tanzania', 'Mon–Sun: 8:00 AM – 11:00 PM', 1, 2500, 5000)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("Seeded restaurant settings.");
    }

    // Check & Seed Users
    const userCount = await client.query("SELECT COUNT(*) as n FROM users");
    if (parseInt(userCount.rows[0].n, 10) === 0) {
      const initEmail = process.env.INITIAL_MANAGER_EMAIL?.trim();
      const initPassword = process.env.INITIAL_MANAGER_PASSWORD;
      const initName = process.env.INITIAL_MANAGER_NAME?.trim() || "Operations Manager";

      if (initEmail && initPassword && initPassword.length >= 8) {
        const managerHash = bcrypt.hashSync(initPassword, 10);
        await client.query(
          "INSERT INTO users (email, name, password_hash, role, active) VALUES ($1, $2, $3, 'manager', 1)",
          [initEmail, initName, managerHash]
        );
        console.log(`[bootstrap] Initial manager account provisioned for ${initEmail}`);
      } else {
        const managerHash = bcrypt.hashSync("Manager123!", 10);
        const cashierHash = bcrypt.hashSync("Cashier123!", 10);
        await client.query(
          "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'manager')",
          ["manager@sumaiyyah.test", "Admin Manager", managerHash]
        );
        await client.query(
          "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, 'cashier')",
          ["cashier@sumaiyyah.test", "Default Cashier", cashierHash]
        );
        console.log("Seeded default manager and cashier accounts.");
      }
    }

    // Check & Seed Categories & Menu Items
    const catCount = await client.query("SELECT COUNT(*) as n FROM categories");
    if (parseInt(catCount.rows[0].n, 10) === 0) {
      const catResults = await client.query(`
        INSERT INTO categories (name, sort_order) VALUES
        ('Burgers', 1),
        ('Sides', 2),
        ('Drinks', 3),
        ('Specials', 4)
        RETURNING id, name;
      `);
      const catMap = Object.fromEntries(catResults.rows.map((r) => [r.name, r.id]));

      await client.query(`
        INSERT INTO menu_items (category_id, name, price_tsh, sort_order, description, is_featured, is_deal, prep_time_min, calories, spiciness, dietary_tags, options_json) VALUES
        (${catMap['Burgers']}, 'Classic Burger', 8500, 1, 'Char-grilled 100% prime beef patty, melted cheddar, crisp lettuce, ripe tomatoes, and signature house burger relish on a toasted brioche bun.', 1, 0, 12, 580, 'Mild', '["Halal","Popular","Signature"]', '{"variants":[{"name":"Single Patty (Regular)","price_diff":0},{"name":"Double Patty (+TZS 3,500)","price_diff":3500}],"addons":[{"name":"Extra Melted Cheddar","price":1500},{"name":"Crispy Beef Bacon","price":2000},{"name":"Fried Farm Egg","price":1000},{"name":"Extra House Sauce","price":1000},{"name":"Pickled Jalapeños","price":1000}]}'),
        (${catMap['Burgers']}, 'Spicy Chicken Burger', 9500, 2, 'Buttermilk marinated crispy chicken breast dunked in Swahili chili glaze, topped with tangy red cabbage slaw and chipotle mayo.', 1, 0, 15, 620, 'Spicy', '["Halal","Hot & Spicy","Chef Pick"]', '{"variants":[{"name":"Crispy Fried Chicken","price_diff":0},{"name":"Flame Grilled Chicken","price_diff":500}],"addons":[{"name":"Extra Chili Glaze","price":1000},{"name":"Pepper Jack Cheese","price":1500},{"name":"Pickled Jalapeños","price":1000},{"name":"Extra Slaw","price":1000}]}'),
        (${catMap['Burgers']}, 'Double Beef Burger', 12000, 3, 'Two 150g beef patties smashed with caramelized onions, double cheddar, pickles, and smoky barbecue aioli on a glossy sesame bun.', 1, 0, 14, 840, 'Medium', '["Halal","Heavyweight","Best Seller"]', '{"variants":[{"name":"Double Beef (Standard)","price_diff":0},{"name":"Triple Beef Monster (+TZS 4,500)","price_diff":4500}],"addons":[{"name":"Extra Melted Cheddar","price":1500},{"name":"Fried Farm Egg","price":1000},{"name":"Caramelized Onions","price":1000},{"name":"Smoky BBQ Sauce","price":1000}]}'),
        (${catMap['Sides']}, 'French Fries', 3500, 1, 'Crisp hand-cut Tanzanian potatoes tossed in rosemary sea salt and paprika seasoning.', 0, 0, 8, 340, 'Mild', '["Vegetarian","Vegan","Gluten-Free"]', '{"variants":[{"name":"Regular Portion","price_diff":0},{"name":"Large / Jumbo (+TZS 2,000)","price_diff":2000}],"addons":[{"name":"Loaded Cheese Sauce","price":1500},{"name":"Pili Pili Seasoning","price":500},{"name":"Garlic Mayo Dip","price":1000}]}'),
        (${catMap['Sides']}, 'Coleslaw', 2500, 2, 'Freshly shredded green & purple cabbage, crisp carrots, and raisins folded in creamy tangy house dressing.', 0, 0, 5, 180, 'Mild', '["Vegetarian","Healthy"]', '{"addons":[{"name":"Extra Dressing","price":500}]}'),
        (${catMap['Sides']}, 'Onion Rings', 4000, 3, 'Thick-cut sweet onion slices double-dipped in seasoned batter and fried till golden and shatteringly crunchy.', 0, 0, 9, 380, 'Mild', '["Vegetarian","Crispy"]', '{"addons":[{"name":"Sweet Chili Sauce","price":1000},{"name":"Garlic Herb Dip","price":1000}]}'),
        (${catMap['Drinks']}, 'Coca-Cola', 2000, 1, 'Chilled classic Coca-Cola served ice-cold with fresh lime slice upon request.', 0, 0, 2, 140, 'Mild', '["Refreshing"]', '{"variants":[{"name":"Can 330ml","price_diff":0},{"name":"Bottle 500ml (+TZS 500)","price_diff":500}]}'),
        (${catMap['Drinks']}, 'Mango Juice', 2500, 2, 'Freshly blended ripe coastal mango nectar with a hint of passion and crushed ice.', 1, 0, 4, 190, 'Mild', '["100% Fresh","No Added Sugar","Vegetarian"]', '{"variants":[{"name":"Standard 400ml","price_diff":0},{"name":"Large 600ml (+TZS 1,500)","price_diff":1500}]}'),
        (${catMap['Drinks']}, 'Water', 1000, 3, 'Pure natural spring mineral water, purified and chilled.', 0, 0, 1, 0, 'Mild', '["Zero Calorie"]', '{}'),
        (${catMap['Specials']}, 'Burger + Fries Combo', 11000, 1, 'Classic Burger paired with golden crispy fries and an ice-cold soft drink of your choice.', 1, 1, 14, 920, 'Mild', '["Halal","Value Combo","Best Deal"]', '{"variants":[{"name":"Classic Beef Combo","price_diff":0},{"name":"Spicy Chicken Combo (+TZS 1,500)","price_diff":1500},{"name":"Double Beef Combo (+TZS 3,500)","price_diff":3500}],"addons":[{"name":"Upgrade to Large Fries","price":1500},{"name":"Extra Cheese on Burger","price":1500},{"name":"Add Coleslaw Side","price":2000}]}'),
        (${catMap['Specials']}, 'Family Meal Deal', 35000, 2, 'Huge feast: 2 Classic Burgers, 2 Crispy Chicken Burgers, 3 Large Fries, 4 Soft Drinks, and a jumbo tub of coleslaw.', 1, 1, 20, 2400, 'Medium', '["Halal","Feast for 4-5","Mega Savings"]', '{"variants":[{"name":"Standard Family Box (4 Burgers + 3 Fries + 4 Drinks)","price_diff":0},{"name":"Deluxe Feast (+ Double Patties & Extra Wings) (+TZS 12,000)","price_diff":12000}],"addons":[{"name":"Add Onion Rings Platter","price":3500},{"name":"Add 4 Fresh Juices Upgrade","price":4000}]}');
      `);
      console.log("Seeded categories and menu items.");
    }

    // Check & Seed Corporate Menu Packages
    const pkgCount = await client.query("SELECT COUNT(*) as n FROM corporate_menu_packages");
    if (parseInt(pkgCount.rows[0].n, 10) === 0) {
      const burgerRes = await client.query("SELECT id FROM menu_items WHERE name = 'Classic Burger' LIMIT 1");
      const spicyRes = await client.query("SELECT id FROM menu_items WHERE name = 'Spicy Chicken Burger' LIMIT 1");
      const doubleRes = await client.query("SELECT id FROM menu_items WHERE name = 'Double Beef Burger' LIMIT 1");
      const friesRes = await client.query("SELECT id FROM menu_items WHERE name = 'French Fries' LIMIT 1");
      const slawRes = await client.query("SELECT id FROM menu_items WHERE name = 'Coleslaw' LIMIT 1");
      const ringsRes = await client.query("SELECT id FROM menu_items WHERE name = 'Onion Rings' LIMIT 1");
      const cokeRes = await client.query("SELECT id FROM menu_items WHERE name = 'Coca-Cola' LIMIT 1");
      const juiceRes = await client.query("SELECT id FROM menu_items WHERE name = 'Mango Juice' LIMIT 1");

      const p1 = await client.query(`
        INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
        VALUES ('Individual Executive Lunch Box', 'Complete curated meal box per attendee', 'Each box includes 1 Prime Burger of choice (Classic Beef or Crispy Chicken), 1 portion Hot Crispy Fries, 1 Fresh Coleslaw, and 1 Chilled Beverage with cutlery & serviette.', 14500, 5, 5, 2, 'Most Popular', 1)
        RETURNING id;
      `);
      const p1Id = p1.rows[0].id;
      if (burgerRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 1)", [p1Id, burgerRes.rows[0].id]);
      if (friesRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 1)", [p1Id, friesRes.rows[0].id]);
      if (slawRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 1)", [p1Id, slawRes.rows[0].id]);
      if (cokeRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 1)", [p1Id, cokeRes.rows[0].id]);

      const p2 = await client.query(`
        INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
        VALUES ('Team Burger Feast (Serves 10)', 'Office group sharing banquet', 'Includes 10 Assorted Char-Grilled Burgers (6 Classic Beef, 4 Crispy Spicy Chicken), 5 Jumbo Fries Trays, 10 Chilled Soft Drinks, and 4 Signature Dip Sauces.', 120000, 1, 10, 2, 'Team Value', 2)
        RETURNING id;
      `);
      const p2Id = p2.rows[0].id;
      if (burgerRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 6)", [p2Id, burgerRes.rows[0].id]);
      if (spicyRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 4)", [p2Id, spicyRes.rows[0].id]);
      if (friesRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 5)", [p2Id, friesRes.rows[0].id]);
      if (cokeRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 10)", [p2Id, cokeRes.rows[0].id]);

      console.log("Seeded corporate menu packages.");
    }

    console.log("All PostgreSQL / Supabase schema migrations completed successfully!");
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
