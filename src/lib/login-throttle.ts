// In-memory login throttle. Mitigates online brute-force / credential-stuffing
// against the login endpoint (notably the well-known seeded demo accounts).
//
// Scope: best-effort, per-process, fixed-window counter keyed by client IP +
// submitted email. This is intentionally lightweight (no external store) and
// fails open across restarts; for multi-instance deployments a shared store
// (Redis) would be required. Successful logins clear the counter for the key.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 10; // attempts per window before lockout

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function keyFor(ip: string, email: string): string {
  return `${ip}|${email.toLowerCase().trim()}`;
}

function sweep(now: number): void {
  // Opportunistic cleanup so the map cannot grow unbounded.
  if (buckets.size < 1000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export interface ThrottleResult {
  limited: boolean;
  retryAfterSeconds: number;
}

export function checkLoginThrottle(ip: string, email: string): ThrottleResult {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(keyFor(ip, email));
  if (b && b.resetAt > now && b.count >= MAX_FAILURES) {
    return { limited: true, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function recordLoginFailure(ip: string, email: string): void {
  const now = Date.now();
  const key = keyFor(ip, email);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    b.count += 1;
  }
}

export function recordLoginSuccess(ip: string, email: string): void {
  buckets.delete(keyFor(ip, email));
}
