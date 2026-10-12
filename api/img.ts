import type { VercelRequest, VercelResponse } from "@vercel/node";
import { guard, json } from "./_lib/http.js";

const ALLOWED_HOSTS = new Set(["anoboy.be", "www.anoboy.be"]);

const UA =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

// Proxy gambar: sebagian ISP memblokir host sumber, jadi ambil dari server (region sin1)
// lalu cache di edge Vercel. Jangan buka jadi open proxy — host wajib allowlist.
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

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return json(res, 400, { error: "host_not_allowed" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": UA,
        Referer: `https://${target.hostname}/`,
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    if (!upstream.ok || !upstream.body) {
      return json(res, 502, { error: `upstream_${upstream.status}` });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=604800, immutable");
    res.status(200).end(buf);
  } catch {
    if (!res.headersSent) json(res, 502, { error: "fetch_failed" });
  } finally {
    clearTimeout(timer);
  }
});
