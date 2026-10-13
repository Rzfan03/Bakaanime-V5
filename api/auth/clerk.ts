import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { createToken } from "../_lib/auth.js";
import { sql } from "../_lib/db.js";
import { guard, json, preflight, readBody } from "../_lib/http.js";

type Body = { token?: string; name?: string; email?: string; avatar?: string | null };

// Origins allowed to mint a session token (checked against the token's `azp`).
const AUTHORIZED_PARTIES = [
  "https://bakaanime-v5.vercel.app", // web (production)
  "https://app.bakaanime-v5.vercel.app", // Capacitor Android webview
  "https://localhost", // Capacitor Android webview origin
  "capacitor://localhost", // Capacitor iOS webview origin
  "http://localhost:5173", // vite dev
  "http://localhost:3000", // vercel dev
];

// Exchange a Clerk session for our JWT. Token signature verification uses JWKS
// fetched via the Clerk Backend API (secret key), independent of the pk host / proxy domain.
export default guard(async (req: VercelRequest, res: VercelResponse) => {
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return json(res, 500, { error: "clerk_not_configured" });

  const { token, name, email, avatar } = readBody<Body>(req);
  if (!token) return json(res, 400, { error: "missing_token" });

  let sub = "";
  try {
    const payload = await verifyToken(token, {
      secretKey,
      authorizedParties: AUTHORIZED_PARTIES,
    });
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
    returning id, email, name, avatar, banner, bio, verified, role, font, frame
  `;
  const jwt = await createToken((rows[0] as { id: string }).id);
  return json(res, 200, { token: jwt, user: rows[0] });
});
