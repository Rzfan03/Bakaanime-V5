import { requireUser } from "./_lib/auth.js";
import { sql } from "./_lib/db.js";
import { guard, json, preflight, readBody } from "./_lib/http.js";

type Body = { slug: string; title: string; poster: string };

export default guard(async (req, res) => {
  if (preflight(req, res)) return;

  const auth = await requireUser(req);
  if ("error" in auth) return json(res, 401, { error: auth.error });
  const uid = auth.user.id;

  if (req.method === "GET") {
    const rows = await sql`
      select anime_slug as slug, title, poster
      from library where user_id = ${uid} order by created_at desc
    `;
    return json(res, 200, { items: rows });
  }

  if (req.method === "POST") {
    const { slug, title, poster } = readBody<Body>(req);
    if (!slug || !title || !poster) return json(res, 400, { error: "missing_fields" });
    await sql`
      insert into library (user_id, anime_slug, title, poster)
      values (${uid}, ${slug}, ${title}, ${poster})
      on conflict (user_id, anime_slug) do nothing
    `;
    return json(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    if (!slug) return json(res, 400, { error: "slug_required" });
    await sql`delete from library where user_id = ${uid} and anime_slug = ${slug}`;
    return json(res, 200, { ok: true });
  }

  return json(res, 405, { error: "method_not_allowed" });
});
