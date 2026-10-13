import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "node:stream";
import { clerkFrontendApiProxy } from "@clerk/backend/proxy";

// Proxy for the Clerk Frontend API. *.vercel.app domains can't CNAME to Clerk,
// so the browser calls /__clerk/* (see vercel.json) and it is forwarded here.
// Uses the official @clerk/backend implementation, which handles Clerk-Proxy-Url,
// Clerk-Secret-Key, Host, X-Forwarded-*, Location rewrites, and set-cookie.
// Docs: https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi
export const config = { api: { bodyParser: false } };

// Dev instances (pk_test) are served by their own host; production goes through Clerk's gateway.
// ponytail: frontend-api.clerk.dev assumes pk_live; change if Clerk alters the scheme.
function fapiUrlForPk(pk?: string): string | undefined {
  if (!pk) return undefined;
  if (pk.startsWith("pk_live_")) return "https://frontend-api.clerk.dev";
  const host = Buffer.from(pk.replace(/^pk_test_/, ""), "base64").toString("utf8").replace(/\$$/, "");
  return `https://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Web calls the proxy same-origin (no CORS). Native (APK / livereload) is
  // cross-origin, so reflect any origin and expose `authorization` (used by the
  // native bearer via __internal_onAfterResponse). Safe: no cookies
  // (credentials: omit), same as Clerk's public FAPI which is CORS-open anyway.
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      (req.headers["access-control-request-headers"] as string) ??
        "authorization,content-type,x-mobile,x-capacitor-sdk-version",
    );
    res.setHeader("Access-Control-Expose-Headers", "authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // The Vercel rewrite turns the path into /api/clerk-proxy?clerkPath=*, but
  // clerkFrontendApiProxy needs the real /__clerk/* pathname → reconstruct it.
  const url = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
  const clerkPath = url.searchParams.get("clerkPath") ?? "";
  url.searchParams.delete("clerkPath");

  const target = new URL(`/__clerk/${clerkPath}`, url.origin);
  target.search = url.search;

  const method = (req.method ?? "GET").toUpperCase();
  const withBody = method !== "GET" && method !== "HEAD";

  const request = new Request(target, {
    method,
    headers: req.headers as Record<string, string>,
    body: withBody ? (Readable.toWeb(req) as unknown as ReadableStream) : undefined,
    duplex: "half",
  } as RequestInit);

  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;

  const response = await clerkFrontendApiProxy(request, {
    publishableKey,
    secretKey: process.env.CLERK_SECRET_KEY,
    proxyPath: "/__clerk",
    fapiUrl: process.env.CLERK_FAPI_URL ?? fapiUrlForPk(publishableKey),
  });

  res.status(response.status);
  response.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    // don't overwrite the CORS headers set above
    if (k !== "set-cookie" && !k.startsWith("access-control-")) res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}
