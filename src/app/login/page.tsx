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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0062C3] via-[#004B93] to-amber-500 p-0.5 shadow-lg mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-amber-400 font-black text-2xl">S</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider uppercase font-serif">
            SUMAIYYAH<br />
            <span className="text-amber-400 text-lg tracking-widest font-sans font-extrabold">FAST FOOD</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Mfumo wa Mauzo na Usimamizi (Staff Portal)</p>
        </div>

        {/* Login card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-7 backdrop-blur-md">
          <h2 className="text-lg font-bold text-slate-100 mb-5">Ingia Kwenye Mfumo</h2>
          <form data-testid="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email">
                Barua Pepe (Email)
              </label>
              <input
                data-testid="login-email"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#0062C3]/30 outline-none text-sm transition-colors"
                placeholder="mfanyakazi@sumaiyyah.test"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="password">
                Nenosiri (Password)
              </label>
              <input
                data-testid="login-password"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-slate-950 border border-slate-700 focus:border-[#0062C3] rounded-xl px-3.5 py-2.5 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#0062C3]/30 outline-none text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <div data-testid="login-error" className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}
            <button
              data-testid="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-[#0062C3] hover:bg-[#004B93] text-white font-bold rounded-xl px-4 py-3 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md mt-2 text-sm"
            >
              {loading ? "Inathibitisha..." : "Ingia"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
