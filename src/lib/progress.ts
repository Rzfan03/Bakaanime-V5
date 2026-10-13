export type ProgressItem = {
  animeSlug: string;
  title: string;
  poster: string;
  episodeSlug: string;
  episodeNumber: number;
  watchedCount: number;
  total: number;
  updatedAt: number;
};

const KEY = "bakaanime_progress";
const MAX = 20;

export function readProgress(): ProgressItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((p) => p && p.animeSlug && p.episodeSlug);
  } catch {
    return [];
  }
}

export function writeProgress(item: ProgressItem) {
  const rest = readProgress().filter((p) => p.animeSlug !== item.animeSlug);
  const next = [item, ...rest].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full/blocked */
  }
}
