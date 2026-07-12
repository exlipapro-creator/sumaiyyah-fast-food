import { NextRequest, NextResponse } from "next/server";
import { requireRole, hashPassword, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const db = getDb();
    const users = db.prepare("SELECT id, email, name, role, active, created_at FROM users ORDER BY id ASC").all();
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("manager", req);
    const { email, name, password, role } = await req.json();
    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!["cashier", "manager"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    const hash = hashPassword(password);
    const result = db.prepare(
      "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run(email.toLowerCase(), name, hash, role);
    const user = db.prepare("SELECT id, email, name, role, active, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
