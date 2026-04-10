import type { searchconsole_v1 } from "googleapis";
import { normalizeUrl } from "../sitemap/normalize.js";
import type { SearchAnalyticsPageRow } from "../types.js";

const ROW_LIMIT = 25_000;

export type PageMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Paginates Search Analytics for `dimension: page` and builds a map keyed by normalized page URL.
 */
export async function fetchSearchAnalyticsByPage(
  searchconsole: searchconsole_v1.Searchconsole,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, PageMetrics>> {
  const map = new Map<string, PageMetrics>();
  let startRow = 0;

  for (;;) {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: ROW_LIMIT,
        startRow,
        dataState: "all",
      },
    });

    const rows = (res.data.rows ?? []) as SearchAnalyticsPageRow[];
    for (const row of rows) {
      const page = row.keys?.[0];
      if (!page) continue;
      const key = normalizeUrl(page);
      map.set(key, {
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      });
    }

    if (rows.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
  }

  return map;
}
