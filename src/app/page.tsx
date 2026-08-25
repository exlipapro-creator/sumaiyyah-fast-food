import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = new Date().toISOString().slice(0, 7);

  const revenueToday = (db.prepare(
    "SELECT COALESCE(SUM(total_tsh), 0) as v FROM orders WHERE date(created_at) = ? AND status = 'completed'"
  ).get(today) as { v: number }).v;

  const transactionsToday = (db.prepare(
    "SELECT COUNT(*) as v FROM orders WHERE date(created_at) = ? AND status = 'completed'"
  ).get(today) as { v: number }).v;

  // Last sale time today
  const lastSale = db.prepare(
    "SELECT created_at FROM orders WHERE date(created_at) = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1"
  ).get(today) as { created_at: string } | undefined;

  // Items sold today broken down by category
  const itemsByCategory = db.prepare(`
    SELECT c.name as category, COALESCE(SUM(oi.quantity), 0) as qty
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    JOIN categories c ON mi.category_id = c.id
    WHERE date(o.created_at) = ? AND o.status = 'completed'
    GROUP BY c.id, c.name
    ORDER BY c.sort_order
  `).all(today) as { category: string; qty: number }[];

  const totalItemsToday = itemsByCategory.reduce((sum, r) => sum + r.qty, 0);

  const supplierMonth = (db.prepare(
    "SELECT COALESCE(SUM(amount_tsh), 0) as v FROM supplier_payments WHERE strftime('%Y-%m', paid_on) = ?"
  ).get(yearMonth) as { v: number }).v;

  const revenueMonth = (db.prepare(
    "SELECT COALESCE(SUM(total_tsh), 0) as v FROM orders WHERE strftime('%Y-%m', created_at) = ? AND status = 'completed'"
  ).get(yearMonth) as { v: number }).v;

  const profitMonth = revenueMonth - supplierMonth;

  return {
    revenueToday,
    transactionsToday,
    lastSale: lastSale?.created_at ?? null,
    itemsByCategory,
    totalItemsToday,
    supplierMonth,
    profitMonth,
  };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getDashboardData();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const lastSaleTime = data.lastSale
    ? new Date(data.lastSale).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <AppShell user={session}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">{dateStr}</p>
        </div>

        {/* Today stats */}
        <div>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Today</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              testId="stat-revenue-today"
              label="Revenue"
              value={data.revenueToday}
              isMoney={true}
              color="amber"
            />
            <StatCard
              testId="stat-transactions-today"
              label="Transactions"
              value={data.transactionsToday}
              isMoney={false}
              color="sky"
              subLabel={lastSaleTime ? `Last sale at ${lastSaleTime}` : undefined}
            />
            <StatCard
              testId="stat-items-today"
              label="Items Sold"
              value={data.totalItemsToday}
              isMoney={false}
              color="sky"
            />
          </div>
        </div>

        {/* Items sold by category */}
        {data.itemsByCategory.length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Items Sold by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.itemsByCategory.map(row => (
                <div
                  key={row.category}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3"
                >
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1 truncate">{row.category}</div>
                  <div className="text-xl font-bold text-slate-100 tabular-nums">{row.qty.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Month stats */}
        <div>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">This Month</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              testId="stat-supplier-month"
              label="Supplier Spend"
              value={data.supplierMonth}
              isMoney={true}
              color="rose"
            />
            <StatCard
              testId="stat-profit"
              label="Estimated Profit"
              value={data.profitMonth}
              isMoney={true}
              color="emerald"
            />
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pos"
              className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2.5 hover:bg-amber-400 transition-colors text-sm"
            >
              Open POS
            </Link>
            {session.role === "manager" && (
              <>
                <Link
                  href="/reports"
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-5 py-2.5 hover:bg-slate-700 transition-colors text-sm"
                >
                  View Reports
                </Link>
                <Link
                  href="/suppliers"
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-5 py-2.5 hover:bg-slate-700 transition-colors text-sm"
                >
                  Suppliers
                </Link>
              </>
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}
