"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
  user: { id: number; email: string; name: string; role: string };
}

const navItems = [
  { href: "/", label: "Dashboard", testId: "nav-dashboard", icon: "📊" },
  { href: "/pos", label: "POS", testId: "nav-pos", icon: "🛒" },
  { href: "/orders", label: "Orders", testId: "nav-orders", icon: "🧾" },
  { href: "/menu", label: "Menu", testId: "nav-menu", icon: "🍔", managerOnly: true },
  { href: "/reports", label: "Reports", testId: "nav-reports", icon: "📈", managerOnly: true },
  { href: "/suppliers", label: "Suppliers", testId: "nav-suppliers", icon: "🏪", managerOnly: true },
  { href: "/users", label: "Users", testId: "nav-users", icon: "👥", managerOnly: true },
  { href: "/audit", label: "Audit Log", testId: "nav-audit", icon: "🗒️", managerOnly: true },
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
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-slate-800">
          <span data-testid="brand-name" className="text-amber-500 font-bold text-sm tracking-widest uppercase leading-tight block">
            SUMAIYYAH<br />FAST FOOD
          </span>
          <span className="text-slate-500 text-xs mt-1 block">Point of Sale</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-amber-500"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-3">
          <div data-testid="current-user" className="text-sm">
            <div className="text-slate-100 font-medium truncate">{user.name}</div>
            <div className="text-slate-400 text-xs capitalize">{user.role}</div>
          </div>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          >
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
            className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-amber-500 font-bold text-xs tracking-widest uppercase">SUMAIYYAH FAST FOOD</span>
        </header>

        {/* Also render nav-toggle on desktop (hidden but present for testid) */}
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
