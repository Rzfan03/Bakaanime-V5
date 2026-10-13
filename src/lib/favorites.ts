import { backend } from "./api/backend";
import type { BackendItem } from "./api/backend";
import { readFavorites, readLibrary, writeFavorites, writeLibrary } from "./storage";

/**
 * Favorit = masuk ke DUA tempat sekaligus: halaman Library dan tab Favorit di profil.
 * Semua tombol hati (Detail, Watch) dan tombol hapus (Library, Profil) lewat sini,
 * supaya kedua daftar selalu sama.
 */
export async function addFavorite(item: BackendItem): Promise<void> {
  // keduanya idempoten di server, jadi aman diulang kalau salah satu gagal
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
 * Data lama: favorit dulu dipilih manual (maks. 3) dari library, jadi sebagian
 * anime di library belum jadi favorit. Fungsi ini menambahkan yang kurang
 * supaya library dan favorit sama, lalu mengembalikan kedua daftar terbaru.
 */
export async function loadFavorites(): Promise<{ library: BackendItem[]; favorites: BackendItem[] }> {
  const [lib, fav] = await Promise.all([backend.getLibrary(), backend.getFavorites()]);
  const have = new Set(fav.items.map((i) => i.slug));
  const missing = lib.items.filter((i) => !have.has(i.slug));

  // library diurutkan terbaru dulu; tambahkan dari yang terlama agar urutan terjaga
  const added: BackendItem[] = [];
  for (const item of [...missing].reverse()) {
    try {
      await backend.addFavorite(item);
      added.unshift(item);
    } catch {
      /* dicoba lagi pada pemuatan berikutnya */
    }
  }

  const favorites = [...added, ...fav.items];
  writeLibrary(lib.items);
  writeFavorites(favorites);
  return { library: lib.items, favorites };
}
