import axios from "axios";
import type {
  AnimeDetail,
  AnimeItem,
  AnimeListResult,
  Episode,
  EpisodeDetail,
} from "../../types/anime";

const api = axios.create({
  baseURL: "https://www.sankavollerei.web.id/anime/animekuindo",
  timeout: 20000,
});

const pickString = (obj: any, keys: string[]): string => {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
};

const toList = (value: unknown): any[] => (Array.isArray(value) ? value : []);

const normSlug = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const seriesSlugOf = (slug: string): string => slug.replace(/-episode-\d+.*$/i, "");

const cleanTitle = (t: string): string =>
  t.replace(/\s+Episode\s+\d+.*$/i, "").trim() || t;

const toGenre = (g: any): string =>
  typeof g === "string" ? g : pickString(g, ["name", "title"]);

const toItem = (a: any): AnimeItem => {
  const slug = normSlug(pickString(a, ["slug", "id"]));
  const episode = pickString(a, ["episode"]);
  return {
    title: cleanTitle(pickString(a, ["title", "name"])),
    slug,
    seriesSlug: seriesSlugOf(slug),
    poster: pickString(a, ["poster", "image", "thumbnail"]),
    episode,
    type: pickString(a, ["type"]),
    isEpisode: /^ep(isode)?\s*\d/i.test(episode),
  };
};

const fetchList = async (
  path: string,
  page: number,
  params: Record<string, string> = {}
): Promise<AnimeListResult> => {
  const res = await api.get(path, { params: { page, ...params } });

  const data = res.data?.data;
  const rows = Array.isArray(data) ? data : (data?.latest ?? res.data?.anime_list ?? []);

  const seen = new Set<string>();
  const items: AnimeItem[] = [];
  for (const raw of toList(rows)) {
    const item = toItem(raw);
    if (!item.slug || seen.has(item.seriesSlug)) continue;
    seen.add(item.seriesSlug);
    items.push(item);
  }

  const p = res.data?.pagination;
  return {
    items,
    pagination: {
      currentPage: Number(p?.currentPage ?? p?.current_page) || page,
      hasPrev:
        typeof p?.hasPrev === "boolean"
          ? p.hasPrev
          : typeof p?.has_prev === "boolean"
            ? p.has_prev
            : page > 1,
      hasNext:
        typeof p?.hasNext === "boolean"
          ? p.hasNext
          : typeof p?.has_next === "boolean"
            ? p.has_next
            : items.length > 0,
    },
  };
};

export const getHome = (page = 1) => fetchList("/home", page);

export const searchAnime = (keyword: string, page = 1) =>
  fetchList(`/search/${encodeURIComponent(keyword)}`, page);

export const getByGenre = (slug: string, page = 1) =>
  fetchList(`/genres/${encodeURIComponent(slug)}`, page);

const toEpisode = (e: any): Episode => {
  const slug = normSlug(pickString(e, ["slug", "id"]));
  const fromSlug = slug.match(/episode-(\d+)/i)?.[1];
  return {
    title: pickString(e, ["title", "name"]),
    slug,
    number: Number(pickString(e, ["episode", "number"])) || Number(fromSlug) || 0,
    date: pickString(e, ["release_date", "date"]) || undefined,
  };
};

export const normalizeDetail = (raw: any): AnimeDetail => {
  const d = raw?.detail ?? raw?.data ?? raw ?? {};
  const info = d.info ?? {};

  const episodes = toList(d.episode_list ?? d.episodes)
    .map(toEpisode)
    .filter((e) => e.slug)
    .sort((a, b) => a.number - b.number);

  const detail: AnimeDetail = {
    title: pickString(d, ["title", "name"]),
    seriesSlug: "",
    poster: pickString(d, ["poster", "image", "thumbnail"]),
    synopsis: pickString(d, ["synopsis", "description"]),
    status: pickString(info, ["status"]),
    type: pickString(info, ["type", "tipe"]),
    studio: pickString(info, ["studio"]) || undefined,
    season: pickString(info, ["season"]) || undefined,
    released: pickString(info, ["released", "dirilis"]) || undefined,
    duration: pickString(info, ["duration", "durasi"]) || undefined,
    totalEpisode:
      pickString(info, ["episodes", "total_episode", "episode"]) || undefined,
    genres: toList(d.genres).map(toGenre).filter(Boolean),
    episodes,
  };

  if (!detail.title && episodes.length === 0) {
    console.error("Respons detail tidak dikenali:", raw);
    throw new Error("Format respons detail tidak dikenali.");
  }

  return detail;
};

