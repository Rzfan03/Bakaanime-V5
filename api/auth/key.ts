import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createToken, loginWithKey } from "../_lib/auth.js";
import { json, preflight, readBody } from "../_lib/http.js";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 15;

// ponytail: in-memory sliding window — resets on cold start and is not shared
// across serverless instances. Move to a shared store (Upstash/DB) if a
// distributed brute-force is observed.
const attempts = new Map<string, number[]>();

function clientIp(req: VercelRequest): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = Array.isArray(fwd) ? fwd[0] : fwd;
  return (first?.split(",")[0] || req.socket?.remoteAddress || "unknown").trim();
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 5000) attempts.clear();
  return recent.length > MAX_ATTEMPTS;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  if (isRateLimited(clientIp(req))) {
    return json(res, 429, { error: "rate_limited", message: "Terlalu banyak percobaan." });
  }

  const { key } = readBody<{ key?: string }>(req);
  if (!key) return json(res, 400, { error: "missing_key" });

  try {
    const user = await loginWithKey(key);
    const token = await createToken(user.id);
    return json(res, 200, { token, user });
  } catch (e) {
    return json(res, 401, {
      error: "invalid_key",
      message: e instanceof Error ? e.message : "Key tidak valid.",
    });
  }
}
