// Centralized session/JWT secret resolution. Edge-safe: only relies on
// process.env / TextEncoder / Web Crypto so it can be imported from both Node
// route handlers and the edge middleware.
//
// Security model:
//   1. If DROIDBOT_SESSION_SECRET is set (>= 16 chars) we always use it. This is
//      the required configuration for production (set by scripts/start.mjs and
//      the Dockerfile, which inject a strong random value when one is absent).
//   2. In non-production (dev/test) we fall back to a fixed, clearly-labelled
//      dev secret. It is stable so the Node and edge runtimes agree, and it is
//      NEVER reachable in production.
//   3. In production with no env var (a misconfiguration the start wrapper is
//      designed to prevent) we generate a cryptographically strong random
//      secret per process rather than ever using a predictable value. This
//      fails closed: an attacker cannot forge tokens.

const MIN_SECRET_LENGTH = 16;
const ENV_KEY = "DROIDBOT_SESSION_SECRET";

// Dev/test only. Guarded by NODE_ENV !== "production"; never used in prod paths.
const DEV_FALLBACK_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

export const SESSION_COOKIE_NAME = "sumaiyyah_session";

let cached: Uint8Array | null = null;

function randomSecret(): string {
  const bytes = new Uint8Array(48);
  // globalThis.crypto exists in both the Node (>=18) and edge runtimes.
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export function getSessionSecret(): Uint8Array {
  if (cached) return cached;

  const fromEnv = process.env[ENV_KEY];
  let secret: string;
  if (fromEnv && fromEnv.length >= MIN_SECRET_LENGTH) {
    secret = fromEnv;
  } else if (process.env.NODE_ENV !== "production") {
    secret = DEV_FALLBACK_SECRET;
  } else {
    console.warn(
      `[security] ${ENV_KEY} is not set; using an ephemeral random secret for this process. ` +
        `Set ${ENV_KEY} (see scripts/start.mjs) for stable, multi-instance sessions.`
    );
    secret = randomSecret();
  }

  cached = new TextEncoder().encode(secret);
  return cached;
}
