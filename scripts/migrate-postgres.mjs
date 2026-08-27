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
        ('Milo Mikuu (Rice, Pilau & Ugali)', 1),
        ('Chipsi & Mshikaki (Chips & Grill)', 2),
        ('Vinywaji Baridi (Sodas & Water)', 3),
        ('Juisi & Matunda (Fresh Juices & Fruits)', 4)
        RETURNING id, name;
      `);
      const catMap = Object.fromEntries(catResults.rows.map((r) => [r.name, r.id]));

      await client.query(`
        INSERT INTO menu_items (category_id, name, price_tsh, sort_order, description, is_featured, is_deal, prep_time_min, calories, spiciness, dietary_tags, options_json) VALUES
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Wali Nyama', 2000, 1, 'Wali mweupe uliopikwa vizuri, ukiambatana na mchuzi mtamu wa nyama ya ng''ombe, maharage ya nazi na mbogamboga za majani.', 1, 0, 12, 680, 'Mild', '["Halal","Mlo Kamili","Pendwa la Wengi"]', '{"variants":[{"name":"Sahani ya Kawaida","price_diff":0},{"name":"Sahani Kubwa (+TZS 1,000)","price_diff":1000}],"addons":[{"name":"Nyama ya Ziada","price":1000},{"name":"Maharage ya Ziada","price":500},{"name":"Mboga za Majani","price":500},{"name":"Kachumbari ya Pilipili","price":500}]}'),
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Wali Kuku', 3500, 2, 'Wali mweupe safi ukiambatana na kuku wa kukaanga au rosti, maharage ya nazi na mbogamboga safi.', 1, 0, 15, 720, 'Mild', '["Halal","Kuku Mtamu","Mlo Kamili"]', '{"variants":[{"name":"Kuku wa Kukaanga","price_diff":0},{"name":"Kuku wa Rosti","price_diff":0}],"addons":[{"name":"Kipande cha Kuku cha Ziada","price":2000},{"name":"Maharage ya Ziada","price":500},{"name":"Mboga za Majani","price":500}]}'),
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Pilau Nyama', 3000, 3, 'Pilau halisi ya Kiswahili iliyokolea viungo vya asili (iliki, karafuu, mdalasini), nyama laini ya ng''ombe, maharage, mbogamboga na kachumbari.', 1, 0, 15, 740, 'Medium', '["Halal","Pilau Halisi","Pendwa"]', '{"variants":[{"name":"Sahani ya Kawaida","price_diff":0},{"name":"Sahani Kubwa (+TZS 1,500)","price_diff":1500}],"addons":[{"name":"Nyama ya Ziada","price":1000},{"name":"Maharage ya Ziada","price":500},{"name":"Kachumbari Maalum","price":500}]}'),
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Pilau Kuku', 4000, 4, 'Pilau moto yenye viungo kamili vya pwani, ikisindikizwa na kuku wa kukaanga/rosto, maharage, mbogamboga na kachumbari.', 1, 0, 15, 790, 'Medium', '["Halal","Kuku Choma","Ladha ya Pwani"]', '{"variants":[{"name":"Kuku wa Kukaanga","price_diff":0},{"name":"Kuku wa Rosti","price_diff":0}],"addons":[{"name":"Kipande cha Kuku cha Ziada","price":2000},{"name":"Pilau ya Ziada","price":1500}]}'),
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Biryan nyama', 4000, 5, 'Mchele safi wa basmati wenye nakshi za viungo na rosti nzito ya nyama ya ng''ombe iliyotiwa mtindi, ndimu na viungo vya biryani.', 1, 0, 15, 760, 'Medium', '["Halal","Biryani Halisi","Chef Special"]', '{"variants":[{"name":"Sahani ya Kawaida","price_diff":0},{"name":"Sahani ya Familia (+TZS 3,500)","price_diff":3500}],"addons":[{"name":"Rosti ya Nyama ya Ziada","price":1500},{"name":"Yai la Kuchemsha","price":500},{"name":"Kachumbari ya Mtindi","price":500}]}'),
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Biryan Kuku', 6000, 6, 'Biryani ya kifalme ya kuku aliyelainika kwenye mchuzi mzito wa viungo vya asili, basmati yenye harufu nzuri na kachumbari.', 1, 0, 15, 840, 'Medium', '["Halal","Mlo wa Kifalme","Nyota ya Mgahawa"]', '{"variants":[{"name":"Portion Kamili","price_diff":0}],"addons":[{"name":"Kuku wa Ziada","price":2500},{"name":"Yai la Kuchemsha","price":500}]}'),
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Ugali nyama choma', 3000, 7, 'Ugali wa moto uliosongwa kwa unga safi, ukisindikizwa na nyama choma laini ya ng''ombe, mboga za majani na kachumbari.', 1, 0, 15, 690, 'Mild', '["Halal","Nyama Choma","Asili"]', '{"variants":[{"name":"Ugali Sembe","price_diff":0},{"name":"Ugali Dona","price_diff":0}],"addons":[{"name":"Nyama Choma ya Ziada","price":1500},{"name":"Mchuzi wa Rosti","price":500},{"name":"Mboga za Majani","price":500}]}'),
        (${catMap['Milo Mikuu (Rice, Pilau & Ugali)']}, 'Ugali samaki', 3000, 8, 'Ugali wa moto na samaki safi wa kukaanga au kupikwa rosti ya nyanya chungu na mboga za majani.', 0, 0, 20, 620, 'Mild', '["Halal","Samaki Safi","Afya"]', '{"variants":[{"name":"Samaki wa Kukaanga","price_diff":0},{"name":"Samaki wa Rosti","price_diff":0}],"addons":[{"name":"Samaki wa Ziada","price":2000},{"name":"Mchuzi wa Nazi","price":500}]}'),
        (${catMap['Chipsi & Mshikaki (Chips & Grill)']}, 'Chips plain', 2000, 1, 'Chipsi kavu za viazi vitamu vya mviringo vilivyokaangwa crispy na kugeuka rangi ya dhahabu.', 0, 0, 10, 420, 'Mild', '["Vegetarian","Crispy","Viazi Safi"]', '{"variants":[{"name":"Sahani ya Kawaida","price_diff":0},{"name":"Sahani Kubwa (Jumbo) (+TZS 1,500)","price_diff":1500}],"addons":[{"name":"Tomato & Pili Pili Sauce","price":0},{"name":"Kachumbari","price":500}]}'),
        (${catMap['Chipsi & Mshikaki (Chips & Grill)']}, 'Chips yai(zege)', 3000, 2, 'Chipsi zege maarufu: Chips moto zilizopikwa na mayai mawili safi ya kienyeji, kachumbari na pili-pili.', 1, 0, 10, 560, 'Medium', '["Vegetarian","Zege Tamu","Pendwa la Vijana"]', '{"variants":[{"name":"Mayai 2 (Kawaida)","price_diff":0},{"name":"Mayai 3 (+TZS 1,000)","price_diff":1000}],"addons":[{"name":"Pilipili ya Kukaanga","price":500},{"name":"Kachumbari ya Ziada","price":500}]}'),
        (${catMap['Chipsi & Mshikaki (Chips & Grill)']}, 'Chips Kuku 1/3', 5500, 3, 'Chipsi kavu moto zikiambatana na robo tatu (1/3) ya kuku wa kukaanga/kuchoma na kachumbari safi.', 1, 0, 15, 790, 'Mild', '["Halal","Kuku 1/3","Crispy"]', '{"variants":[{"name":"Kuku wa Kukaanga","price_diff":0},{"name":"Kuku wa Kuchoma","price_diff":0}],"addons":[{"name":"Kipande cha Kuku cha Ziada","price":2500},{"name":"Chips za Ziada","price":1000}]}'),
        (${catMap['Chipsi & Mshikaki (Chips & Grill)']}, 'Chips yai Kuku 1/3', 6500, 4, 'Mchanganyiko kamili wa chipsi zege moto ya mayai 2 pamoja na robo tatu (1/3) ya kuku mtamu wa choma au kukaanga.', 1, 1, 15, 890, 'Medium', '["Halal","Super Combo","Mlo Kamili"]', '{"variants":[{"name":"Kuku Choma","price_diff":0},{"name":"Kuku wa Kukaanga","price_diff":0}],"addons":[{"name":"Yai la Ziada kwenye Zege","price":1000},{"name":"Kachumbari ya Ziada","price":500}]}'),
        (${catMap['Chipsi & Mshikaki (Chips & Grill)']}, 'Mshkaki wa ng''ombe', 500, 5, 'Mshikaki mmoja wa nyama laini ya ng''ombe iliyokolea viungo vya tangawizi, vitunguu swaumu, ndimu na kuchomwa kwenye mkaa moto.', 0, 0, 8, 120, 'Medium', '["Halal","Mkaa Choma","Kitafunwa"]', '{"addons":[{"name":"Pili Pili Kali ya Pembeni","price":0}]}'),
        (${catMap['Chipsi & Mshikaki (Chips & Grill)']}, 'mshkaki wa Kuku', 1000, 6, 'Mshikaki wa minofu safi ya kuku iliyolowekwa kwenye viungo maalum na kuchomwa kwa ustadi.', 0, 0, 8, 150, 'Medium', '["Halal","Minofu ya Kuku","Moto"]', '{"addons":[{"name":"Pili Pili Kali","price":0}]}'),
        (${catMap['Juisi & Matunda (Fresh Juices & Fruits)']}, 'Ndizi', 500, 3, 'Ndizi mbivu tamu ya asili au ndizi ya kukaanga/kuchoma ya kuongeza nguvu.', 0, 0, 1, 90, 'Mild', '["Tunda Safi","Asili"]', '{"variants":[{"name":"Ndizi Mbivu","price_diff":0},{"name":"Ndizi ya Kuchoma","price_diff":0},{"name":"Ndizi ya Kukaanga","price_diff":0}]}'),
        (${catMap['Vinywaji Baridi (Sodas & Water)']}, 'Maji 1l.', 500, 1, 'Maji safi ya asili ya kunywa ya chupa ya Lita 1 (1L), yaliyopozwa vizuri.', 0, 0, 1, 0, 'Mild', '["Maji Safi","Baridi"]', '{"variants":[{"name":"Maji ya Baridi","price_diff":0},{"name":"Maji ya Kawaida (Room Temp)","price_diff":0}]}'),
        (${catMap['Vinywaji Baridi (Sodas & Water)']}, 'maji 1.6l', 800, 2, 'Chupa kubwa ya maji safi ya kunywa ya Lita 1.6 (1.6L) ya kuburudisha kiu yako na timu.', 0, 0, 1, 0, 'Mild', '["Maji Safi","Chupa Kubwa"]', '{"variants":[{"name":"Maji ya Baridi","price_diff":0},{"name":"Maji ya Kawaida (Room Temp)","price_diff":0}]}'),
        (${catMap['Vinywaji Baridi (Sodas & Water)']}, 'Soda (Pepsi products,and coca-cola products,', 700, 3, 'Soda baridi ya chupa ya kioo (Coca-Cola, Fanta, Sprite, Pepsi, Mirinda, Sparletta).', 0, 0, 1, 140, 'Mild', '["Kinywaji Baridi","Chupa ya Kioo"]', '{"variants":[{"name":"Coca-Cola","price_diff":0},{"name":"Pepsi","price_diff":0},{"name":"Fanta Orange","price_diff":0},{"name":"Sprite","price_diff":0},{"name":"Mirinda","price_diff":0},{"name":"Sparletta","price_diff":0}]}'),
        (${catMap['Vinywaji Baridi (Sodas & Water)']}, 'Soda take away', 1000, 4, 'Soda ya chupa ya plastiki (PET) au kopo ya kuchukua popote bila kurejesha chupa.', 0, 0, 1, 150, 'Mild', '["Take Away","Kopo / PET"]', '{"variants":[{"name":"Coca-Cola PET 500ml","price_diff":0},{"name":"Pepsi PET 500ml","price_diff":0},{"name":"Fanta PET 500ml","price_diff":0},{"name":"Sprite PET 500ml","price_diff":0}]}'),
        (${catMap['Vinywaji Baridi (Sodas & Water)']}, 'Azam cola (soda products)', 500, 5, 'Soda baridi ya Azam (Azam Cola, Azam Orange, Azam Embe, Azam Malti).', 0, 0, 1, 130, 'Mild', '["Azam Products","Kinywaji Baridi"]', '{"variants":[{"name":"Azam Cola","price_diff":0},{"name":"Azam Orange","price_diff":0},{"name":"Azam Embe","price_diff":0},{"name":"Azam Malti","price_diff":0}]}'),
        (${catMap['Vinywaji Baridi (Sodas & Water)']}, 'Afiya (soda products)', 500, 6, 'Kinywaji baridi na kitamu cha matunda cha chapa ya Afya.', 0, 0, 1, 110, 'Mild', '["Afya Drink","Kuburudisha"]', '{"variants":[{"name":"Afya Mango","price_diff":0},{"name":"Afya Passion","price_diff":0},{"name":"Afya Orange","price_diff":0}]}'),
        (${catMap['Juisi & Matunda (Fresh Juices & Fruits)']}, 'Fresh fruits smoothy Juice', 1000, 1, 'Juisi freshi ya asili ya matunda mchanganyiko (embe, parachichi, nanasi, passion) iliyotengenezwa bila maji ya ziada.', 1, 0, 4, 160, 'Mild', '["100% Asili","Matunda Freshi","Bila Sukari"]', '{"variants":[{"name":"Mchanganyiko (Embe, Parachichi, Nanasi)","price_diff":0},{"name":"Embe & Passion","price_diff":0},{"name":"Parachichi Safi","price_diff":0}]}'),
        (${catMap['Juisi & Matunda (Fresh Juices & Fruits)']}, 'special fruits smoothy juice', 1500, 2, 'Juisi maalum yenye nguvu: Matunda freshi, asali mbichi ya nyuki, tende, maziwa freshi na karanga.', 1, 0, 5, 280, 'Mild', '["Special Energy","Virutubisho","Pendwa la Ofisi"]', '{"variants":[{"name":"Special Mix Kamili","price_diff":0},{"name":"Special Bila Maziwa","price_diff":0}]}');
      `);
      console.log("Seeded categories and menu items.");
    }

    // Check & Seed Corporate Menu Packages
    const pkgCount = await client.query("SELECT COUNT(*) as n FROM corporate_menu_packages");
    if (parseInt(pkgCount.rows[0].n, 10) === 0) {
      const biryaniNyamaRes = await client.query("SELECT id FROM menu_items WHERE name = 'Biryan nyama' LIMIT 1");
      const biryaniKukuRes = await client.query("SELECT id FROM menu_items WHERE name = 'Biryan Kuku' LIMIT 1");
      const pilauNyamaRes = await client.query("SELECT id FROM menu_items WHERE name = 'Pilau Nyama' LIMIT 1");
      const waliKukuRes = await client.query("SELECT id FROM menu_items WHERE name = 'Wali Kuku' LIMIT 1");
      const chipsKukuRes = await client.query("SELECT id FROM menu_items WHERE name = 'Chips Kuku 1/3' LIMIT 1");
      const chipsZegeKukuRes = await client.query("SELECT id FROM menu_items WHERE name = 'Chips yai Kuku 1/3' LIMIT 1");
      const mshikakiNgombeRes = await client.query("SELECT id FROM menu_items WHERE name LIKE 'Mshkaki wa ng%' LIMIT 1");
      const maji1LRes = await client.query("SELECT id FROM menu_items WHERE name LIKE 'Maji 1l%' LIMIT 1");
      const sodaRes = await client.query("SELECT id FROM menu_items WHERE name LIKE 'Soda (Pepsi%' LIMIT 1");
      const freshJuiceRes = await client.query("SELECT id FROM menu_items WHERE name = 'Fresh fruits smoothy Juice' LIMIT 1");
      const specialJuiceRes = await client.query("SELECT id FROM menu_items WHERE name = 'special fruits smoothy juice' LIMIT 1");

      const p1 = await client.query(`
        INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
        VALUES ('Individual Executive Swahili Lunch Box', 'Curated premium single-portion office lunch box', 'Each box includes 1 Biryani Nyama au Pilau Kuku (pamoja na mbogamboga & maharage), 1 Fresh Fruits Smoothie Juice, na 1 Maji 1L pamoja na vifaa vya kulia & serviette.', 6500, 5, 5, 2, 'Most Popular', 1)
        RETURNING id;
      `);
      const p1Id = p1.rows[0].id;
      if (biryaniNyamaRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 1)", [p1Id, biryaniNyamaRes.rows[0].id]);
      if (freshJuiceRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 1)", [p1Id, freshJuiceRes.rows[0].id]);
      if (maji1LRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 1)", [p1Id, maji1LRes.rows[0].id]);

      const p2 = await client.query(`
        INSERT INTO corporate_menu_packages (name, tagline, description, price_tsh, minimum_quantity, serves_people_min, lead_time_hours, badge, sort_order)
        VALUES ('Team Swahili Feast (Serves 10)', 'Chakula cha pamoja kwa ajili ya timu nzima ofisini', 'Inajumuisha milo 10 mikubwa: 4x Pilau Nyama, 3x Wali Kuku, 3x Chips Yai Kuku 1/3, ikisindikizwa na 10x Soda baridi, maharage na mbogamboga.', 50000, 1, 10, 2, 'Team Value', 2)
        RETURNING id;
      `);
      const p2Id = p2.rows[0].id;
      if (pilauNyamaRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 4)", [p2Id, pilauNyamaRes.rows[0].id]);
      if (waliKukuRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 3)", [p2Id, waliKukuRes.rows[0].id]);
      if (chipsZegeKukuRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 3)", [p2Id, chipsZegeKukuRes.rows[0].id]);
      if (sodaRes.rows[0]) await client.query("INSERT INTO corporate_menu_package_items (package_id, menu_item_id, quantity) VALUES ($1, $2, 10)", [p2Id, sodaRes.rows[0].id]);

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
