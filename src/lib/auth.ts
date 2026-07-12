import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import getDb from "./db";
import { getSessionSecret, SESSION_COOKIE_NAME } from "./session-secret";

const COOKIE_NAME = SESSION_COOKIE_NAME;
const TOKEN_TTL = "8h";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "cashier" | "manager";
  // Token version at issue time; compared against the DB to allow revocation
  // (logout / deactivation bump the stored version, invalidating old tokens).
  tv?: number;
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role, tv: user.tv ?? 0 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSessionSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    return {
      id: parseInt(payload.sub as string),
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "cashier" | "manager",
      tv: typeof payload.tv === "number" ? payload.tv : 0,
    };
  } catch {
    return null;
  }
}

// Re-validate a decoded token against the DB: the user must still exist, be
// active, and the token's version must match the stored version. Returns the
// fresh user (authoritative role/name) or null if the session is invalid.
// DB errors are caught and treated as "no session" to prevent 500s from
// corrupted or temporarily-unavailable databases.
function revalidate(session: SessionUser | null): SessionUser | null {
  if (!session) return null;
  try {
    const db = getDb();
    const current = db
      .prepare("SELECT id, email, name, role, active, token_version FROM users WHERE id = ?")
      .get(session.id) as
      | { id: number; email: string; name: string; role: "cashier" | "manager"; active: number; token_version: number }
      | undefined;
    if (!current || current.active !== 1) return null;
    if ((session.tv ?? 0) !== current.token_version) return null;
    return { id: current.id, email: current.email, name: current.name, role: current.role, tv: current.token_version };
  } catch (err) {
    console.error("[auth] DB error in revalidate:", err);
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return revalidate(await verifyToken(token));
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return revalidate(await verifyToken(token));
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await signToken(user);
  const cookieStore = await cookies();
  // Use DROIDBOT_COOKIE_SECURE to explicitly enable the Secure flag.
  // In HTTPS production environments, set DROIDBOT_COOKIE_SECURE=true.
  // When not set (local HTTP testing, HTTP-only deployments), cookies work without Secure.
  // The cookie is still httpOnly + sameSite=lax, which protects against XSS and CSRF.
  const secure = process.env.DROIDBOT_COOKIE_SECURE === "true";
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Invalidate all outstanding tokens for a user (logout / deactivation) by
// bumping their stored token_version so previously issued JWTs no longer match.
export function revokeUserSessions(userId: number): void {
  const db = getDb();
  db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(userId);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function requireRole(
  role: "cashier" | "manager" | "any",
  req?: NextRequest
): Promise<SessionUser> {
  // getSession/getSessionFromRequest already re-validate against the DB
  // (existence, active flag, token_version) and return the authoritative role.
  const session = req ? await getSessionFromRequest(req) : await getSession();
  if (!session) {
    throw new AuthError("Unauthorized", 401);
  }
  if (role === "manager" && session.role !== "manager") {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export async function loginUser(email: string, password: string): Promise<SessionUser | null> {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email.toLowerCase()) as {
    id: number;
    email: string;
    name: string;
    password_hash: string;
    role: "cashier" | "manager";
    token_version: number;
  } | undefined;
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role, tv: user.token_version };
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
