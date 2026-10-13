import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { A11y, Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  User,
} from "lucide-react";
import { getHome } from "../lib/api/anime";
import { readLibrary } from "../lib/storage";
import type { LibraryItem } from "../lib/storage";
import type { AnimeItem, AnimeListResult } from "../types/anime";
import OverflowMenu from "../components/OverflowMenu";
import { useAuth } from "../lib/auth";
import Poster from "../components/Poster";

const BANNER_COUNT = 5;

const pathFor = (a: AnimeItem) => `/detail/${encodeURIComponent(a.seriesSlug)}`;

function BannerCarousel({
  items,
  loading,
}: {
  items: AnimeItem[];
  loading: boolean;
}) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (loading && items.length === 0) {
    return (
      <div className="px-4" aria-hidden="true">
        <div className="aspect-[4/5] animate-pulse rounded-3xl bg-[color:var(--m3-surface-high)] motion-reduce:animate-none sm:aspect-[16/9] lg:aspect-[21/9]" />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <section aria-label="Sorotan" className="px-4">
      <Swiper
        modules={[A11y, Autoplay, Pagination]}
        slidesPerView={1}
        loop={items.length > 1}
        autoplay={
          reduceMotion
            ? false
            : { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }
        }
        pagination={{ clickable: true }}
        style={
          {
            "--swiper-pagination-color": "#D0BCFF",
            "--swiper-pagination-bullet-inactive-color": "#E6E0E9",
            "--swiper-pagination-bullet-inactive-opacity": "0.5",
            "--swiper-pagination-bullet-size": "8px",
            "--swiper-pagination-bottom": "14px",
          } as React.CSSProperties
        }
        className="overflow-hidden rounded-3xl bg-[color:var(--m3-surface-high)]"
      >
        {items.map((anime) => (
          <SwiperSlide key={anime.seriesSlug}>
            <Link
              to={pathFor(anime)}
              className="group relative block aspect-[4/5] overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D0BCFF] sm:aspect-[16/9] lg:aspect-[21/9]"
            >
              <Poster
                src={anime.poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--m3-surface)] via-[color:var(--m3-surface)]/40 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5 pb-11">
                <div className="flex flex-wrap gap-2">
                  {anime.type && (
                    <span className="rounded-full bg-[color:var(--m3-surface)]/60 px-3 py-1 text-xs font-medium text-[#EADDFF] backdrop-blur-sm">
                      {anime.type}
                    </span>
                  )}
                  {anime.episode && (
                    <span className="rounded-full bg-[#4F378B] px-3 py-1 text-xs font-medium text-[#EADDFF]">
                      {anime.episode}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 line-clamp-2 text-2xl font-medium leading-8 text-[#E6E0E9]">
                  {anime.title}
                </h3>
                <span className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full bg-[#D0BCFF] px-5 text-sm font-medium text-[#381E72] transition-colors group-hover:bg-[#DCCBFF]">
                  <Info size={18} />
                  Lihat detail
                </span>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}

function PosterCard({
  to,
  title,
  poster,
  badge,
  meta,
  className = "",
}: {
  to: string;
  title: string;
  poster: string;
  badge?: string;
  meta?: string;
  className?: string;
}) {
  return (
    <Link to={to} className={`group block outline-none ${className}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[color:var(--m3-surface-high)] group-focus-visible:ring-2 group-focus-visible:ring-[#D0BCFF]">
        <Poster
          src={poster}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
        />
        <span className="absolute inset-0 transition-colors group-hover:bg-[#D0BCFF]/[0.08] group-active:bg-[#D0BCFF]/[0.12]" />
        {badge && (
          <span className="absolute bottom-2 left-2 rounded-lg bg-[color:var(--m3-surface)]/80 px-2 py-0.5 text-xs font-medium text-[#EADDFF] backdrop-blur-sm">
            {badge}
          </span>
        )}
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-[#E6E0E9]">
        {title}
      </h3>
      {meta && <p className="mt-0.5 line-clamp-1 text-xs text-[#CAC4D0]">{meta}</p>}
    </Link>
  );
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="aspect-[2/3] animate-pulse rounded-xl bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
      <div className="mt-2 h-4 w-11/12 animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
      <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2">
      <h2 className="text-[22px] font-medium leading-7 text-[#E6E0E9]">{title}</h2>
    </div>
  );
}

function FilterChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#D0BCFF] ${
        selected
          ? "bg-[#4F378B] text-[#EADDFF]"
          : "border border-[#49454F] text-[#CAC4D0] hover:bg-[#D0BCFF]/[0.08]"
      }`}
    >
      {selected && <Check size={16} />}
      {label}
    </button>
  );
}

function IconLink({
  to,
  label,
  children,
}: {
  to: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex h-12 w-12 items-center justify-center rounded-full text-[#E6E0E9] outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
    >
      {children}
    </Link>
  );
}

const rowClass =
  "flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const gridClass =
  "grid grid-cols-2 gap-x-3 gap-y-5 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

export default function Home() {
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const [data, setData] = useState<AnimeListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [typeFilter, setTypeFilter] = useState("Semua");
  const [library, setLibrary] = useState<LibraryItem[]>([]);

  useEffect(() => {
    setLibrary(readLibrary());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getHome(page)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat data. Periksa koneksi, lalu coba lagi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const types = useMemo(() => {
    const set = new Set<string>();
    data?.items.forEach((a) => a.type && set.add(a.type));
    return ["Semua", ...Array.from(set)];
  }, [data]);

  const activeType = types.includes(typeFilter) ? typeFilter : "Semua";
  const items = (data?.items ?? []).filter(
    (a) => activeType === "Semua" || a.type === activeType
  );

  const bannerItems = useMemo(
    () => (data?.items ?? []).filter((a) => a.poster).slice(0, BANNER_COUNT),
    [data]
  );

  const goTo = (p: number) => {
    setSearchParams(p === 1 ? {} : { page: String(p) });
    window.scrollTo({ top: 0 });
  };

  const pagination = data?.pagination;
  const showBanner = page === 1 && !error;
  const showLibrary = page === 1 && !error && library.length > 0;

  return (
    <div className="min-h-screen bg-[color:var(--m3-surface)] pb-32 text-[#E6E0E9]">
      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between pl-4 pr-2">
          <h1 className="text-[22px] font-medium leading-7 tracking-tight">BakaAnime</h1>
          <div className="flex items-center">
            <IconLink to="/search" label="Cari anime">
              <Search size={24} />
            </IconLink>
            <OverflowMenu
              items={[
                { label: "Profil", icon: <User size={19} />, to: "/profile" },
                { label: "Pengaturan", icon: <Settings size={19} />, to: "/settings" },
                { label: "Keluar", icon: <LogOut size={19} />, onClick: logout, danger: true },
              ]}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl">
        {error && (
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-[color:var(--m3-surface-high)] p-4">
            <p className="flex-1 text-sm text-[#CAC4D0]">{error}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="flex h-10 items-center gap-2 rounded-full bg-[#4F378B] px-4 text-sm font-medium text-[#EADDFF] outline-none transition-colors hover:bg-[#5A42A0] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
            >
              <RefreshCw size={18} />
              Coba lagi
            </button>
          </div>
        )}

        {showBanner && (
          <div className="mt-2">
            <BannerCarousel items={bannerItems} loading={loading} />
          </div>
        )}

        {!error && (
          <section
            aria-label="Filter jenis"
            className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {loading && !data
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-16 shrink-0 animate-pulse rounded-lg bg-[color:var(--m3-surface-high)] motion-reduce:animate-none"
                  />
                ))
              : types.length > 1 &&
                types.map((t) => (
                  <FilterChip
                    key={t}
                    label={t}
                    selected={t === activeType}
                    onClick={() => setTypeFilter(t)}
                  />
                ))}
          </section>
        )}

        {showLibrary && (
          <section className="mt-6">
            <SectionHeader title="Library kamu" />
            <div className={rowClass}>
              {library.map((item) => (
                <PosterCard
                  key={item.slug}
                  to={`/detail/${encodeURIComponent(item.slug)}`}
                  title={item.title}
                  poster={item.poster}
                  className="w-28 shrink-0 snap-start"
                />
              ))}
            </div>
          </section>
        )}

        {!error && (
          <section className="mt-6">
            <SectionHeader title="Rilisan terbaru" />
            <div className={gridClass}>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
                : items.map((anime) => (
                    <PosterCard
                      key={anime.seriesSlug}
                      to={pathFor(anime)}
                      title={anime.title}
                      poster={anime.poster}
                      badge={anime.episode}
                      meta={anime.type}
                    />
                  ))}
            </div>

            {!loading && items.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-[#CAC4D0]">
                {activeType === "Semua"
                  ? "Tidak ada anime di halaman ini."
                  : `Tidak ada anime berjenis ${activeType} di halaman ini.`}
              </p>
            )}
          </section>
        )}

        {!error && pagination && (
          <nav
            aria-label="Halaman"
            className="mt-8 flex items-center justify-center gap-3 px-4"
          >
            <button
              disabled={loading || !pagination.hasPrev}
              onClick={() => goTo(pagination.currentPage - 1)}
              className="flex h-10 items-center gap-1 rounded-full border border-[#938F99] pl-3 pr-4 text-sm font-medium text-[#D0BCFF] outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF] disabled:cursor-not-allowed disabled:border-[#E6E0E9]/[0.12] disabled:text-[#E6E0E9]/40 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={18} />
              Sebelumnya
            </button>

            <span className="min-w-20 text-center text-sm text-[#CAC4D0]">
              Halaman {pagination.currentPage}
            </span>

            <button
              disabled={loading || !pagination.hasNext}
              onClick={() => goTo(pagination.currentPage + 1)}
              className="flex h-10 items-center gap-1 rounded-full bg-[#D0BCFF] pl-4 pr-3 text-sm font-medium text-[#381E72] outline-none transition-colors hover:bg-[#DCCBFF] focus-visible:ring-2 focus-visible:ring-[#EADDFF] disabled:cursor-not-allowed disabled:bg-[#E6E0E9]/[0.12] disabled:text-[#E6E0E9]/40 disabled:hover:bg-[#E6E0E9]/[0.12]"
            >
              Berikutnya
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}