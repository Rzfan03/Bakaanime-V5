import { currentUser } from "./_lib/auth.js";
import { guard, json, preflight } from "./_lib/http.js";

export default guard(async (req, res) => {
  if (preflight(req, res)) return;
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });

  const user = await currentUser(req);
  return json(res, 200, { user });
});
