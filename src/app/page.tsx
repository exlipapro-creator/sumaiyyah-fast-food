import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import getDb from "@/lib/db";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = new Date().toISOString().slice(0, 7);

  const revenueToday = (db.prepare(
    "SELECT COALESCE(SUM(total_tsh), 0) as v FROM orders WHERE date(created_at) = ?"
  ).get(today) as { v: number }).v;

  const platesToday = (db.prepare(
    "SELECT COALESCE(SUM(oi.quantity), 0) as v FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE date(o.created_at) = ?"
  ).get(today) as { v: number }).v;

  const transactionsToday = (db.prepare(
    "SELECT COUNT(*) as v FROM orders WHERE date(created_at) = ?"
  ).get(today) as { v: number }).v;

  const supplierMonth = (db.prepare(
    "SELECT COALESCE(SUM(amount_tsh), 0) as v FROM supplier_payments WHERE strftime('%Y-%m', paid_on) = ?"
  ).get(yearMonth) as { v: number }).v;

  // Month revenue for profit calc
  const revenueMonth = (db.prepare(
    "SELECT COALESCE(SUM(total_tsh), 0) as v FROM orders WHERE strftime('%Y-%m', created_at) = ?"
  ).get(yearMonth) as { v: number }).v;

  const profitMonth = revenueMonth - supplierMonth;

  return { revenueToday, platesToday, transactionsToday, supplierMonth, profitMonth };
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getDashboardData();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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
              label="Revenue Today"
              value={data.revenueToday}
              isMoney={true}
              color="amber"
            />
            <StatCard
              testId="stat-plates-today"
              label="Plates Sold Today"
              value={data.platesToday}
              isMoney={false}
              color="sky"
            />
            <StatCard
              testId="stat-transactions-today"
              label="Transactions Today"
              value={data.transactionsToday}
              isMoney={false}
              color="sky"
            />
          </div>
        </div>

        {/* Month stats */}
        <div>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">This Month</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              testId="stat-supplier-month"
              label="Supplier Spend This Month"
              value={data.supplierMonth}
              isMoney={true}
              color="rose"
            />
            <StatCard
              testId="stat-profit"
              label="Estimated Profit This Month"
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
            <a
              href="/pos"
              className="bg-amber-500 text-slate-950 font-semibold rounded-lg px-5 py-2.5 hover:bg-amber-400 transition-colors"
            >
              🛒 Open POS
            </a>
            {session.role === "manager" && (
              <>
                <a
                  href="/reports"
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-5 py-2.5 hover:bg-slate-700 transition-colors"
                >
                  📈 View Reports
                </a>
                <a
                  href="/suppliers"
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-5 py-2.5 hover:bg-slate-700 transition-colors"
                >
                  🏪 Suppliers
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
