import { jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { getSessionSecret, SESSION_COOKIE_NAME } from "./session-secret";

const COOKIE_NAME = SESSION_COOKIE_NAME;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "cashier" | "manager";
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ["HS256"] });
    return {
      id: parseInt(payload.sub as string),
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "cashier" | "manager",
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}
