import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./src/lib/auth-edge";

// Public, unauthenticated surfaces: the staff login + the customer-facing
// landing/ordering page and its read-only live-menu API.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/order", "/api/public"];
const MANAGER_ONLY_PATHS = ["/menu", "/reports", "/suppliers", "/users", "/api/users", "/api/menu-items", "/api/categories", "/api/reports/sales", "/api/reports/best-sellers", "/api/reports/sales.csv", "/api/supplier-payments"];
// Read-only endpoints that cashiers legitimately need (e.g. loading the menu in
// the POS screen). For these prefixes we only enforce the manager requirement on
// mutating methods; safe GET/HEAD requests are allowed for any authenticated
// user. Mutations remain gated here AND by requireRole("manager") in the route.
const SHARED_READ_PREFIXES = ["/api/menu-items", "/api/categories"];
const SAFE_METHODS = ["GET", "HEAD"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check manager-only paths
  let isManagerOnly = MANAGER_ONLY_PATHS.some(p => pathname.startsWith(p));
  // Allow safe (read-only) requests to shared menu/category endpoints for any
  // authenticated user; route handlers still enforce manager role on mutations.
  if (isManagerOnly && SAFE_METHODS.includes(req.method) && SHARED_READ_PREFIXES.some(p => pathname.startsWith(p))) {
    isManagerOnly = false;
  }
  if (isManagerOnly && session.role !== "manager") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/forbidden", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
