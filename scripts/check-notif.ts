import assert from "node:assert";
import { diffNewEpisodes } from "../src/lib/notifDiff.ts";

// First sight of an anime = baseline only (no notification).
let r = diffNewEpisodes({}, [{ slug: "a", title: "Anime A", latest: 5 }]);
assert.deepStrictEqual(r.fresh, []);
assert.equal(r.seen.a, 5);

// Same latest episode = nothing new.
r = diffNewEpisodes(r.seen, [{ slug: "a", title: "Anime A", latest: 5 }]);
assert.deepStrictEqual(r.fresh, []);

// Newer episode = notify, carrying the title.
r = diffNewEpisodes(r.seen, [{ slug: "a", title: "Anime A", latest: 6 }]);
assert.deepStrictEqual(r.fresh, [{ slug: "a", title: "Anime A", episode: 6 }]);
assert.equal(r.seen.a, 6);

// A brand-new anime mixed with an existing one: only the existing one can notify.
r = diffNewEpisodes(r.seen, [
  { slug: "a", title: "Anime A", latest: 7 },
  { slug: "b", title: "Anime B", latest: 3 },
]);
assert.deepStrictEqual(r.fresh, [{ slug: "a", title: "Anime A", episode: 7 }]);
assert.equal(r.seen.b, 3);

console.log("notifDiff: ok");
