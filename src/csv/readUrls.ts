import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

export type ReadUrlsOptions = {
  urlColumn: string | number;
  dedupe: boolean;
  /** When true, first row is headers. When false, all rows are data. When omitted, detect from first line. */
  hasHeader?: boolean;
};

function detectHasHeader(firstLine: string): boolean {
  const t = firstLine.trim();
  if (!t) return false;
  return !/^https?:\/\//i.test(t);
}

/**
 * Read URLs from CSV. If `urlColumn` is a number, treat as 0-based column index.
 * If string, match header name (case-sensitive as in file).
 */
export function readUrlsFromCsv(filePath: string, options: ReadUrlsOptions): string[] {
  const buf = readFileSync(filePath, "utf8");
  const firstLine = buf.split(/\r?\n/)[0] ?? "";
  const hasHeader =
    options.hasHeader !== undefined ? options.hasHeader : detectHasHeader(firstLine);

  const records: string[][] | Record<string, string>[] = parse(buf, {
    columns: hasHeader,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  let urls: string[] = [];

  if (hasHeader && Array.isArray(records) && records.length > 0 && typeof records[0] === "object") {
    const rows = records as Record<string, string>[];
    const first = rows[0] ?? {};
    if (typeof options.urlColumn === "number") {
      const vals = Object.values(first);
      if (options.urlColumn < 0 || options.urlColumn >= vals.length) {
        throw new Error(`Column index ${String(options.urlColumn)} out of range (0..${vals.length - 1})`);
      }
      const idx = options.urlColumn as number;
      urls = rows
        .map((r) => Object.values(r)[idx] as string | undefined)
        .filter((v): v is string => Boolean(v));
    } else {
      const col = options.urlColumn;
      if (!(col in first)) {
        const available = Object.keys(first).join(", ");
        throw new Error(`Column "${col}" not found. Available columns: ${available}`);
      }
      urls = rows.map((r) => r[col]).filter(Boolean);
    }
  } else {
    const rows = records as string[][];
    const idx = typeof options.urlColumn === "number" ? options.urlColumn : 0;
    urls = rows.map((row) => row[idx]).filter(Boolean);
  }

  if (options.dedupe) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of urls) {
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    urls = out;
  }

  return urls;
}
