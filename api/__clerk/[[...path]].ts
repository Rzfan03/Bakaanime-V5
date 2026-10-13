import type { VercelRequest, VercelResponse } from "@vercel/node";

// Proxy Clerk Frontend API. Di domain *.vercel.app tak bisa CNAME ke Clerk,
// jadi browser memanggil /__clerk/* di origin sendiri dan diteruskan ke sini.
// Docs: https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi
const FAPI = (process.env.CLERK_FAPI_URL ?? "https://happy-bluebird-3868.clerk.accounts.dev").replace(/\/$/, "");
const APP_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://bakaanime-v5.vercel.app";

const PASSTHROUGH_HEADERS = [
  "content-type",
  "cache-control",
  "location",
  "etag",
  "expires",
  "vary",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-methods",
  "access-control-allow-headers",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    res.status(500).json({ error: "clerk_secret_missing" });
    return;
  }

  const path = (
    Array.isArray(req.query.path)
      ? req.query.path.filter(Boolean)
      : req.query.path
        ? [req.query.path]
        : []
  ).join("/");
  const query = (req.url ?? "").split("?")[1];

  const headers: Record<string, string> = {
    "Clerk-Proxy-Url": `${APP_URL}/__clerk`,
    "Clerk-Secret-Key": secret,
  };
  const xff = (req.headers["x-forwarded-for"] as string | undefined)
    ?.split(",")[0]
    ?.trim();
  if (xff) headers["X-Forwarded-For"] = xff;
  for (const [k, v] of Object.entries(req.headers)) {
    if (["host", "connection", "content-length", "x-forwarded-for"].includes(k) || typeof v !== "string") continue;
    headers[k] = v;
  }

  const body =
    req.body === undefined || req.body === null
      ? undefined
      : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

  const target = `${FAPI}/${path}${query ? `?${query}` : ""}`;

  try {
    const upstream = await fetch(target, {
      method: req.method ?? "GET",
      headers,
      body,
    });
    const content = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    for (const k of PASSTHROUGH_HEADERS) {
      const v = upstream.headers.get(k);
      if (v) res.setHeader(k, v);
    }
    res.end(content);
  } catch (e) {
    console.error("[__clerk] proxy failed", e);
    res.status(502).json({ error: "clerk_proxy_failed" });
  }
}