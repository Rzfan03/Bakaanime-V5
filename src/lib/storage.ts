export type LibraryItem = { slug: string; title: string; poster: string };
export type FavoriteItem = { slug: string; title: string; poster: string };
export type UserProfile = { name: string; bio: string; avatar: string; banner: string };

type WatchedMap = Record<string, string[]>;

/* ── Library ─────────────────────────────────────────────────── */
export function readLibrary(): LibraryItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem("library") ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeLibrary(items: LibraryItem[]) {
  try {
    localStorage.setItem("library", JSON.stringify(items));
  } catch {
    return;
  }
}

/* ── Watched ─────────────────────────────────────────────────── */
function readWatchedMap(): WatchedMap {
  try {
    const raw = JSON.parse(localStorage.getItem("watched") ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

export function readWatched(animeSlug: string): string[] {
  const list = readWatchedMap()[animeSlug];
  return Array.isArray(list) ? list : [];
}

export function markWatched(animeSlug: string, episodeSlug: string): string[] {
  const map = readWatchedMap();
  const list = Array.isArray(map[animeSlug]) ? map[animeSlug] : [];
  if (list.includes(episodeSlug)) return list;

  const next = [...list, episodeSlug];
  try {
    localStorage.setItem("watched", JSON.stringify({ ...map, [animeSlug]: next }));
  } catch {
    return next;
  }
  return next;
}

/* ── Favorites (tampil di Library dan tab Favorit di profil) ── */
export function readFavorites(): FavoriteItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem("favorites") ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function writeFavorites(items: FavoriteItem[]) {
  try {
    localStorage.setItem("favorites", JSON.stringify(items));
  } catch {
    return;
  }
}

export function toggleFavorite(item: FavoriteItem): FavoriteItem[] {
  const current = readFavorites();
  const exists = current.some((f) => f.slug === item.slug);
  const next = exists
    ? current.filter((f) => f.slug !== item.slug)
    : [item, ...current];
  writeFavorites(next);
  return next;
}

export function isFavorite(slug: string): boolean {
  return readFavorites().some((f) => f.slug === slug);
}

/* ── User profile ────────────────────────────────────────────── */
const DEFAULT_PROFILE: UserProfile = {
  name: "Pengguna BakaAnime",
  bio: "",
  avatar: "",
  banner: "",
};

export function readProfile(): UserProfile {
  try {
    const raw = JSON.parse(localStorage.getItem("profile") ?? "null");
    if (raw && typeof raw === "object") return { ...DEFAULT_PROFILE, ...raw };
  } catch {
    return DEFAULT_PROFILE;
  }
  return DEFAULT_PROFILE;
}

export function writeProfile(data: Partial<UserProfile>) {
  try {
    const current = readProfile();
    localStorage.setItem("profile", JSON.stringify({ ...current, ...data }));
  } catch {
    return;
  }
}
