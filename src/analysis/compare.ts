import { normalizeUrl } from "../sitemap/normalize.js";
import type { InspectionFields, UrlReportRow } from "../types.js";
import type { PageMetrics } from "../gsc/searchAnalytics.js";

export function buildReportRows(params: {
  urlsOriginal: string[];
  sitemapUrls: Set<string>;
  sitemapSources: Map<string, string>;
  analyticsByPage: Map<string, PageMetrics>;
  inspectionByUrl: Map<string, InspectionFields> | null;
  skipInspection: boolean;
  startDate: string;
  endDate: string;
}): UrlReportRow[] {
  const { urlsOriginal, sitemapUrls, sitemapSources, analyticsByPage, inspectionByUrl, skipInspection } =
    params;

  const rows: UrlReportRow[] = [];

  for (const original of urlsOriginal) {
    const normalized = normalizeUrl(original);
    const inSitemap = sitemapUrls.has(normalized);
    const orphan = !inSitemap;
    const sitemapSource = sitemapSources.get(normalized) ?? "";

    const metrics = analyticsByPage.get(normalized);
    const searchAnalyticsMatched = metrics !== undefined;

    const clicks = metrics?.clicks ?? null;
    const impressions = metrics?.impressions ?? null;
    const ctr = metrics?.ctr ?? null;
    const position = metrics?.position ?? null;

    let inspection: InspectionFields = {
      coverageState: "",
      lastCrawlTime: "",
      crawledAs: "",
      verdict: "",
      indexingState: "",
      pageFetchState: "",
      robotsTxtState: "",
      googleCanonical: "",
      userCanonical: "",
      inspectionResultLink: "",
      inspectionError: "",
    };

    if (!skipInspection && inspectionByUrl) {
      inspection = inspectionByUrl.get(original) ?? {
        ...inspection,
        inspectionError: "Missing inspection row",
      };
    }

    const notes: string[] = [];
    if (normalized !== original.trim()) {
      notes.push("normalized for matching");
    }
    if (!searchAnalyticsMatched) {
      notes.push(`no Search Analytics rows for ${params.startDate}..${params.endDate}`);
    }

    rows.push({
      urlOriginal: original,
      urlNormalized: normalized,
      inSitemap,
      orphan,
      sitemapSource,
      clicks,
      impressions,
      ctr,
      position,
      searchAnalyticsMatched,
      skipInspection,
      coverageState: inspection.coverageState,
      lastCrawlTime: inspection.lastCrawlTime,
      crawledAs: inspection.crawledAs,
      verdict: inspection.verdict,
      indexingState: inspection.indexingState,
      pageFetchState: inspection.pageFetchState,
      robotsTxtState: inspection.robotsTxtState,
      googleCanonical: inspection.googleCanonical,
      userCanonical: inspection.userCanonical,
      inspectionResultLink: inspection.inspectionResultLink,
      inspectionError: skipInspection ? "" : inspection.inspectionError,
      notes: notes.join("; "),
    });
  }

  return rows;
}
