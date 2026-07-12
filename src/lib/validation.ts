// Validation helpers for user-supplied content that may later be rendered.

// Validates an image URL. Accepts only http(s) absolute URLs or root-relative
// paths ("/...") and rejects dangerous schemes (javascript:, data:, vbscript:,
// etc.). Defense-in-depth against stored XSS if image_url is ever rendered into
// an <img src>/<a href>/CSS context. Returns the trimmed URL or null.
export function sanitizeImageUrl(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();
  if (raw === "") return null;
  // Root-relative paths are safe (no scheme, cannot be javascript:).
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return raw;
  } catch {
    // not an absolute URL
  }
  return null;
}
