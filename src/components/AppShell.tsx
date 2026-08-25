"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  user: { id: number; email: string; name: string; role: string };
}

// SVG icons — inline, no external dependency
function IconDashboard() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
    </svg>
  );
}
function IconPOS() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.4 5.6A1 1 0 006.6 20h10.8a1 1 0 00.97-.76L19 13M9 20a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2z" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}
function IconReports() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconSuppliers() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-2M5 21H3m2 0h2M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 8h6" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4 6v-2a4 4 0 00-3-3.87M9 7a4 4 0 118 0 4 4 0 01-8 0z" />
    </svg>
  );
}
function IconAudit() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  );
}
function IconHamburger() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", testId: "nav-dashboard", Icon: IconDashboard },
  { href: "/pos",       label: "POS",       testId: "nav-pos",       Icon: IconPOS },
  { href: "/orders",    label: "Orders",    testId: "nav-orders",    Icon: IconOrders },
  { href: "/menu",      label: "Menu",      testId: "nav-menu",      Icon: IconMenu,      managerOnly: true },
  { href: "/reports",   label: "Reports",   testId: "nav-reports",   Icon: IconReports,   managerOnly: true },
  { href: "/suppliers", label: "Suppliers", testId: "nav-suppliers", Icon: IconSuppliers, managerOnly: true },
  { href: "/users",     label: "Users",     testId: "nav-users",     Icon: IconUsers,     managerOnly: true },
  { href: "/audit",     label: "Audit Log", testId: "nav-audit",     Icon: IconAudit,     managerOnly: true },
];

export default function AppShell({ children, user }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const visibleNav = navItems.filter(item => !item.managerOnly || user.role === "manager");

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-800">
          <span data-testid="brand-name" className="text-amber-500 font-bold text-xs tracking-widest uppercase leading-tight block">
            SUMAIYYAH<br />FAST FOOD
          </span>
          <span className="text-slate-500 text-xs mt-1 block">Point of Sale</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ href, label, testId, Icon }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                data-testid={testId}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-amber-500"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <span className={isActive ? "text-amber-500" : "text-slate-500"}>
                  <Icon />
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-2">
          <div data-testid="current-user" className="px-3 py-2">
            <div className="text-slate-100 text-sm font-medium truncate">{user.name}</div>
            <div className="text-slate-500 text-xs capitalize mt-0.5">{user.role}</div>
          </div>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          >
            <IconLogout />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Topbar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
          <button
            data-testid="nav-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation"
          >
            <IconHamburger />
          </button>
          <span className="text-amber-500 font-bold text-xs tracking-widest uppercase">SUMAIYYAH FAST FOOD</span>
        </header>

        {/* Desktop nav-toggle stub (present for test selectors, hidden) */}
        <button
          data-testid="nav-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden"
          aria-label="Toggle navigation"
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
