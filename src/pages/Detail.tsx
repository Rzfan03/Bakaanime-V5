import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Film,
  Heart,
  Play,
  RefreshCw,
  Share2,
} from "lucide-react";
import { describeError, getDetail } from "../lib/api/anime";
import Comments from "../components/Comments";
import { readLibrary, readWatched, writeLibrary } from "../lib/storage";
import type { LibraryItem } from "../lib/storage";
import type { AnimeDetail, Episode } from "../types/anime";

const EPISODE_PREVIEW = 8;

const watchPath = (slug: string) => `/watch/${encodeURIComponent(slug)}`;

function ActionItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const color = active ? "text-[#D0BCFF]" : "text-[#CAC4D0]";
  const content = (
    <>
      {icon}
      <span className="line-clamp-1 text-xs font-medium">{label}</span>
    </>
  );

  if (!onClick) {
    return (
      <div className={`flex h-16 flex-col items-center justify-center gap-1 ${color}`}>
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF] ${color}`}
    >
      {content}
    </button>
  );
}

function EpisodeItem({ episode, watched }: { episode: Episode; watched: boolean }) {
  return (
    <li>
      <Link
        to={watchPath(episode.slug)}
        className="flex items-center gap-3 rounded-2xl px-3 py-2 outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2B2930] text-sm font-medium text-[#EADDFF]">
          {episode.number || "•"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-5 text-[#E6E0E9]">
            {episode.number ? `Episode ${episode.number}` : episode.title}
          </span>
          {episode.date && (
            <span className="block text-xs text-[#CAC4D0]">{episode.date}</span>
          )}
        </span>
        {watched ? (
          <Check size={20} className="shrink-0 text-[#CAC4D0]" />
        ) : (
          <Play size={20} className="shrink-0 text-[#D0BCFF]" />
        )}
      </Link>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="px-4 pt-6">
      <div className="flex gap-4">
        <div className="aspect-[2/3] w-28 shrink-0 animate-pulse rounded-xl bg-[#2B2930] motion-reduce:animate-none" />
        <div className="flex-1 space-y-3 pt-2">
          <div className="h-6 w-4/5 animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-[#2B2930] motion-reduce:animate-none" />
        ))}
      </div>
      <div className="mt-4 h-12 animate-pulse rounded-full bg-[#2B2930] motion-reduce:animate-none" />
      <div className="mt-6 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
        <div className="h-4 w-full animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export default function Detail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setLibrary(readLibrary());
  }, []);

  useEffect(() => {
    setWatched(readWatched(slug));
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpanded(false);
    setEpisodesExpanded(false);
    window.scrollTo({ top: 0 });

    getDetail(slug)
      .then((res) => {
        if (!cancelled) setDetail(res);
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const inLibrary = library.some((l) => l.slug === slug);

  const toggleLibrary = () => {
    if (!detail) return;
    const next = inLibrary
      ? library.filter((l) => l.slug !== slug)
      : [{ slug, title: detail.title, poster: detail.poster }, ...library];
    setLibrary(next);
    writeLibrary(next);
    setToast(inLibrary ? "Dihapus dari library" : "Ditambahkan ke library");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: detail?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Link disalin");
      }
    } catch {
      return;
    }
  };

  const statusLine = detail
    ? [detail.status, detail.type].filter(Boolean).join(" • ")
    : "";

  const episodes = detail?.episodes ?? [];
  const visibleEpisodes = episodesExpanded
    ? episodes
    : episodes.slice(0, EPISODE_PREVIEW);
  const firstEpisode = episodes[0];

  return (
    <div className="min-h-screen bg-[#141218] pb-24 text-[#E6E0E9]">
      <header
        className={`fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-colors motion-reduce:transition-none ${
          scrolled ? "bg-[#141218]/90 backdrop-blur" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-1 pl-2 pr-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
          >
            <ArrowLeft size={24} />
          </button>
          <h1
            className={`line-clamp-1 flex-1 text-lg font-medium transition-opacity motion-reduce:transition-none ${
              scrolled && detail ? "opacity-100" : "opacity-0"
            }`}
          >
            {detail?.title}
          </h1>
          <button
            onClick={share}
            aria-label="Bagikan"
            disabled={!detail}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF] disabled:opacity-40"
          >
            <Share2 size={22} />
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl">
        {detail?.poster && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] overflow-hidden" aria-hidden="true">
            <img
              src={detail.poster}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full scale-125 object-cover opacity-40 blur-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#141218]/30 via-[#141218]/60 to-[#141218]" />
          </div>
        )}

        <div className="relative pt-[calc(env(safe-area-inset-top)+4.5rem)]">
          {loading && <DetailSkeleton />}

          {!loading && error && (
            <div className="mx-4 mt-4 flex flex-col items-start gap-3 rounded-2xl bg-[#2B2930] p-4">
              <p className="text-sm text-[#CAC4D0]">{error}</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="flex h-10 items-center gap-2 rounded-full bg-[#4F378B] px-4 text-sm font-medium text-[#EADDFF] outline-none transition-colors hover:bg-[#5A42A0] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
              >
                <RefreshCw size={18} />
                Coba lagi
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <>
              <section className="flex gap-4 px-4">
                <div className="aspect-[2/3] w-28 shrink-0 overflow-hidden rounded-xl bg-[#2B2930] shadow-lg">
                  <img
                    src={detail.poster}
                    alt={detail.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <h2 className="line-clamp-4 text-[22px] font-medium leading-7">
                    {detail.title}
                  </h2>

                  <div className="mt-2 space-y-1 text-sm text-[#CAC4D0]">
                    {detail.studio && (
                      <p className="flex items-start gap-1.5">
                        <Building2 size={16} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{detail.studio}</span>
                      </p>
                    )}
                    {statusLine && (
                      <p className="flex items-start gap-1.5">
                        <Check size={16} className="mt-0.5 shrink-0" />
                        <span>{statusLine}</span>
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-5 grid grid-cols-4 gap-1 px-2">
                <ActionItem
                  icon={<Heart size={24} className={inLibrary ? "fill-[#D0BCFF]" : ""} />}
                  label={inLibrary ? "Di library" : "Tambah"}
                  active={inLibrary}
                  onClick={toggleLibrary}
                />
                <ActionItem
                  icon={<Film size={24} />}
                  label={
                    detail.totalEpisode
                      ? `${detail.totalEpisode} eps`
                      : episodes.length
                        ? `${episodes.length} eps`
                        : "N/A"
                  }
                />
                <ActionItem
                  icon={<Clock size={24} />}
                  label={detail.duration?.replace(/\s*per ep\.?/i, "") ?? "N/A"}
                />
                <ActionItem
                  icon={<Calendar size={24} />}
                  label={detail.season ?? detail.released ?? "N/A"}
                />
              </section>

              {firstEpisode ? (
                <Link
                  to={watchPath(firstEpisode.slug)}
                  className="mx-4 mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-[#D0BCFF] text-base font-medium text-[#381E72] outline-none transition-colors hover:bg-[#DCCBFF] focus-visible:ring-2 focus-visible:ring-[#EADDFF]"
                >
                  <Play size={20} className="fill-current" />
                  Mulai Nonton
                </Link>
              ) : (
                <span
                  aria-disabled="true"
                  className="mx-4 mt-4 flex h-12 items-center justify-center rounded-full bg-[#E6E0E9]/[0.12] text-base font-medium text-[#E6E0E9]/40"
                >
                  Belum ada episode
                </span>
              )}

              {detail.synopsis && (
                <section className="mt-4 px-4">
                  <p
                    className={`whitespace-pre-line text-sm leading-6 text-[#E6E0E9] ${
                      expanded ? "" : "line-clamp-3"
                    }`}
                  >
                    {detail.synopsis}
                  </p>
                  <button
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="mt-1 flex h-10 items-center gap-1 rounded-full pr-3 text-sm font-medium text-[#D0BCFF] outline-none focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
                  >
                    {expanded ? "Ringkas" : "Selengkapnya"}
                    <ChevronDown
                      size={18}
                      className={`transition-transform motion-reduce:transition-none ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </section>
              )}

              {detail.genres.length > 0 && (
                <section
                  aria-label="Genre"
                  className="mt-2 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {detail.genres.map((g) => (
                    <span
                      key={g}
                      className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-[#4F378B] px-3 text-sm font-medium text-[#EADDFF]"
                    >
                      {g}
                    </span>
                  ))}
                </section>
              )}

              <section className="mt-8 border-t border-[#49454F]/60 pt-5">
                <div className="flex items-baseline justify-between px-4 pb-2">
                  <h2 className="text-[22px] font-medium leading-7">Episode</h2>
                  <span className="text-sm text-[#CAC4D0]">{episodes.length} episode</span>
                </div>

                {episodes.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-[#CAC4D0]">
                    Belum ada episode untuk anime ini.
                  </p>
                ) : (
                  <>
                    <ul className="px-1">
                      {visibleEpisodes.map((ep) => (
                        <EpisodeItem
                          key={ep.slug}
                          episode={ep}
                          watched={watched.includes(ep.slug)}
                        />
                      ))}
                    </ul>

                    {episodes.length > EPISODE_PREVIEW && (
                      <button
                        onClick={() => setEpisodesExpanded((v) => !v)}
                        aria-expanded={episodesExpanded}
                        className="mx-4 mt-2 flex h-10 items-center gap-1 rounded-full pr-3 text-sm font-medium text-[#D0BCFF] outline-none focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
                      >
                        {episodesExpanded
                          ? "Ringkas"
                          : `Lihat semua ${episodes.length} episode`}
                        <ChevronDown
                          size={18}
                          className={`transition-transform motion-reduce:transition-none ${
                            episodesExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </>
                )}
              </section>

              <Comments animeSlug={slug} />
            </>
          )}
        </div>
      </main>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-xl bg-[#E6E0E9] px-4 py-3 text-center text-sm font-medium text-[#322F35] shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}