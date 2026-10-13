import type { VercelRequest, VercelResponse } from "@vercel/node";
import { applyCors, guard, json } from "./_lib/http.js";

// desustream blocks iframing via CSP frame-ancestors, but its embed pages
// contain a direct .mp4/.m3u8 URL in the HTML. Fetch server-side (no CORS/CSP)
// and hand the raw stream URL back so the app plays it in a <video> element.
const HOSTS = ["desustream.net", "desustream.com", "desustream.me", "desustream.info"];

const UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

const isAllowed = (u: URL) =>
  u.protocol === "https:" && HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));

export default guard(async (req: VercelRequest, res: VercelResponse) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });

  const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  if (!raw) return json(res, 400, { error: "missing_url" });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return json(res, 400, { error: "bad_url" });
  }
  if (!isAllowed(target)) return json(res, 400, { error: "host_not_allowed" });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(target, {
      headers: { "User-Agent": UA, Referer: `https://${target.hostname}/` },
      signal: controller.signal,
    });
    if (!upstream.ok) return json(res, 502, { error: `upstream_${upstream.status}` });

    const html = await upstream.text();
    const named = html.match(/videoURL\s*=\s*["']([^"']+)["']/i);
    const any = html.match(/https?:\/\/[^\s"'<>\\]+\.(?:mp4|m3u8)(?:\?[^\s"'<>\\]*)?/i);
    const url = named?.[1] ?? any?.[0];
    if (!url) return json(res, 502, { error: "no_stream" });

    res.setHeader("Cache-Control", "public, s-maxage=900");
    return json(res, 200, { url });
  } catch {
    return json(res, 502, { error: "fetch_failed" });
  } finally {
    clearTimeout(timer);
  }
});
