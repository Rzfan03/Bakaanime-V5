import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Heart,
  RefreshCw,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { ScreenOrientation } from "@capacitor/screen-orientation";
import { StatusBar } from "@capacitor/status-bar";
import { canEmbedStream, describeError, getDetail, getEpisode, getHome, genreSlug } from "../lib/api/anime";
import { markWatched, readFavorites } from "../lib/storage";
import type { FavoriteItem } from "../lib/storage";
import { writeProgress } from "../lib/progress";
import { BASE, backend } from "../lib/api/backend";
import { addFavorite, removeFavorite } from "../lib/favorites";
import type { AnimeDetail, AnimeItem, EpisodeDetail } from "../types/anime";
import Poster from "../components/Poster";

const EPISODE_LIMIT = 25;

const watchPath = (slug: string) => `/watch/${encodeURIComponent(slug)}`;
const detailPath = (slug: string) => `/detail/${encodeURIComponent(slug)}`;

function NavButton({
  to,
  primary = false,
  children,
}: {
  to?: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "flex h-11 flex-1 items-center justify-center gap-1 rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-m3-primary";

  if (!to) {
    return (
      <span
        aria-disabled="true"
        className={`${base} ${
          primary
            ? "bg-m3-on-surface/[0.12] text-m3-on-surface/40"
            : "border border-m3-on-surface/[0.12] text-m3-on-surface/40"
        }`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      to={to}
      replace
      className={`${base} ${
        primary
          ? "bg-m3-primary text-m3-on-primary hover:bg-m3-primary-hover"
          : "border border-m3-outline text-m3-primary hover:bg-m3-primary/[0.08]"
      }`}
    >
      {children}
    </Link>
  );
}

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 pb-2">
      <h2 className="text-lg font-medium leading-7">{title}</h2>
      {action}
    </div>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <span className="mb-1 block px-1 text-xs text-m3-on-surface-variant">{label}</span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-m3-outline-variant bg-transparent px-3 text-sm outline-none transition-colors hover:bg-m3-primary/[0.08] focus-visible:ring-2 focus-visible:ring-m3-primary disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span
            className={`truncate ${value ? "text-m3-on-surface" : "text-m3-on-surface-variant"}`}
          >
            {value || placeholder}
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-m3-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <ul
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-xl bg-[color:var(--m3-surface-high)] py-1 shadow-xl ring-1 ring-m3-outline-variant"
            >
              {options.map((opt) => {
                const active = value === opt;
                return (
                  <li key={opt}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(opt);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-m3-on-surface outline-none transition-colors ${
                        active ? "bg-m3-primary-container/40" : "hover:bg-m3-surface-hover"
                      }`}
                    >
                      <span className="truncate">{opt}</span>
                      {active && <Check size={16} className="shrink-0 text-m3-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function RecCard({ item }: { item: AnimeItem }) {
  return (
    <Link
      to={detailPath(item.slug)}
      className="group block w-28 shrink-0 snap-start outline-none"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[color:var(--m3-surface-high)] group-focus-visible:ring-2 group-focus-visible:ring-m3-primary">
        <Poster
          src={item.poster}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
        />
        {item.episode && (
          <span className="absolute bottom-2 left-2 rounded-full bg-[color:var(--m3-surface)]/80 px-2 py-0.5 text-xs font-medium text-m3-on-primary-container backdrop-blur-sm">
            {item.episode}
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-xs font-medium leading-4 text-m3-on-surface">
        {item.title}
      </h3>
    </Link>
  );
}

function InfoSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mt-6 space-y-2 px-4">
        <div className="h-5 w-24 animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
      </div>
      <div className="mt-6 px-4">
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-full bg-[color:var(--m3-surface-high)] motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Watch() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();

  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [recs, setRecs] = useState<AnimeItem[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [streamIndex, setStreamIndex] = useState(0);
  const [dlQuality, setDlQuality] = useState("");
  const [dlHost, setDlHost] = useState("");
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [plotOpen, setPlotOpen] = useState(false);
  const [toast, setToast] = useState("");
  const downloadRef = useRef<HTMLElement | null>(null);

  /* Fullscreen: hide the status bar and switch to landscape; on exit, restore portrait */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const onFsChange = async () => {
      const isFs = !!document.fullscreenElement;
      try {
        if (isFs) {
          await ScreenOrientation.lock({ orientation: "landscape" });
          await StatusBar.hide();
        } else {
          await ScreenOrientation.lock({ orientation: "portrait" });
          await StatusBar.show();
        }
      } catch {
        /* plugin not ready / web */
      }
    };

    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as EventListener);
      // Ensure normal state when leaving the Watch page
      void ScreenOrientation.lock({ orientation: "portrait" }).catch(() => {});
      void StatusBar.show().catch(() => {});
    };
  }, []);

  useEffect(() => {
    void backend
      .getFavorites()
      .then((res) => setFavorites(res.items))
      .catch(() => setFavorites(readFavorites()));
  }, []);

  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    if (detail.recommendations.length > 0) {
      setRecs(detail.recommendations);
      return;
    }
    getHome(1)
      .then((res) => {
        if (!cancelled) setRecs(res.items);
      })
      .catch(() => {
        if (!cancelled) setRecs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStreamIndex(0);
    setDlQuality("");
    setDlHost("");
    window.scrollTo({ top: 0 });
    getEpisode(slug)
      .then((res) => {
        if (!cancelled) setEpisode(res);
      })
      .catch((e) => {
        if (!cancelled) setError(describeError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  const animeSlug = episode?.animeSlug;

  useEffect(() => {
    if (!animeSlug) return;
    let cancelled = false;
    setDetail(null);
    setDetailLoading(true);
    setPlotOpen(false);
    setShowAll(false);
    getDetail(animeSlug)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [animeSlug]);

  useEffect(() => {
    if (!animeSlug) return;
    setWatched(markWatched(animeSlug, slug));
  }, [animeSlug, slug]);

  useEffect(() => {
    if (!detail || !animeSlug) return;
    const eps = detail.episodes ?? [];
    const i = eps.findIndex((e) => e.slug === slug);
    const watchedSet = new Set(watched);
    writeProgress({
      animeSlug,
      title: detail.title,
      poster: detail.poster,
      episodeSlug: slug,
      episodeNumber: eps[i]?.number ?? (i >= 0 ? i + 1 : 0),
      watchedCount: eps.filter((e) => watchedSet.has(e.slug)).length,
      total: eps.length,
      updatedAt: Date.now(),
    });
  }, [detail, animeSlug, slug, watched]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const episodes = detail?.episodes ?? [];
  const index = episodes.findIndex((e) => e.slug === slug);
  const prev = index > 0 ? episodes[index - 1] : undefined;
  const next =
    index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : undefined;
  const forceAll = index >= EPISODE_LIMIT;
  const expandedAll = showAll || forceAll;
  const visibleEpisodes = expandedAll
    ? episodes
    : episodes.slice(0, EPISODE_LIMIT);
  const stream = episode?.streams[streamIndex];
  const dlQualities = [...new Set((episode?.downloads ?? []).map((d) => d.quality))];
  const dlHosts = [
    ...new Set(
      (episode?.downloads ?? []).filter((d) => d.quality === dlQuality).map((d) => d.host)
    ),
  ];
  const dlSelected = episode?.downloads.find(
    (d) => d.quality === dlQuality && d.host === dlHost
  );

  // Non-embeddable hosts (desustream) expose a direct video URL in their embed
  // page; extract it server-side and play it natively instead of an iframe.
  useEffect(() => {
    if (!stream || canEmbedStream(stream.url)) {
      setDirectUrl(null);
      return;
    }
    let cancelled = false;
    setDirectUrl(null);
    setDirectLoading(true);
    fetch(`${BASE}/stream?url=${encodeURIComponent(stream.url)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setDirectUrl(typeof j?.url === "string" ? j.url : null);
      })
      .catch(() => {
        if (!cancelled) setDirectUrl(null);
      })
      .finally(() => {
        if (!cancelled) setDirectLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stream]);

  const title = episode?.title.replace(/\s*Subtitle Indonesia$/i, "") ?? "";
  const metaLine = detail
    ? [detail.type, detail.status, detail.duration?.replace(/\s*per ep\.?/i, "")]
        .filter(Boolean)
        .join(" • ")
    : "";
  const isFav = !!animeSlug && favorites.some((f) => f.slug === animeSlug);
  const otherRecs = recs.filter((r) => r.seriesSlug !== animeSlug);

  const toggleFav = async () => {
    if (!detail || !animeSlug) return;
    const wasFav = isFav;
    const item = {
      slug: animeSlug,
      title: detail.title,
      poster: detail.poster,
    };
    setFavorites((prev) =>
      wasFav ? prev.filter((f) => f.slug !== animeSlug) : [item, ...prev]
    );
    try {
      if (wasFav) await removeFavorite(animeSlug);
      else await addFavorite(item);
      setToast(
        wasFav
          ? "Dihapus dari favorit"
          : "Ditambahkan ke favorit dan library"
      );
    } catch {
      setFavorites((prev) =>
        wasFav ? [item, ...prev] : prev.filter((f) => f.slug !== animeSlug)
      );
      setToast("Telah Terjadi Sebuah Kesalahan.");
    }
  };

  const scrollToDownloads = () =>
    downloadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const circleButton =
    "flex h-10 w-10 items-center justify-center rounded-full border border-m3-outline-variant text-m3-on-surface outline-none transition-colors hover:bg-m3-primary/[0.08] focus-visible:ring-2 focus-visible:ring-m3-primary disabled:opacity-40";

  return (
    <div className="min-h-screen bg-[color:var(--m3-surface)] pb-24 text-m3-on-surface">
      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-m3-primary/[0.08] focus-visible:ring-2 focus-visible:ring-m3-primary"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="line-clamp-1 flex-1 pr-2 text-base font-medium">
            {detail?.title ?? title}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl">
        <div className="px-4">
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
            {loading && (
              <div className="h-full w-full animate-pulse bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
            )}
            {!loading && stream && canEmbedStream(stream.url) && (
              <iframe
                key={stream.url}
                src={stream.url}
                title={title}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                className="h-full w-full border-0"
              />
            )}
            {!loading && stream && !canEmbedStream(stream.url) && directUrl && (
              <video
                key={directUrl}
                src={directUrl}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full bg-black"
              />
            )}
            {!loading && stream && !canEmbedStream(stream.url) && !directUrl && directLoading && (
              <div className="flex h-full items-center justify-center">
                <div className="h-full w-full animate-pulse bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
              </div>
            )}
            {!loading && stream && !canEmbedStream(stream.url) && !directUrl && !directLoading && (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-sm text-white/70">
                  Server ini tidak bisa diputar di dalam aplikasi.
                </p>
                <button
                  onClick={() => void Browser.open({ url: stream.url })}
                  className="flex h-10 items-center gap-2 rounded-full bg-m3-primary px-4 text-sm font-medium text-m3-on-primary outline-none transition-colors hover:bg-m3-primary-hover focus-visible:ring-2 focus-visible:ring-m3-primary"
                >
                  <ExternalLink size={16} />
                  Buka di browser
                </button>
              </div>
            )}
            {!loading && !error && !stream && (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-m3-on-surface-variant">
                Belum ada sumber video untuk episode ini.
              </div>
            )}
          </div>
        </div>

        {!loading && error && (
          <div className="mx-4 mt-4 flex flex-col items-start gap-3 rounded-2xl bg-[color:var(--m3-surface-high)] p-4">
            <p className="text-sm text-m3-on-surface-variant">{error}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="flex h-10 items-center gap-2 rounded-full bg-m3-primary-container px-4 text-sm font-medium text-m3-on-primary-container outline-none transition-colors hover:bg-m3-primary-container-hover focus-visible:ring-2 focus-visible:ring-m3-primary"
            >
              <RefreshCw size={18} />
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && episode && (
          <>
            {episode.streams.length > 1 && (
              <section
                aria-label="Sumber video"
                className="mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {episode.streams.map((s, i) => (
                  <button
                    key={s.url}
                    onClick={() => setStreamIndex(i)}
                    aria-pressed={i === streamIndex}
                    className={`flex h-8 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-m3-primary ${
                      i === streamIndex
                        ? "bg-m3-primary text-m3-on-primary"
                        : "border border-m3-outline-variant text-m3-on-surface-variant hover:bg-m3-primary/[0.08]"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </section>
            )}

            <section className="flex items-start gap-3 px-4 pt-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] font-medium leading-7">{title}</h2>
                {metaLine && (
                  <p className="mt-1 text-sm text-m3-on-surface-variant">{metaLine}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => void toggleFav()}
                  disabled={!detail}
                  aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
                  aria-pressed={isFav}
                  className={circleButton}
                >
                  <Heart
                    size={20}
                    className={isFav ? "fill-m3-primary text-m3-primary" : ""}
                  />
                </button>
                {episode.downloads.length > 0 && (
                  <button
                    onClick={scrollToDownloads}
                    aria-label="Ke bagian download"
                    className={circleButton}
                  >
                    <Download size={20} />
                  </button>
                )}
              </div>
            </section>

            {detailLoading && !detail ? (
              <InfoSkeleton />
            ) : (
              <>
                {detail?.synopsis && (
                  <section className="mt-4 px-4">
                    <h2 className="text-base font-semibold leading-6 text-m3-on-surface">
                      Sinopsis
                    </h2>
                    <p
                      className={`mt-1.5 whitespace-pre-line text-sm leading-6 text-m3-on-surface-variant ${
                        plotOpen ? "" : "line-clamp-4"
                      }`}
                    >
                      {detail.synopsis}
                    </p>
                    <button
                      onClick={() => setPlotOpen((v) => !v)}
                      aria-expanded={plotOpen}
                      className="mt-0.5 flex h-9 items-center gap-1 rounded-full pr-3 text-sm font-medium text-m3-primary outline-none focus-visible:ring-2 focus-visible:ring-m3-primary"
                    >
                      {plotOpen ? "Ringkas" : "Selengkapnya"}
                      <ChevronDown
                        size={16}
                        className={`transition-transform motion-reduce:transition-none ${
                          plotOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </section>
                )}

                {episodes.length > 0 && (
                  <section className="mt-4">
                    <SectionTitle
                      title={`Episode (${episodes.length})`}
                      action={
                        animeSlug ? (
                          <Link
                            to={detailPath(animeSlug)}
                            className="flex h-10 items-center gap-0.5 rounded-full pl-3 pr-1 text-sm font-medium text-m3-primary outline-none focus-visible:ring-2 focus-visible:ring-m3-primary"
                          >
                            Detail anime
                            <ChevronRight size={18} />
                          </Link>
                        ) : undefined
                      }
                    />
                    <ul className="grid grid-cols-5 gap-2 px-4 sm:grid-cols-8">
                      {visibleEpisodes.map((e, i) => {
                        const current = e.slug === slug;
                        const seen = watched.includes(e.slug);
                        return (
                          <li key={e.slug}>
                            <Link
                              to={watchPath(e.slug)}
                              replace
                              aria-current={current ? "page" : undefined}
                              className={`flex h-10 items-center justify-center gap-1 rounded-full text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-m3-primary ${
                                current
                                  ? "bg-m3-primary text-m3-on-primary"
                                  : seen
                                    ? "bg-[color:var(--m3-surface-high)] text-m3-outline hover:bg-m3-surface-hover"
                                    : "border border-m3-outline-variant text-m3-on-primary-container hover:bg-m3-primary/[0.08]"
                              }`}
                            >
                              {seen && !current && <Check size={14} />}
                              {e.number || i + 1}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    {!forceAll && episodes.length > EPISODE_LIMIT && (
                      <button
                        onClick={() => setShowAll((v) => !v)}
                        aria-expanded={showAll}
                        className="mx-4 mt-2 flex h-10 items-center gap-1 rounded-full pr-3 text-sm font-medium text-m3-primary outline-none focus-visible:ring-2 focus-visible:ring-m3-primary"
                      >
                        {showAll
                          ? "Ringkas"
                          : `Lihat semua ${episodes.length} episode`}
                        <ChevronDown
                          size={18}
                          className={`transition-transform motion-reduce:transition-none ${
                            showAll ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </section>
                )}
              </>
            )}

            <nav aria-label="Episode" className="mt-6 flex gap-3 px-4">
              <NavButton to={prev ? watchPath(prev.slug) : undefined}>
                <ChevronLeft size={18} />
                Sebelumnya
              </NavButton>
              <NavButton to={next ? watchPath(next.slug) : undefined} primary>
                Berikutnya
                <ChevronRight size={18} />
              </NavButton>
            </nav>

            {detail && detail.genres.length > 0 && (
              <section
                aria-label="Genre"
                className="mt-6 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {detail.genres.map((g) => (
                  <Link
                    key={g}
                    to={`/genre/${encodeURIComponent(genreSlug(g))}`}
                    className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-m3-primary-container px-3 text-sm font-medium text-m3-on-primary-container outline-none transition-colors hover:bg-m3-primary-container-hover focus-visible:ring-2 focus-visible:ring-m3-primary"
                  >
                    {g}
                  </Link>
                ))}
              </section>
            )}

            {episode.downloads.length > 0 && (
              <section ref={downloadRef} className="mt-6 scroll-mt-20">
                <SectionTitle title="Download" />
                <div className="flex flex-col gap-3 px-4">
                  <SelectField
                    label="Kualitas"
                    value={dlQuality}
                    placeholder="Pilih kualitas"
                    options={dlQualities}
                    onChange={(v) => {
                      setDlQuality(v);
                      setDlHost("");
                    }}
                  />
                  <SelectField
                    label="Server"
                    value={dlHost}
                    placeholder="Pilih server"
                    options={dlHosts}
                    disabled={!dlQuality}
                    onChange={setDlHost}
                  />
                  <button
                    type="button"
                    disabled={!dlSelected}
                    onClick={() => dlSelected && void Browser.open({ url: dlSelected.url })}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-m3-primary text-sm font-medium text-m3-on-primary outline-none transition-colors hover:bg-m3-primary-hover focus-visible:ring-2 focus-visible:ring-m3-primary disabled:cursor-not-allowed disabled:bg-m3-on-surface/[0.12] disabled:text-m3-on-surface/40"
                  >
                    <Download size={18} />
                    Download
                  </button>
                </div>
              </section>
            )}

            {otherRecs.length > 0 && (
              <section className="mt-6">
                <SectionTitle
                  title="Rilisan lainnya"
                  action={
                    <Link
                      to="/"
                      className="flex h-10 items-center gap-0.5 rounded-full pl-3 pr-1 text-sm font-medium text-m3-primary outline-none focus-visible:ring-2 focus-visible:ring-m3-primary"
                    >
                      Lihat semua
                      <ChevronRight size={18} />
                    </Link>
                  }
                />
                <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {otherRecs.slice(0, 12).map((r) => (
                    <RecCard key={r.seriesSlug} item={r} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-xl bg-m3-inverse-surface px-4 py-3 text-center text-sm font-medium text-m3-inverse-on-surface shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}