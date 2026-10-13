import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createToken } from "../_lib/auth.js";
import { sql } from "../_lib/db.js";
import { guard, json, preflight, readBody } from "../_lib/http.js";

type Body = { token?: string; name?: string; email?: string; avatar?: string | null };

// pk_test_<base64(host + "$")> → frontend API host
function frontendHost(pk: string): string {
  const b64 = pk.replace(/^pk_(test|live)_/, "");
  return Buffer.from(b64, "base64").toString("utf8").replace(/\$$/, "");
}

// Lazy-init agar selalu baca env terbaru (tidak di-cache saat module load)
function getJwks() {
  const pk = process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "";
  if (!pk) return null;
  const host = frontendHost(pk);
  const jwksUrl = `https://${host}/.well-known/jwks.json`;
  return {
    jwks: createRemoteJWKSet(new URL(jwksUrl), { cacheMaxAge: 300_000 }),
    issuer: `https://${host}`,
  };
}

// Tukar sesi Clerk → JWT kita. Verifikasi pakai JWKS publik Clerk.
export default guard(async (req: VercelRequest, res: VercelResponse) => {
  if (preflight(req, res)) return;
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const ctx = getJwks();
  if (!ctx) return json(res, 500, { error: "clerk_not_configured" });

  const { token, name, email, avatar } = readBody<Body>(req);
  if (!token) return json(res, 400, { error: "missing_token" });

  let sub = "";
  try {
    const { payload } = await jwtVerify(token, ctx.jwks, {
      issuer: ctx.issuer,
    });
    sub = (payload.sub ?? "") as string;
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
