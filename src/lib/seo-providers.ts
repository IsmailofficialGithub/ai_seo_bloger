import { google } from "googleapis";

import type { BlogRequest } from "@/lib/seo-schema";

type AhrefsPayload = {
  organicKeywords: unknown;
  topPages: unknown;
  metrics: unknown;
};

type GscPayload = {
  startDate: string;
  endDate: string;
  rows: unknown[];
  status?: "skipped";
  note?: string;
};

export type SeoData = {
  ahrefs: AhrefsPayload;
  googleSearchConsole: GscPayload;
};

function todayMinusDays(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function cleanDomain(domain: string) {
  return domain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "");
}

function normalizePrivateKey(rawKey: string) {
  let key = rawKey.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\n/g, "\n");

  if (key.includes("BEGIN PRIVATE KEY")) {
    return key;
  }

  try {
    const decoded = Buffer.from(key, "base64").toString("utf8").trim();
    const parsed = JSON.parse(decoded) as { private_key?: string };

    if (parsed.private_key) {
      return parsed.private_key.replace(/\\n/g, "\n");
    }
  } catch {
    // Not a base64-encoded service account JSON value.
  }

  try {
    const parsed = JSON.parse(key) as { private_key?: string };

    if (parsed.private_key) {
      return parsed.private_key.replace(/\\n/g, "\n");
    }
  } catch {
    // Not a raw service account JSON value.
  }

  return key;
}

async function fetchAhrefsEndpoint(
  endpoint: "organic-keywords" | "top-pages" | "metrics",
  params: Record<string, string>,
) {
  const apiKey = process.env.AHREFS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing AHREFS_API_KEY.");
  }

  const url = new URL(`https://api.ahrefs.com/v3/site-explorer/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    let errorMessage = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed.error) errorMessage = parsed.error;
    } catch {}
    throw new Error(`Ahrefs ${endpoint} failed: ${response.status} ${errorMessage}`);
  }

  return response.json();
}

export async function fetchAhrefsData(input: BlogRequest) {
  const target = cleanDomain(input.websiteDomain);
  const date = new Date().toISOString().slice(0, 10);
  const baseParams = {
    target,
    date,
    limit: "20",
  };

  const [organicKeywords, topPages, metrics] = await Promise.all([
    fetchAhrefsEndpoint("organic-keywords", {
      ...baseParams,
      select:
        "keyword,best_position,best_position_url,volume,keyword_difficulty,sum_traffic,best_position_kind",
      order_by: "sum_traffic:desc",
    }),
    fetchAhrefsEndpoint("top-pages", {
      ...baseParams,
      select:
        "url,sum_traffic,keywords,top_keyword,top_keyword_volume,top_keyword_best_position,referring_domains,ur",
      order_by: "sum_traffic:desc",
    }),
    fetchAhrefsEndpoint("metrics", {
      target,
      date,
    }),
  ]);

  return {
    organicKeywords,
    topPages,
    metrics,
  };
}

export async function fetchGoogleSearchConsoleData(input: BlogRequest) {
  const clientEmail = process.env.GSC_CLIENT_EMAIL;
  const privateKey = process.env.GSC_PRIVATE_KEY
    ? normalizePrivateKey(process.env.GSC_PRIVATE_KEY)
    : undefined;
  const impersonationEmail = process.env.GSC_IMPERSONATION_EMAIL;
  const siteUrl = process.env.GSC_SITE_URL || "sc-domain:nobltravel.com";
  const endDate = todayMinusDays(3);
  const startDate = todayMinusDays(93);

  if (process.env.GSC_USE_AUTH !== "true") {
    return {
      startDate,
      endDate,
      rows: [],
      status: "skipped" as const,
      note:
        "Google Search Console auth is skipped for this local run; do not treat rows as live GSC data.",
    };
  }

  if (!clientEmail || !privateKey || !impersonationEmail) {
    throw new Error(
      "Missing Google Search Console service account environment variables.",
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    subject: impersonationEmail,
  });

  const searchconsole = google.searchconsole({ version: "v1", auth });
  let response;

  try {
    response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query", "page"],
        dimensionFilterGroups: [
          {
            filters: [
              {
                dimension: "query",
                operator: "contains",
                expression: input.mainKeyword,
              },
            ],
          },
        ],
        rowLimit: 25,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("DECODER routines")) {
      throw new Error(
        "Google Search Console private key could not be parsed. Set GSC_PRIVATE_KEY to the service account private_key with escaped newlines, or paste a base64-encoded service account JSON.",
      );
    }

    throw error;
  }

  return {
    startDate,
    endDate,
    rows: response.data.rows ?? [],
  };
}

export async function fetchSeoData(input: BlogRequest): Promise<SeoData> {
  const [ahrefs, googleSearchConsole] = await Promise.all([
    fetchAhrefsData(input),
    fetchGoogleSearchConsoleData(input),
  ]);

  return {
    ahrefs,
    googleSearchConsole,
  };
}
