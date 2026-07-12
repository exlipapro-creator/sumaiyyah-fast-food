import { NextRequest, NextResponse } from "next/server";
import { loginUser, setSessionCookie } from "@/lib/auth";
import { checkLoginThrottle, recordLoginFailure, recordLoginSuccess } from "@/lib/login-throttle";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const ip = clientIp(req);

    // Throttle brute-force / credential-stuffing before doing any (costly)
    // bcrypt verification.
    const throttle = checkLoginThrottle(ip, normalizedEmail);
    if (throttle.limited) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(throttle.retryAfterSeconds) } }
      );
    }

    const user = await loginUser(normalizedEmail, password);
    if (!user) {
      recordLoginFailure(ip, normalizedEmail);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    recordLoginSuccess(ip, normalizedEmail);
    await setSessionCookie(user);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
