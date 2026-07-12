import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, revokeUserSessions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  // Bump the user's token_version so the just-cleared cookie's JWT (and any
  // copies captured elsewhere) can no longer be replayed after logout.
  const session = await getSession();
  if (session) {
    revokeUserSessions(session.id);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
