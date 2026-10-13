import { backend } from "./api/backend";
import type { BackendItem } from "./api/backend";
import { readFavorites, readLibrary, writeFavorites, writeLibrary } from "./storage";

/**
 * Favorites = written to BOTH places at once: the Library page and the Favorites
 * tab on the profile. Every heart button (Detail, Watch) and delete button (Library,
 * Profile) goes through here so the two lists always match.
 */
export async function addFavorite(item: BackendItem): Promise<void> {
  // both are idempotent on the server, so re-running is safe if one fails
  await backend.addLibrary(item);
  await backend.addFavorite(item);
  writeLibrary([item, ...readLibrary().filter((i) => i.slug !== item.slug)]);
  writeFavorites([item, ...readFavorites().filter((i) => i.slug !== item.slug)]);
}

export async function removeFavorite(slug: string): Promise<void> {
  await backend.removeFavorite(slug);
  await backend.removeLibrary(slug);
  writeLibrary(readLibrary().filter((i) => i.slug !== slug));
  writeFavorites(readFavorites().filter((i) => i.slug !== slug));
}

/**
 * Legacy data: favorites used to be picked manually (max 3) from the library, so
 * some library anime aren't favorites yet. This adds the missing ones so library
 * and favorites match, then returns both updated lists.
 */
export async function loadFavorites(): Promise<{ library: BackendItem[]; favorites: BackendItem[] }> {
  const [lib, fav] = await Promise.all([backend.getLibrary(), backend.getFavorites()]);
  const have = new Set(fav.items.map((i) => i.slug));
  const missing = lib.items.filter((i) => !have.has(i.slug));

  // library is ordered newest-first; add from oldest so the order is preserved
  const added: BackendItem[] = [];
  for (const item of [...missing].reverse()) {
    try {
      await backend.addFavorite(item);
      added.unshift(item);
    } catch {
      /* retried on the next load */
    }
  }

  const favorites = [...added, ...fav.items];
  writeLibrary(lib.items);
  writeFavorites(favorites);
  return { library: lib.items, favorites };
}
