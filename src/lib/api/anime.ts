import axios from "axios";
import type {
  AnimeDetail,
  AnimeItem,
  AnimeListResult,
  DownloadLink,
  Episode,
  EpisodeDetail,
  Genre,
  ScheduleDay,
  StreamSource,
} from "../../types/anime";

// Source: Otakudesu via the Sanka Vollerei aggregate API. Otakudesu is the
// default source so its endpoints are unprefixed (/home, /anime/{slug}, ...).
const api = axios.create({
  baseURL: "https://www.sankavollerei.web.id/anime",
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

// Some embed hosts (desustream*) send CSP `frame-ancestors` that forbid our
// app origin, so their iframes never load. Detect them to offer an external
// "open in browser" fallback instead of a dead player.
const NON_EMBEDDABLE = /(^|\.)desustream\.(com|net|me|info)$/i;
export const canEmbedStream = (url: string): boolean => {
  try {
    return !NON_EMBEDDABLE.test(new URL(url).hostname);
  } catch {
    return true;
  }
};

const toList = (value: unknown): any[] => (Array.isArray(value) ? value : []);

// Upstream sometimes returns root-relative paths (e.g. "/anime/batch/x").
// Left relative, they'd resolve to the app origin and navigate the SPA.
const absUrl = (u: string): string => {
  if (!u) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) return u;
  try {
    return new URL(u, api.defaults.baseURL + "/").toString();
  } catch {
    return u;
  }
};

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
  const slug = normSlug(pickString(a, ["slug", "id", "animeId"]));
  const episode =
    pickString(a, ["episode"]) ||
    (typeof a?.episodes === "number" ? `${a.episodes} Eps` : "");
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
  const rows = Array.isArray(data)
    ? data
    : (data?.animeList ?? data?.ongoing?.animeList ?? data?.latest ?? res.data?.anime_list ?? []);

  const seen = new Set<string>();
  const items: AnimeItem[] = [];
  for (const raw of toList(rows)) {
    const item = toItem(raw);
    if (!item.slug || seen.has(item.seriesSlug)) continue;
    seen.add(item.seriesSlug);
    items.push(item);
  }

  const p = res.data?.pagination ?? data?.pagination;
  const hasPrevRaw = p?.hasPrev ?? p?.has_prev ?? p?.hasPrevPage;
  const hasNextRaw = p?.hasNext ?? p?.has_next ?? p?.hasNextPage;
  return {
    items,
    pagination: {
      currentPage: Number(p?.currentPage ?? p?.current_page) || page,
      hasPrev: typeof hasPrevRaw === "boolean" ? hasPrevRaw : page > 1,
      hasNext: typeof hasNextRaw === "boolean" ? hasNextRaw : items.length > 0,
    },
  };
};

// List browsing fails over to Animekompi when Otakudesu errors (down, rate-limit).
// Detail/episode stay on Otakudesu; its episode streams already carry mirrors.
const withListFallback = async (
  primary: () => Promise<AnimeListResult>,
  secondary: () => Promise<AnimeListResult>
): Promise<AnimeListResult> => {
  try {
    return await primary();
  } catch {
    return secondary();
  }
};

export const getHome = (page = 1) =>
  withListFallback(
    () => fetchList("/ongoing-anime", page),
    () => fetchList("/animekompi/home", page)
  );

export const searchAnime = (keyword: string, page = 1) =>
  withListFallback(
    () => fetchList(`/search/${encodeURIComponent(keyword)}`, page),
    () => fetchList("/animekompi/search", page, { q: keyword })
  );

export const getByGenre = (slug: string, page = 1) =>
  fetchList(`/genre/${encodeURIComponent(slug)}`, page);

export const getGenres = async (): Promise<Genre[]> => {
  const res = await api.get("/genre");
  const raw =
    res.data?.data?.genreList ?? res.data?.data ?? res.data?.genreList;
  return toList(raw)
    .map((g) => ({
      title: pickString(g, ["title", "name"]),
      slug: pickString(g, ["genreId", "slug", "id"]),
    }))
    .filter((g) => g.title && g.slug);
};

export const getSchedule = async (): Promise<ScheduleDay[]> => {
  const res = await api.get("/schedule");
  const raw = res.data?.data ?? res.data;
  return toList(raw)
    .map((d) => ({
      day: pickString(d, ["day"]),
      items: toList(d?.anime_list ?? d?.animeList)
        .map(toItem)
        .filter((a) => a.slug && a.title),
    }))
    .filter((d) => d.day && d.items.length > 0);
};

const toEpisode = (e: any): Episode => {
  const slug = normSlug(pickString(e, ["episodeId", "slug", "id"]));
  const fromSlug = slug.match(/episode-(\d+)/i)?.[1];
  return {
    title: pickString(e, ["title", "name"]),
    slug,
    number: Number(pickString(e, ["eps", "episode", "number"])) || Number(fromSlug) || 0,
    date: pickString(e, ["date", "release_date"]) || undefined,
  };
};

