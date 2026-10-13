import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "node:stream";
import { clerkFrontendApiProxy } from "@clerk/backend/proxy";

// Proxy Clerk Frontend API. Di domain *.vercel.app tak bisa CNAME ke Clerk,
// jadi browser memanggil /__clerk/* (lihat vercel.json) dan diteruskan ke sini.
// Pakai implementasi resmi @clerk/backend: menangani Clerk-Proxy-Url,
// Clerk-Secret-Key, Host, X-Forwarded-*, rewrite Location, dan set-cookie.
// Docs: https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi
export const config = { api: { bodyParser: false } };

// Dev instance (pk_test) dilayani host-nya sendiri; produksi lewat gateway Clerk.
// ponytail: frontend-api.clerk.dev mengasumsikan pk_live; ganti bila Clerk ubah skema.
function fapiUrlForPk(pk?: string): string | undefined {
  if (!pk) return undefined;
  if (pk.startsWith("pk_live_")) return "https://frontend-api.clerk.dev";
  const host = Buffer.from(pk.replace(/^pk_test_/, ""), "base64").toString("utf8").replace(/\$$/, "");
  return `https://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel rewrite mengubah path jadi /api/clerk-proxy?clerkPath=*, sedangkan
  // clerkFrontendApiProxy butuh pathname asli /__clerk/* → rekonstruksi.
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
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader("set-cookie", cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}
