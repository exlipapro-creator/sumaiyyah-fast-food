"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-amber-500 tracking-widest uppercase">
            SUMAIYYAH<br />FAST FOOD
          </h1>
          <p className="text-slate-400 text-sm mt-2">Point of Sale System</p>
        </div>

        {/* Login card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl shadow-black/40 p-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">Sign in</h2>
          <form data-testid="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="email">
                Email address
              </label>
              <input
                data-testid="login-email"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1" htmlFor="password">
                Password
              </label>
              <input
                data-testid="login-password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div data-testid="login-error" className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-slate-950 font-semibold rounded-lg px-4 py-2.5 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
