import ExcelJS from "exceljs";
import type { UrlReportRow } from "../types.js";

const DATA_COLUMNS: { key: keyof UrlReportRow; header: string; width: number }[] = [
  { key: "urlOriginal", header: "url_original", width: 48 },
  { key: "urlNormalized", header: "url_normalized", width: 48 },
  { key: "inSitemap", header: "in_sitemap", width: 12 },
  { key: "orphan", header: "orphan_not_in_sitemap", width: 14 },
  { key: "sitemapSource", header: "sitemap_source_file", width: 40 },
  { key: "clicks", header: "clicks", width: 10 },
  { key: "impressions", header: "impressions", width: 12 },
  { key: "ctr", header: "ctr", width: 10 },
  { key: "position", header: "position_avg", width: 12 },
  { key: "searchAnalyticsMatched", header: "search_analytics_matched", width: 22 },
  { key: "skipInspection", header: "inspection_skipped", width: 16 },
  { key: "coverageState", header: "coverage_state", width: 28 },
  { key: "verdict", header: "index_verdict", width: 22 },
  { key: "indexingState", header: "indexing_state", width: 22 },
  { key: "pageFetchState", header: "page_fetch_state", width: 22 },
  { key: "lastCrawlTime", header: "last_crawl_time", width: 28 },
  { key: "crawledAs", header: "crawled_as", width: 18 },
  { key: "robotsTxtState", header: "robots_txt_state", width: 22 },
  { key: "googleCanonical", header: "google_canonical", width: 40 },
  { key: "userCanonical", header: "user_canonical", width: 40 },
  { key: "inspectionResultLink", header: "inspection_result_link", width: 44 },
  { key: "inspectionError", header: "inspection_error", width: 36 },
  { key: "notes", header: "notes", width: 40 },
];

export async function writeReportXlsx(
  filePath: string,
  rows: UrlReportRow[],
  meta: {
    property: string;
    startDate: string;
    endDate: string;
    version: string;
  },
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "gsc-check-multiple-pages";
  wb.created = new Date();

  const metaSheet = wb.addWorksheet("Run metadata", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  metaSheet.columns = [
    { header: "key", key: "k", width: 24 },
    { header: "value", key: "v", width: 64 },
  ];
  metaSheet.addRows([
    { k: "gsc_property", v: meta.property },
    { k: "search_analytics_start", v: meta.startDate },
    { k: "search_analytics_end", v: meta.endDate },
    { k: "generated_at_utc", v: new Date().toISOString() },
    { k: "version", v: meta.version },
    { k: "row_count", v: rows.length },
  ]);
  metaSheet.getRow(1).font = { bold: true };

  const dataSheet = wb.addWorksheet("Data", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  dataSheet.columns = DATA_COLUMNS.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));

  for (const r of rows) {
    dataSheet.addRow({
      ...r,
      inSitemap: r.inSitemap ? "yes" : "no",
      orphan: r.orphan ? "yes" : "no",
      searchAnalyticsMatched: r.searchAnalyticsMatched ? "yes" : "no",
      skipInspection: r.skipInspection ? "yes" : "no",
      ctr: r.ctr ?? "",
      position: r.position ?? "",
      clicks: r.clicks ?? "",
      impressions: r.impressions ?? "",
    });
  }

  dataSheet.getRow(1).font = { bold: true };

  for (let c = 1; c <= DATA_COLUMNS.length; c++) {
    const col = dataSheet.getColumn(c);
    const header = DATA_COLUMNS[c - 1]?.header ?? "";
    if (header === "ctr") {
      col.numFmt = "0.00%";
    } else if (header === "position_avg" || header === "clicks" || header === "impressions") {
      col.numFmt = "0.####";
    }
  }

  await wb.xlsx.writeFile(filePath);
}
