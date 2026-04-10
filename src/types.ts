/** One row merged for reporting (before XLSX). */
export type UrlReportRow = {
  urlOriginal: string;
  urlNormalized: string;

  inSitemap: boolean;
  /** True when URL is in the input list but not found in fetched sitemap URLs. */
  orphan: boolean;
  sitemapSource: string;

  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  searchAnalyticsMatched: boolean;

  skipInspection: boolean;
  coverageState: string;
  lastCrawlTime: string;
  crawledAs: string;
  verdict: string;
  indexingState: string;
  pageFetchState: string;
  robotsTxtState: string;
  googleCanonical: string;
  userCanonical: string;
  inspectionResultLink: string;
  inspectionError: string;

  notes: string;
};

export type SearchAnalyticsPageRow = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

export type InspectionFields = {
  coverageState: string;
  lastCrawlTime: string;
  crawledAs: string;
  verdict: string;
  indexingState: string;
  pageFetchState: string;
  robotsTxtState: string;
  googleCanonical: string;
  userCanonical: string;
  inspectionResultLink: string;
  inspectionError: string;
};
