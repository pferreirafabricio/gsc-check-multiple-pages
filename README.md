# gsc-check-multiple-pages

TypeScript CLI that reads URLs from a CSV, calls the [Google Search Console API](https://developers.google.com/webmaster-tools/v1/getting_started) to:

- Pull **Search Analytics** metrics per URL (clicks, impressions, CTR, position) for a date range
- Optionally run **URL Inspection** (index coverage, verdict, canonicals, crawl state)
- List submitted **sitemaps** in GSC, fetch their XML (including nested sitemap indexes), and flag **orphan** URLs (in your CSV but not present in those sitemaps)

Results are written to an **Excel `.xlsx`** file (sheets **Data** and **Run metadata**).

## Prerequisites

- Node.js 18+
- A Google Cloud project with the **Search Console API** enabled
- OAuth **Desktop app** credentials downloaded as `client_secret.json` (not committed; see `.gitignore`)
- Access to the GSC property you pass as `--property`

## Setup

```bash
npm install
npm run build
```

First run will open a browser (or print a URL) to authorize the app. A refresh token is saved to `token.json` (gitignored).

**OAuth redirect:** the script uses `http://127.0.0.1:<port>/oauth2callback` (default port `3000`). Add that exact redirect URI to your OAuth client in Google Cloud Console if authorization fails.

## Usage

```bash
node dist/cli.js \
  --property "https://www.example.com/" \
  --urls ./urls.csv \
  --start-date 2025-01-01 \
  --end-date 2025-01-31 \
  --output ./report.xlsx
```

### CSV format

- By default the **first column** holds URLs (`--url-column 0`).
- With headers, use e.g. `--url-column url` or `--header yes`.
- First line is detected as a header when it does **not** look like a URL; override with `--header auto|yes|no`.

### Useful flags

| Flag | Description |
|------|-------------|
| `--skip-inspection` | Only Search Analytics + sitemaps (saves URL Inspection quota) |
| `--max-concurrency` | Parallel URL Inspection calls (default `5`) |
| `--sitemap-concurrency` | Parallel sitemap HTTP fetches (default `4`) |
| `--no-dedupe` | Keep duplicate URLs from the CSV |
| `--client-secret` / `--token` | Paths to OAuth files |

### Development

```bash
npm run dev -- --help
```

## API quotas

URL Inspection has per-property daily limits; see [Search Console API limits](https://developers.google.com/webmaster-tools/limits). For large batches, use `--skip-inspection` for dry runs or split work across days.

## License

MIT
