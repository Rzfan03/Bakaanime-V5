import { requireUser } from "./_lib/auth.js";
import { sql } from "./_lib/db.js";
import { guard, json, preflight, readBody } from "./_lib/http.js";

type Body = {
  name?: string;
  bio?: string;
  avatar?: string | null;
  banner?: string | null;
  font?: string;
  frame?: string;
};

const ALLOWED_FONTS = ["default", "mono", "serif", "cursive", "pixel", "rounded"];
const PRIVILEGED_ROLES = ["admin", "dev"];

// Minimum role required to wear each avatar frame.
const FRAME_MIN_ROLE: Record<string, string> = {
  plain: "user",
  aurora: "admin",
  neon: "admin",
  hex: "dev",
  ember: "dev",
  orbit: "dev",
  gold: "admin",
};

function roleLevel(role: string): number {
  if (role === "dev") return 3;
  if (role === "admin") return 2;
  return 1;
}

export default guard(async (req, res) => {
  if (preflight(req, res)) return;
  if (req.method !== "PUT") return json(res, 405, { error: "method_not_allowed" });

  const auth = await requireUser(req);
  if ("error" in auth) return json(res, 401, { error: auth.error });

  const body = readBody<Body>(req);
  const name = body.name?.trim();
  if (body.name !== undefined && !name) return json(res, 400, { error: "name_required" });
  if (body.bio !== undefined && body.bio.length > 160) {
    return json(res, 400, { error: "bio_too_long" });
  }
  if (body.font !== undefined) {
    if (!PRIVILEGED_ROLES.includes(auth.user.role)) {
      return json(res, 403, { error: "font_not_allowed" });
    }
    if (!ALLOWED_FONTS.includes(body.font)) {
      return json(res, 400, { error: "invalid_font" });
    }
  }
  if (body.frame !== undefined) {
    const minRole = FRAME_MIN_ROLE[body.frame];
    if (!minRole) return json(res, 400, { error: "invalid_frame" });
    if (roleLevel(auth.user.role) < roleLevel(minRole)) {
      return json(res, 403, { error: "frame_not_allowed" });
    }
  }

  const rows = await sql`
    update users set
      name   = coalesce(${name ?? null}, name),
      bio    = coalesce(${body.bio ?? null}, bio),
      avatar = coalesce(${body.avatar ?? null}, avatar),
      banner = coalesce(${body.banner ?? null}, banner),
      font   = coalesce(${body.font ?? null}, font),
      frame  = coalesce(${body.frame ?? null}, frame)
    where id = ${auth.user.id}
    returning id, email, name, avatar, banner, bio, verified, role, font, frame
  `;
  return json(res, 200, { user: rows[0] });
});
