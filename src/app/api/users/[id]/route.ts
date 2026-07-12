import { NextRequest, NextResponse } from "next/server";
import { requireRole, revokeUserSessions, AuthError } from "@/lib/auth";
import getDb from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("manager", req);
    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const { active } = await req.json();
    const db = getDb();
    const isActive = active ? 1 : 0;
    db.prepare("UPDATE users SET active = ? WHERE id = ?").run(isActive, numId);
    // Revoking sessions on deactivation immediately logs out the user.
    if (isActive === 0) {
      revokeUserSessions(numId);
    }
    const user = db.prepare("SELECT id, email, name, role, active, created_at FROM users WHERE id = ?").get(numId);
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
