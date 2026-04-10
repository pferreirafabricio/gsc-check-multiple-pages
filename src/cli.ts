#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import dotenv from "dotenv";
import { authorize } from "./auth/googleOAuth.js";
import { readUrlsFromCsv } from "./csv/readUrls.js";
import { getSearchConsoleClient } from "./gsc/searchConsole.js";
import { fetchSearchAnalyticsByPage } from "./gsc/searchAnalytics.js";
import { listSubmittedSitemapUrls } from "./gsc/sitemaps.js";
import { inspectUrls } from "./gsc/urlInspection.js";
import { fetchAllUrlsFromSubmittedSitemaps } from "./sitemap/fetchParse.js";
import { buildReportRows } from "./analysis/compare.js";
import { writeReportXlsx } from "./output/reportXlsx.js";

dotenv.config();

function readVersion(): string {
  try {
    const p = fileURLToPath(new URL("../package.json", import.meta.url));
    const pkg = JSON.parse(readFileSync(p, "utf8")) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function parseUrlColumn(val: string): string | number {
  if (/^\d+$/.test(val)) return Number.parseInt(val, 10);
  return val;
}

async function main(): Promise<void> {
  const version = readVersion();
  const program = new Command();
  program
    .name("gsc-analyze")
    .description("GSC Search Analytics, URL Inspection, sitemap orphan analysis → XLSX")
    .version(version)
    .requiredOption("--property <siteUrl>", "GSC property (e.g. https://www.example.com/ or sc-domain:example.com)")
    .requiredOption("--urls <csvPath>", "CSV file containing URLs")
    .requiredOption("--start-date <YYYY-MM-DD>", "Search Analytics start date")
    .requiredOption("--end-date <YYYY-MM-DD>", "Search Analytics end date")
    .option("--output <path>", "Output .xlsx path", "gsc-report.xlsx")
    .option(
      "--url-column <name|index>",
      "CSV column with URLs (header name or 0-based index)",
      "0",
    )
    .option("--client-secret <path>", "OAuth client_secret.json path", "client_secret.json")
    .option("--token <path>", "Saved OAuth token path", "token.json")
    .option("--oauth-port <n>", "Localhost port for OAuth redirect", (v) => Number.parseInt(v, 10), 3000)
    .option("--skip-inspection", "Skip URL Inspection API (faster, lower quota)", false)
    .option("--max-concurrency <n>", "Max concurrent URL Inspection calls", (v) => Number.parseInt(v, 10), 5)
    .option("--sitemap-concurrency <n>", "Max concurrent sitemap fetches", (v) => Number.parseInt(v, 10), 4)
    .option("--no-dedupe", "Keep duplicate URL rows (default: dedupe on)", false)
    .option(
      "--header <mode>",
      "CSV header row: auto (detect), yes, or no",
      (v: string) => {
        if (v === "auto" || v === "yes" || v === "no") return v;
        throw new Error("--header must be auto, yes, or no");
      },
      "auto",
    );

  program.parse();
  const opts = program.opts<{
    property: string;
    urls: string;
    startDate: string;
    endDate: string;
    output: string;
    urlColumn: string;
    clientSecret: string;
    token: string;
    oauthPort: number;
    skipInspection: boolean;
    maxConcurrency: number;
    sitemapConcurrency: number;
    noDedupe: boolean;
    header: "auto" | "yes" | "no";
  }>();

  const urlColumn = parseUrlColumn(opts.urlColumn);
  let hasHeader: boolean | undefined;
  if (opts.header === "yes") hasHeader = true;
  else if (opts.header === "no") hasHeader = false;
  else hasHeader = undefined;

  const csvPath = resolve(opts.urls);
  const urls = readUrlsFromCsv(csvPath, {
    urlColumn,
    dedupe: !opts.noDedupe,
    hasHeader,
  });

  if (urls.length === 0) {
    console.error("No URLs found in CSV.");
    process.exitCode = 1;
    return;
  }

  console.error(`Loaded ${urls.length} URL(s) from ${csvPath}`);

  const auth = await authorize(opts.clientSecret, opts.token, opts.oauthPort);
  const searchconsole = getSearchConsoleClient(auth);
  const siteUrl = opts.property;

  console.error("Listing submitted sitemaps…");
  const submitted = await listSubmittedSitemapUrls(searchconsole, siteUrl);
  console.error(`Found ${submitted.length} submitted sitemap URL(s). Fetching & parsing…`);

  const { urls: sitemapPageUrls, sources: sitemapSources } = await fetchAllUrlsFromSubmittedSitemaps(
    submitted,
    { maxConcurrent: opts.sitemapConcurrency },
  );
  console.error(`Sitemap URLs collected: ${sitemapPageUrls.size} page URL(s).`);

  console.error("Fetching Search Analytics by page…");
  const analyticsByPage = await fetchSearchAnalyticsByPage(
    searchconsole,
    siteUrl,
    opts.startDate,
    opts.endDate,
  );
  console.error(`Search Analytics pages in range: ${analyticsByPage.size}.`);

  let inspectionByUrl = null as Awaited<ReturnType<typeof inspectUrls>> | null;
  if (!opts.skipInspection) {
    console.error(`Running URL Inspection (${opts.maxConcurrency} concurrent)…`);
    inspectionByUrl = await inspectUrls(searchconsole, siteUrl, urls, opts.maxConcurrency);
  }

  const rows = buildReportRows({
    urlsOriginal: urls,
    sitemapUrls: sitemapPageUrls,
    sitemapSources,
    analyticsByPage,
    inspectionByUrl,
    skipInspection: opts.skipInspection,
    startDate: opts.startDate,
    endDate: opts.endDate,
  });

  const outPath = resolve(opts.output);
  await writeReportXlsx(outPath, rows, {
    property: siteUrl,
    startDate: opts.startDate,
    endDate: opts.endDate,
    version,
  });

  console.error(`Wrote ${outPath}`);
}

try {
  await main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
}
