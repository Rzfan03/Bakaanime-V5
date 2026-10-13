export type SeenMap = Record<string, number>;

export type EpisodeEntry = { slug: string; title: string; latest: number };
export type FreshEpisode = { slug: string; title: string; episode: number };

/**
 * Given what we've seen and the latest episode per anime, work out which anime
 * have a new episode. First sight of an anime just records a baseline (no notify),
 * so adding an anime to the Library stays quiet.
 */
export function diffNewEpisodes(
  seen: SeenMap,
  entries: EpisodeEntry[],
): { seen: SeenMap; fresh: FreshEpisode[] } {
  const next: SeenMap = { ...seen };
  const fresh: FreshEpisode[] = [];
  for (const e of entries) {
    const known = next[e.slug];
    if (known === undefined) {
      next[e.slug] = e.latest;
    } else if (e.latest > known) {
      next[e.slug] = e.latest;
      fresh.push({ slug: e.slug, title: e.title, episode: e.latest });
    }
  }
  return { seen: next, fresh };
}
