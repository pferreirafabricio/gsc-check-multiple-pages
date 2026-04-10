import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

export function getSearchConsoleClient(auth: OAuth2Client) {
  return google.searchconsole({ version: "v1", auth });
}
