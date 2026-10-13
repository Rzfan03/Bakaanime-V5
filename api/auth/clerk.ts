import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { createToken } from "../_lib/auth.js";
import { sql } from "../_lib/db.js";
import { guard, json, preflight, readBody } from "../_lib/http.js";

type Body = { token?: string; name?: string; email?: string; avatar?: string | null };

// Tukar sesi Clerk → JWT kita. Verifikasi tanda tangan token pakai JWKS yang
// diambil dari Backend API Clerk (secret key) — tak bergantung host pk/domain proxy.
export default guard(async (req: VercelRequest, res: VercelResponse) => {
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return json(res, 500, { error: "clerk_not_configured" });

  const { token, name, email, avatar } = readBody<Body>(req);
  if (!token) return json(res, 400, { error: "missing_token" });

  let sub = "";
  try {
    // ponytail: authorizedParties belum diisi — tambahkan setelah origin web/APK pasti.
    const payload = await verifyToken(token, { secretKey });
    sub = (payload?.sub ?? "") as string;
  } catch (e) {
    console.error("[clerk] verify failed", e);
    return json(res, 401, { error: "invalid_token" });
  }

  if (!sub) return json(res, 401, { error: "invalid_token" });

  const rows = await sql`
    insert into users (google_sub, email, name, avatar)
    values (${"clerk:" + sub}, ${email || sub + "@clerk.local"}, ${name || "Pengguna"}, ${avatar ?? null})
    on conflict (google_sub) do update set email = excluded.email
    returning id, email, name, avatar, banner, bio, verified, role, font
  `;
  const jwt = await createToken((rows[0] as { id: string }).id);
  return json(res, 200, { token: jwt, user: rows[0] });
});
