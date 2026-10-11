import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createToken, upsertUser, verifyGoogleCredential } from "../_lib/auth.js";
import { json, preflight, readBody } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const { credential } = readBody<{ credential?: string }>(req);
  if (!credential) return json(res, 400, { error: "missing_credential" });

  try {
    const profile = await verifyGoogleCredential(credential);
    const user = await upsertUser(profile);
    const token = await createToken(user.id);
    return json(res, 200, { token, user });
  } catch (e) {
    return json(res, 401, {
      error: "invalid_credential",
      message: e instanceof Error ? e.message : "Gagal memverifikasi akun Google.",
    });
  }
}
