import { requireUser } from "./_lib/auth.js";
import { sql } from "./_lib/db.js";
import { guard, json, preflight, readBody } from "./_lib/http.js";

type Body = { animeSlug: string; episodeSlug: string };

export default guard(async (req, res) => {
  if (preflight(req, res)) return;

  const auth = await requireUser(req);
  if ("error" in auth) return json(res, 401, { error: auth.error });
  const uid = auth.user.id;

  if (req.method === "GET") {
    const rows = (await sql`
      select anime_slug, episode_slug
      from watched where user_id = ${uid}
      order by watched_at desc
    `) as { anime_slug: string; episode_slug: string }[];

    const watched: Record<string, string[]> = {};
    for (const r of rows) {
      (watched[r.anime_slug] ??= []).push(r.episode_slug);
    }
    return json(res, 200, { watched });
  }

  if (req.method === "POST") {
    const { animeSlug, episodeSlug } = readBody<Body>(req);
    if (!animeSlug || !episodeSlug) return json(res, 400, { error: "missing_fields" });
    await sql`
      insert into watched (user_id, anime_slug, episode_slug)
      values (${uid}, ${animeSlug}, ${episodeSlug})
      on conflict (user_id, anime_slug, episode_slug)
      do update set watched_at = now()
    `;
    return json(res, 200, { ok: true });
  }

  return json(res, 405, { error: "method_not_allowed" });
});
