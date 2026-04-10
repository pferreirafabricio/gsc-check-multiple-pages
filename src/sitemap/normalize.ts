/**
 * Normalize URLs for set membership and GSC matching.
 * Strips hash, trims; lowercases hostname; strips trailing slash on path (except root).
 */
export function normalizeUrl(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  try {
    const u = new URL(s);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.href;
  } catch {
    return s;
  }
}

/** Build lookup keys for fuzzy match: try normalized URL and pathname+search variants. */
export function urlLookupKeys(normalized: string): string[] {
  const keys = new Set<string>([normalized]);
  try {
    const u = new URL(normalized);
    keys.add(`${u.pathname}${u.search}`);
    keys.add(u.pathname);
  } catch {
    /* ignore */
  }
  return [...keys];
}
