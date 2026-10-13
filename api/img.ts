import type { VercelRequest, VercelResponse } from "@vercel/node";
import { guard, json } from "./_lib/http.js";

const HOST_SUFFIXES = ["anoboy.be", "anime-kuindo.com"];
const PHOTON_HOSTS = new Set(["i0.wp.com", "i1.wp.com", "i2.wp.com"]);

const matchesSuffix = (host: string) => {
  const h = host.toLowerCase();
  return HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`));
};

const isAllowed = (url: URL): boolean => {
  if (url.protocol !== "https:") return false;
  if (matchesSuffix(url.hostname)) return true;
  if (PHOTON_HOSTS.has(url.hostname.toLowerCase())) {
    return matchesSuffix(url.pathname.split("/")[1] ?? "");
  }
  return false;
};

const UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

// Image proxy: some ISPs block the source hosts, so fetch server-side (sin1 region)
// and cache at the Vercel edge. Must not become an open proxy — hosts require an allowlist.
export default guard(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const raw = Array.isArray(req.query.u) ? req.query.u[0] : req.query.u;
  if (!raw) return json(res, 400, { error: "missing_u" });

  let target: URL;
  try {
    target = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return json(res, 400, { error: "bad_url" });
  }

  if (!isAllowed(target)) {
    return json(res, 400, { error: "host_not_allowed" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    let url = target;
    let upstream: Response | null = null;
    // Follow redirects manually so every hop is re-checked against the allowlist
    // (otherwise an allowed host could 30x-redirect to an internal address).
    for (let hop = 0; hop < 4; hop++) {
      const r = await fetch(url, {
        redirect: "manual",
        headers: {
          "User-Agent": UA,
          Referer: `https://${url.hostname}/`,
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get("location");
        if (!location) {
          upstream = r;
          break;
        }
        const next = new URL(location, url);
        if (!isAllowed(next)) return json(res, 502, { error: "redirect_not_allowed" });
        url = next;
        continue;
      }
      upstream = r;
      break;
    }
    if (!upstream) return json(res, 502, { error: "too_many_redirects" });
    if (!upstream.ok || !upstream.body) {
      return json(res, 502, { error: `upstream_${upstream.status}` });
    }
    const type = upstream.headers.get("content-type") ?? "image/jpeg";
    if (!type.toLowerCase().startsWith("image/")) {
      return json(res, 502, { error: "upstream_not_image" });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=604800, immutable");
    res.status(200).end(buf);
  } catch {
    if (!res.headersSent) json(res, 502, { error: "fetch_failed" });
  } finally {
    clearTimeout(timer);
  }
});
