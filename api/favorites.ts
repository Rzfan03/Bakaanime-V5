import { requireUser } from "./_lib/auth.js";
import { sql } from "./_lib/db.js";
import { guard, json, preflight, readBody } from "./_lib/http.js";

type Item = { slug: string; title: string; poster: string };

const MAX_FAVORITES = 500;

export default guard(async (req, res) => {
  if (preflight(req, res)) return;

  const auth = await requireUser(req);
  if ("error" in auth) return json(res, 401, { error: auth.error });
  const uid = auth.user.id;

  // Newest first (largest position = most recently added).
  if (req.method === "GET") {
    const rows = await sql`
      select anime_slug as slug, title, poster
      from favorites where user_id = ${uid} order by position desc
    `;
    return json(res, 200, { items: rows });
  }

  // Add one favorite (idempotent).
  if (req.method === "POST") {
    const { slug, title, poster } = readBody<Item>(req);
    if (!slug || !title || !poster) return json(res, 400, { error: "missing_fields" });

    const dup = await sql`
      select 1 from favorites where user_id = ${uid} and anime_slug = ${slug} limit 1
    `;
    if (dup.length === 0) {
      const next = await sql`
        select coalesce(max(position), -1) + 1 as next, count(*) as total
        from favorites where user_id = ${uid}
      `;
      if (Number(next[0].total) >= MAX_FAVORITES) return json(res, 400, { error: "too_many_favorites" });
      await sql`
        insert into favorites (user_id, anime_slug, title, poster, position)
        values (${uid}, ${slug}, ${title}, ${poster}, ${Number(next[0].next)})
      `;
    }
    return json(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    if (!slug) return json(res, 400, { error: "slug_required" });
    await sql`delete from favorites where user_id = ${uid} and anime_slug = ${slug}`;
    return json(res, 200, { ok: true });
  }

  // Replace the whole list (array order = display order, newest on top).
  if (req.method === "PUT") {
    const { items } = readBody<{ items?: Item[] }>(req);
    if (!Array.isArray(items)) return json(res, 400, { error: "items_required" });
    if (items.length > MAX_FAVORITES) return json(res, 400, { error: "too_many_favorites" });

    const clean = items.map((it, i) => ({ ...it, position: items.length - i - 1 }));
    await sql`delete from favorites where user_id = ${uid}`;
    for (const it of clean) {
      await sql`
        insert into favorites (user_id, anime_slug, title, poster, position)
        values (${uid}, ${it.slug}, ${it.title}, ${it.poster}, ${it.position})
      `;
    }
    return json(res, 200, { items });
  }

  return json(res, 405, { error: "method_not_allowed" });
});
