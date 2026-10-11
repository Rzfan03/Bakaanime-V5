import { requireUser } from "./_lib/auth.js";
import { sql } from "./_lib/db.js";
import { guard, json, preflight, readBody } from "./_lib/http.js";

type Item = { slug: string; title: string; poster: string };

export default guard(async (req, res) => {
  if (preflight(req, res)) return;

  const auth = await requireUser(req);
  if ("error" in auth) return json(res, 401, { error: auth.error });
  const uid = auth.user.id;

  if (req.method === "GET") {
    const rows = await sql`
      select anime_slug as slug, title, poster
      from favorites where user_id = ${uid} order by position
    `;
    return json(res, 200, { items: rows });
  }

  if (req.method === "PUT") {
    const { items } = readBody<{ items?: Item[] }>(req);
    if (!Array.isArray(items)) return json(res, 400, { error: "items_required" });
    if (items.length > 3) return json(res, 400, { error: "max_3_favorites" });

    const clean = items.slice(0, 3).map((it, i) => ({ ...it, position: i }));
    await sql`delete from favorites where user_id = ${uid}`;
    for (const it of clean) {
      await sql`
        insert into favorites (user_id, anime_slug, title, poster, position)
        values (${uid}, ${it.slug}, ${it.title}, ${it.poster}, ${it.position})
      `;
    }
    return json(res, 200, { items: clean });
  }

  return json(res, 405, { error: "method_not_allowed" });
});
