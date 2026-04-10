import type { searchconsole_v1 } from "googleapis";

/**
 * Returns submitted sitemap URLs (full URLs) from GSC.
 */
export async function listSubmittedSitemapUrls(
  searchconsole: searchconsole_v1.Searchconsole,
  siteUrl: string,
): Promise<string[]> {
  const res = await searchconsole.sitemaps.list({ siteUrl });
  const paths = (res.data.sitemap ?? [])
    .map((s) => s.path)
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  return paths;
}