// Bad slugs still return 200 with garbage (homepage headlines), so validate:
// a real detail always has info or episodes.
const isRealDetail = (raw: any): boolean => {
  const d = raw?.data ?? raw?.detail ?? raw ?? {};
  const info = d?.info ?? {};
  const eps = d?.episode_list ?? d?.episodes ?? [];
  return Object.keys(info).length > 0 || (Array.isArray(eps) && eps.length > 0);
};

const isEpisodeSlug = (slug: string): boolean => /-episode-\d+/i.test(slug);

const fetchDetail = async (slug: string): Promise<AnimeDetail | null> => {
  const res = await api.get(`/detail/${encodeURIComponent(slug)}`);
  if (!isRealDetail(res.data)) return null;
  const detail = normalizeDetail(res.data);
  detail.seriesSlug = slug;
  return detail;
};

// The canonical upstream series slug can only be confirmed via the episode endpoint.
const resolveAnimeSlug = async (episodeSlug: string): Promise<string> => {
  try {
    const res = await api.get(`/episode/${encodeURIComponent(episodeSlug)}`);
    return normSlug(pickString(res.data?.data ?? res.data ?? {}, ["anime_slug", "animeSlug"]));
  } catch {
    return "";
  }
};

// Upstream series slugs sometimes include (or omit) "-season-N"/"-part-N"/"-cour-N"
// (e.g. rezero-...-season-1 -> rezero-...). Try variants before falling back to episode resolution.
const detailCandidates = (slug: string): string[] => {
  const out = [slug];
  const add = (s: string) => {
    if (s && !out.includes(s)) out.push(s);
  };
  add(slug.replace(/(-(season|part|cour)-\d+|-\d+(st|nd|rd|th)-season)$/i, ""));
  add(slug.replace(/-season-\d+$/i, ""));
  add(slug.replace(/-part-\d+$/i, ""));
  add(slug.replace(/-cour-\d+$/i, ""));
  return out;
};

export const getDetail = async (slug: string): Promise<AnimeDetail> => {
  // Feed cards use episode slugs; the series is usually the slug without "-episode-N".
  const candidates = detailCandidates(isEpisodeSlug(slug) ? seriesSlugOf(slug) : slug);
  for (const candidate of candidates) {
    const found = await fetchDetail(candidate).catch(() => null);
    if (found) return found;
  }

  if (isEpisodeSlug(slug)) {
    const canonical = await resolveAnimeSlug(slug);
    if (canonical && !candidates.includes(canonical)) {
      const viaEpisode = await fetchDetail(canonical).catch(() => null);
      if (viaEpisode) return viaEpisode;
    }
  }

  throw new Error("Anime tidak ditemukan.");
};

export const normalizeEpisode = (raw: any, episodeSlug = ""): EpisodeDetail => {
  const d = raw?.data ?? raw ?? {};

  const seen = new Set<string>();
  const streams = toList(d.streams)
    .map((s) => ({
      name: pickString(s, ["server", "name", "label", "title"]) || "Stream",
      url: pickString(s, ["url", "link", "src"]),
    }))
    .filter((s) => {
      if (!s.url || seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });

  const downloads = toList(d.downloads)
    .flatMap((x) => (Array.isArray(x?.links) ? x.links : [x]))
    .map((l) => ({
      host: pickString(l, ["host", "name", "label", "title"]) || "Download",
      url: pickString(l, ["url", "link"]),
    }))
    .filter((l) => l.url);

  // API doesn't return anime_slug; derive it from the episode slug
  const animeSlug =
    normSlug(pickString(d, ["anime_slug", "animeSlug"])) ||
    seriesSlugOf(episodeSlug);

  return {
    title: pickString(d, ["title", "name"]),
    animeSlug,
    streams,
    downloads,
  };
};

export const getEpisode = async (slug: string): Promise<EpisodeDetail> => {
  const res = await api.get(`/episode/${encodeURIComponent(slug)}`);
  return normalizeEpisode(res.data, slug);
};

export const describeError = (_e: unknown): string => "Telah Terjadi Sebuah Kesalahan.";