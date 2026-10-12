import { requireUser } from "./_lib/auth.js";
import { sql } from "./_lib/db.js";
import { guard, json, preflight, readBody } from "./_lib/http.js";

type Body = { animeSlug: string; body: string };

export default guard(async (req, res) => {
  if (preflight(req, res)) return;

  if (req.method === "GET") {
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    if (!slug) return json(res, 400, { error: "slug_required" });
    const rows = await sql`
      select c.id, c.body, c.created_at,
             u.name as author_name, u.avatar as author_avatar,
             u.verified as author_verified, u.role as author_role
      from comments c
      join users u on u.id = c.user_id
      where c.anime_slug = ${slug}
      order by c.created_at desc
      limit 100
    `;
    return json(res, 200, { comments: rows });
  }

  if (req.method === "POST") {
    const auth = await requireUser(req);
    if ("error" in auth) return json(res, 401, { error: auth.error });

    const { animeSlug, body } = readBody<Body>(req);
    const text = body?.trim();
    if (!animeSlug || !text) return json(res, 400, { error: "missing_fields" });
    if (text.length > 1000) return json(res, 400, { error: "comment_too_long" });

    const rows = await sql`
      insert into comments (anime_slug, user_id, body)
      values (${animeSlug}, ${auth.user.id}, ${text})
      returning id, body, created_at
    `;
    return json(res, 201, {
      comment: {
        ...(rows[0] as object),
        author_name: auth.user.name,
        author_avatar: auth.user.avatar,
        author_verified: auth.user.verified,
        author_role: auth.user.role,
      },
    });
  }

  return json(res, 405, { error: "method_not_allowed" });
});