export const normalizeDetail = (raw: any): AnimeDetail => {
  const d = raw?.data ?? raw?.detail ?? raw ?? {};
  const info = d.info ?? {};

  const episodes = toList(d.episodeList ?? d.episode_list)
    .map(toEpisode)
    .filter((e) => e.slug)
    .sort((a, b) => a.number - b.number);

  const detail: AnimeDetail = {
    title: pickString(d, ["title", "name"]),
    seriesSlug: "",
    poster: pickString(d, ["poster", "image", "thumbnail"]),
    synopsis: pickString(d, ["synopsis", "description"]),
    status: pickString(d, ["status"]) || pickString(info, ["status"]),
    type: pickString(d, ["type"]) || pickString(info, ["type", "tipe"]),
    studio: pickString(d, ["studios", "studio"]) || pickString(info, ["studio"]) || undefined,
    season: pickString(d, ["season"]) || pickString(info, ["season"]) || undefined,
    released: pickString(d, ["aired", "released"]) || pickString(info, ["released", "dirilis"]) || undefined,
    duration: pickString(d, ["duration"]) || pickString(info, ["duration", "durasi"]) || undefined,
    totalEpisode: pickString(d, ["episodes", "total_episode"]) || pickString(info, ["episodes"]) || undefined,
    score: pickString(d, ["score"]) || undefined,
    batchUrl:
      absUrl(
        typeof d.batch === "string"
          ? d.batch.trim()
          : pickString(d.batch ?? {}, ["otakudesuUrl", "link", "url", "href"])
      ) || undefined,
    genres: toList(d.genreList ?? d.genres).map(toGenre).filter(Boolean),
    episodes,
    recommendations: toList(d.recommendedAnimeList)
      .map(toItem)
      .filter((a) => a.slug && a.title),
  };

  if (!detail.title && episodes.length === 0) {
    console.error("Respons detail tidak dikenali:", raw);
    throw new Error("Format respons detail tidak dikenali.");
  }

  return detail;
};

// Bad slugs fail (non-2xx) or return the wrong shape, so validate: a real
// detail always has a title plus an episode list, batch, or synopsis.
const isRealDetail = (raw: any): boolean => {
  const d = raw?.data ?? raw?.detail ?? raw ?? {};
  if (!d?.title) return false;
  return (
    Array.isArray(d.episodeList) ||
    Array.isArray(d.episode_list) ||
    !!d.batch ||
    !!d.synopsis
  );
};

const isEpisodeSlug = (slug: string): boolean => /-episode-\d+/i.test(slug);

const fetchDetail = async (slug: string): Promise<AnimeDetail | null> => {
  const res = await api.get(`/anime/${encodeURIComponent(slug)}`);
  if (!isRealDetail(res.data)) return null;
  const detail = normalizeDetail(res.data);
  detail.seriesSlug = slug;
  return detail;
};

// The canonical upstream series slug can only be confirmed via the episode endpoint.
const resolveAnimeSlug = async (episodeSlug: string): Promise<string> => {
  try {
    const res = await api.get(`/episode/${encodeURIComponent(episodeSlug)}`);
    return normSlug(pickString(res.data?.data ?? res.data ?? {}, ["animeId", "anime_slug", "animeSlug"]));
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

// Each Otakudesu mirror ("server") needs one extra call to resolve its embed
// URL. Capped so a single episode view stays well under the API rate limit.
const MAX_STREAMS = 4;

const resolveStreams = async (d: any): Promise<StreamSource[]> => {
  const picks: { name: string; serverId: string; q: number }[] = [];
  const seen = new Set<string>();
  for (const q of toList(d?.server?.qualities)) {
    const qNum = parseInt(pickString(q, ["title"]), 10) || 0;
    for (const s of toList(q?.serverList)) {
      const id = pickString(s, ["serverId", "id"]);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      picks.push({
        name:
          [pickString(s, ["title", "name"]), pickString(q, ["title"])]
            .filter(Boolean)
            .join(" ")
            .trim() || "Server",
        serverId: id,
        q: qNum,
      });
    }
  }
  // Prefer higher resolutions before capping the number of resolved mirrors.
  picks.sort((a, b) => b.q - a.q);

  const resolved = await Promise.all(
    picks.slice(0, MAX_STREAMS).map(async (p) => {
      try {
        const r = await api.get(`/server/${encodeURIComponent(p.serverId)}`);
        return { name: p.name, url: pickString(r.data?.data ?? r.data ?? {}, ["url"]) };
      } catch {
        return { name: p.name, url: "" };
      }
    })
  );

  const streams = resolved.filter((s) => s.url);
  const fallback = pickString(d, ["defaultStreamingUrl"]);
  if (fallback && !streams.some((s) => s.url === fallback)) {
    streams.unshift({ name: "Server Utama", url: fallback });
  }
  // Embeddable hosts first so the default server actually plays in-app.
  return [...streams].sort((a, b) => Number(canEmbedStream(b.url)) - Number(canEmbedStream(a.url)));
};

const toDownloads = (d: any): DownloadLink[] =>
  toList(d?.downloadUrl?.qualities)
    .flatMap((q: any) =>
      toList(q?.urls).map((u: any) => ({
        host: pickString(u, ["title", "host", "name"]) || "Download",
        quality: pickString(q, ["title"]) || "Lainnya",
        url: absUrl(pickString(u, ["url", "link"])),
      }))
    )
    .filter((l) => l.url);

export const normalizeEpisode = (raw: any, episodeSlug = ""): EpisodeDetail => {
  const d = raw?.data ?? raw ?? {};
  const animeSlug =
    normSlug(pickString(d, ["animeId", "anime_slug", "animeSlug"])) ||
    seriesSlugOf(episodeSlug);
  return {
    title: pickString(d, ["title", "name"]),
    animeSlug,
    streams: [],
    downloads: toDownloads(d),
  };
};

export const getEpisode = async (slug: string): Promise<EpisodeDetail> => {
  const res = await api.get(`/episode/${encodeURIComponent(slug)}`);
  const episode = normalizeEpisode(res.data, slug);
  episode.streams = await resolveStreams(res.data?.data ?? res.data ?? {});
  return episode;
};

export const describeError = (_e: unknown): string => "Telah Terjadi Sebuah Kesalahan.";

// Genre names are shown as titles ("Sci-Fi"); the browse endpoint keys on slugs
// ("sci-fi"). Lowercasing/space-swapping matches Otakudesu's genre ids.
export const genreSlug = (title: string): string =>
  title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
