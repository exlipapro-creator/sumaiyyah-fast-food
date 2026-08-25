import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// In development, React (via Turbopack) requires 'unsafe-eval' for hot-reload
// and call-stack reconstruction. It is intentionally omitted in production.
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    // Next.js requires 'unsafe-inline' for its injected runtime/style handling.
    // frame-ancestors 'none' (anti-clickjacking) + object-src 'none' +
    // base-uri 'self' are the high-value additions here.
    value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
