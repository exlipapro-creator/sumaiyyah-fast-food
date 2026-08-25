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

  // Count pending/live online orders
  const pendingOrdersCount = (db.prepare(
    "SELECT COUNT(*) as v FROM orders WHERE fulfillment_status IN ('pending', 'confirmed', 'preparing') AND status != 'voided'"
  ).get() as { v: number }).v;

  // Upcoming scheduled corporate catering
  const upcomingCorporateOrders = db.prepare(`
    SELECT o.id, o.receipt_no, o.scheduled_date, o.delivery_window_start, o.delivery_window_end,
           o.target_dispatch_at, o.company_name, o.attendee_count, o.total_tsh, o.fulfillment_status,
           cod.building_name, cod.floor_office
    FROM orders o
    LEFT JOIN corporate_order_details cod ON cod.order_id = o.id
    WHERE o.is_scheduled = 1 AND o.status != 'voided' AND o.fulfillment_status != 'delivered'
    ORDER BY o.scheduled_date ASC, o.delivery_window_start ASC
    LIMIT 5
  `).all() as Array<{
    id: number;
    receipt_no: string;
    scheduled_date: string;
    delivery_window_start: string;
    delivery_window_end: string;
    target_dispatch_at: string;
    company_name: string;
    attendee_count: number;
    total_tsh: number;
    fulfillment_status: string;
    building_name: string;
    floor_office: string;
  }>;

  // Unpaid invoices
  const unpaidInvoicesSummary = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(amount_due_tsh), 0) as total_due
    FROM invoices
    WHERE status IN ('ISSUED', 'OVERDUE')
  `).get() as { count: number; total_due: number };

  return {
    revenueToday,
    transactionsToday,
    lastSale: lastSale?.created_at ?? null,
    itemsByCategory,
    totalItemsToday,
    supplierMonth,
    profitMonth,
    pendingOrdersCount,
    upcomingCorporateOrders,
    unpaidInvoicesSummary,
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-50">Staff Operations Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">{dateStr}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <span>View Customer Store</span>
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-500/20"
            >
              <span>Open POS Terminal</span>
            </Link>
          </div>
        </div>

        {/* Today stats */}
        <div>
          <h2 className="text-xs uppercase tracking-wide text-slate-500 mb-3 font-semibold">Today's Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-500 font-medium">Live Kitchen Queue</span>
                <div className="text-2xl font-bold text-amber-400 mt-2">{data.pendingOrdersCount} Active</div>
              </div>
              <Link href="/orders" className="text-xs text-amber-500 hover:text-amber-400 font-medium mt-3 inline-flex items-center gap-1">
                Manage live orders &rarr;
              </Link>
            </div>
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

        {/* Corporate Catering & Staging Dispatch Schedule */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                  Scheduled Corporate & Catering Queue
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Staging target is 25 minutes prior to scheduled delivery window.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data.unpaidInvoicesSummary.count > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg">
                  {data.unpaidInvoicesSummary.count} Outstanding Invoices (TZS {data.unpaidInvoicesSummary.total_due.toLocaleString()})
                </span>
              )}
              <Link
                href="/orders"
                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
              >
                View in Orders &rarr;
              </Link>
            </div>
          </div>

          {data.upcomingCorporateOrders.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              No upcoming scheduled corporate orders in queue today.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2 font-mono">Receipt</th>
                    <th className="pb-2">Company / Client</th>
                    <th className="pb-2">Scheduled Delivery</th>
                    <th className="pb-2">Kitchen Dispatch Target</th>
                    <th className="pb-2">Headcount</th>
                    <th className="pb-2 text-right">Order Value</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.upcomingCorporateOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 font-mono font-bold text-blue-400">{ord.receipt_no}</td>
                      <td className="py-2.5">
                        <strong className="text-slate-100 font-bold block">{ord.company_name}</strong>
                        {ord.building_name && (
                          <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                            {ord.building_name} ({ord.floor_office || "Office"})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-300">
                        <span className="font-semibold block">{ord.scheduled_date}</span>
                        <span className="text-[10px] text-slate-400">{ord.delivery_window_start} - {ord.delivery_window_end}</span>
                      </td>
                      <td className="py-2.5 font-bold text-amber-400 font-mono">
                        {ord.target_dispatch_at || "—"} EAT
                      </td>
                      <td className="py-2.5 text-slate-300 font-mono">
                        {ord.attendee_count ? `${ord.attendee_count} pax` : "—"}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-100">
                        TZS {ord.total_tsh.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {ord.fulfillment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
            <Link
              href="/orders"
              className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-5 py-2.5 hover:bg-slate-700 transition-colors text-sm"
            >
              Live Orders
            </Link>
            {session.role === "manager" && (
              <>
                <Link
                  href="/menu"
                  className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-5 py-2.5 hover:bg-slate-700 transition-colors text-sm"
                >
                  Manage Menu
                </Link>
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
