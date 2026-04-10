import { normalizeUrl } from "./normalize.js";

function isSitemapIndexXml(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc[^>]*>([\s\S]*?)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const inner = m[1]?.trim() ?? "";
    if (inner) locs.push(inner);
  }
  return locs;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "gsc-check-multiple-pages/1.0",
      Accept: "application/xml,text/xml,*/*",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Sitemap fetch failed ${res.status} ${res.statusText}: ${url}`);
  }
  return res.text();
}

export type FetchSitemapUrlsOptions = {
  maxConcurrent?: number;
};

/**
 * Recursively resolves sitemap indexes and returns normalized page URLs from `<urlset>` entries.
 */
export async function fetchAllUrlsFromSubmittedSitemaps(
  sitemapUrls: string[],
  options: FetchSitemapUrlsOptions = {},
): Promise<{ urls: Set<string>; sources: Map<string, string> }> {
  const maxConcurrent = Math.max(1, options.maxConcurrent ?? 4);
  const urls = new Set<string>();
  const sources = new Map<string, string>();
  const seenSitemaps = new Set<string>();

  let frontier = [...sitemapUrls];

  while (frontier.length > 0) {
    const chunk = frontier.splice(0, maxConcurrent);
    const settled = await Promise.allSettled(
      chunk.map(async (sitemapUrl) => {
        if (seenSitemaps.has(sitemapUrl)) return { childUrls: [] as string[], pageLocs: [] as string[] };
        seenSitemaps.add(sitemapUrl);
        const xml = await fetchText(sitemapUrl);
        if (isSitemapIndexXml(xml)) {
          return { childUrls: extractLocs(xml), pageLocs: [] as string[] };
        }
        return { childUrls: [] as string[], pageLocs: extractLocs(xml) };
      }),
    );

    for (let i = 0; i < settled.length; i++) {
      const r = settled[i];
      const sitemapUrl = chunk[i];
      if (r.status === "rejected") {
        console.error(
          `Warning: sitemap ${sitemapUrl}: ${r.reason instanceof Error ? r.reason.message : r.reason}`,
        );
        continue;
      }
      const val = r.value;
      for (const c of val.childUrls) {
        if (!seenSitemaps.has(c)) frontier.push(c);
      }
      for (const loc of val.pageLocs) {
        try {
          const n = normalizeUrl(loc);
          if (!n) continue;
          urls.add(n);
          if (!sources.has(n)) sources.set(n, sitemapUrl);
        } catch {
          /* skip */
        }
      }
    }
  }

  return { urls, sources };
}
