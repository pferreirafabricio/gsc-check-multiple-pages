import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { OAuth2Client } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"] as const;

export type ClientSecretShape = {
  installed?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id: string;
    client_secret: string;
    redirect_uris?: string[];
  };
};

function loadClientSecret(path: string): ClientSecretShape {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as ClientSecretShape;
}

function getInstalledOrWeb(c: ClientSecretShape): {
  client_id: string;
  client_secret: string;
  redirect_uris?: string[];
} {
  if (c.installed) return c.installed;
  if (c.web) return c.web;
  throw new Error("client_secret.json must contain 'installed' or 'web' credentials");
}

/**
 * Opens a one-shot localhost server to receive OAuth redirect (installed app flow).
 */
async function getTokenViaLocalhost(authUrl: string, port: number): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? "", `http://127.0.0.1:${port}`);
        const code = url.searchParams.get("code");
        const err = url.searchParams.get("error");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        if (err) {
          res.end(`<p>Authorization error: ${err}</p>`);
          server.close();
          reject(new Error(err));
          return;
        }
        if (!code) {
          res.end("<p>No code in callback.</p>");
          server.close();
          reject(new Error("No authorization code"));
          return;
        }
        res.end("<p>Success. You can close this tab.</p>");
        server.close();
        resolvePromise(code);
      } catch (e) {
        server.close();
        reject(e);
      }
    });
    server.listen(port, "127.0.0.1", () => {
      // eslint-disable-next-line no-console
      console.error(`\nOpen this URL in your browser:\n\n${authUrl}\n`);
    });
    server.on("error", reject);
  });
}

export async function authorize(
  clientSecretPath: string,
  tokenPath: string,
  localhostPort = 3000,
): Promise<OAuth2Client> {
  const secret = loadClientSecret(resolve(clientSecretPath));
  const creds = getInstalledOrWeb(secret);
  const redirectUri = `http://127.0.0.1:${localhostPort}/oauth2callback`;

  const oAuth2Client = new OAuth2Client({
    clientId: creds.client_id,
    clientSecret: creds.client_secret,
    redirectUri,
  });

  const tokenResolved = resolve(tokenPath);
  if (existsSync(tokenResolved)) {
    const t = JSON.parse(readFileSync(tokenResolved, "utf8")) as {
      refresh_token?: string;
      access_token?: string;
      expiry_date?: number;
    };
    oAuth2Client.setCredentials(t);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [...SCOPES],
    prompt: "consent",
  });

  const code = await getTokenViaLocalhost(authUrl, localhostPort);
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  writeFileSync(tokenResolved, JSON.stringify(tokens, null, 2), "utf8");
  return oAuth2Client;
}
