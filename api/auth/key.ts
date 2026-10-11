import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createToken, loginWithKey } from "../_lib/auth.js";
import { json, preflight, readBody } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

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
