import type { searchconsole_v1 } from "googleapis";
import PQueue from "p-queue";
import type { InspectionFields } from "../types.js";

function emptyFields(err: string): InspectionFields {
  return {
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
    inspectionError: err,
  };
}

function mapResponse(
  data: searchconsole_v1.Schema$InspectUrlIndexResponse | undefined,
): InspectionFields {
  if (!data?.inspectionResult) {
    return emptyFields("No inspection result");
  }
  const ir = data.inspectionResult;
  const idx = ir.indexStatusResult;

  return {
    coverageState: idx?.coverageState ?? "",
    lastCrawlTime: idx?.lastCrawlTime ?? "",
    crawledAs: idx?.crawledAs ?? "",
    verdict: idx?.verdict ?? "",
    indexingState: idx?.indexingState ?? "",
    pageFetchState: idx?.pageFetchState ?? "",
    robotsTxtState: idx?.robotsTxtState ?? "",
    googleCanonical: idx?.googleCanonical ?? "",
    userCanonical: idx?.userCanonical ?? "",
    inspectionResultLink: ir.inspectionResultLink ?? "",
    inspectionError: "",
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function inspectOnce(
  searchconsole: searchconsole_v1.Searchconsole,
  siteUrl: string,
  inspectionUrl: string,
): Promise<InspectionFields> {
  let attempt = 0;
  const maxAttempts = 5;
  let lastErr = "";

  while (attempt < maxAttempts) {
    try {
      const res = await searchconsole.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl,
          siteUrl,
        },
      });
      return mapResponse(res.data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      lastErr = msg;
      const status = (e as { code?: number; response?: { status?: number } })?.response?.status;
      const code = (e as { code?: number })?.code;
      const retryable =
        status === 429 ||
        status === 503 ||
        code === 429 ||
        /quota|rate|429/i.test(msg);
      if (!retryable || attempt === maxAttempts - 1) {
        return emptyFields(lastErr);
      }
      const delay = Math.min(30_000, 500 * 2 ** attempt);
      await sleep(delay);
      attempt += 1;
    }
  }
  return emptyFields(lastErr);
}

export async function inspectUrls(
  searchconsole: searchconsole_v1.Searchconsole,
  siteUrl: string,
  urls: string[],
  maxConcurrency: number,
): Promise<Map<string, InspectionFields>> {
  const queue = new PQueue({ concurrency: Math.max(1, maxConcurrency) });
  const out = new Map<string, InspectionFields>();

  await Promise.all(
    urls.map((url) =>
      queue.add(async () => {
        const fields = await inspectOnce(searchconsole, siteUrl, url);
        out.set(url, fields);
      }),
    ),
  );

  return out;
}
