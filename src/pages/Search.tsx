import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Search as SearchIcon, Telescope, X } from "lucide-react";
import { searchAnime } from "../lib/api/anime";
import type { AnimeItem } from "../types/anime";
import Poster from "../components/Poster";


const detailPath = (a: AnimeItem) => `/detail/${encodeURIComponent(a.seriesSlug)}`;

/* ── Result card ─────────────────────────────────────────────── */
function ResultCard({ item }: { item: AnimeItem }) {
  return (
    <Link
      to={detailPath(item)}
      className="group flex items-center gap-4 p-3 outline-none transition-colors active:bg-[#D0BCFF]/[0.10] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D0BCFF]"
    >
      {/* poster */}
      <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl bg-[color:var(--m3-surface-high)] shadow-md">
        <Poster
          src={item.poster}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
        />
      </div>

      {/* info */}
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#E6E0E9]">
          {item.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.type && (
            <span className="rounded-full bg-[color:var(--m3-surface-high)] px-2.5 py-0.5 text-[11px] font-medium text-[#CAC4D0]">
              {item.type}
            </span>
          )}
          {item.episode && (
            <span className="rounded-full bg-[#4F378B]/70 px-2.5 py-0.5 text-[11px] font-medium text-[#EADDFF]">
              {item.episode}
            </span>
          )}
        </div>
      </div>

      {/* chevron */}
      <div className="shrink-0 text-[#49454F] transition-colors group-hover:text-[#D0BCFF]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 p-3" aria-hidden="true">
      <div className="aspect-[2/3] w-16 shrink-0 animate-pulse rounded-xl bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
      <div className="flex-1 space-y-2.5 py-0.5">
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
        <div className="h-3.5 w-3/5 animate-pulse rounded-full bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
        <div className="h-5 w-1/3 animate-pulse rounded-full bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
      </div>
    </div>
  );
}

/* ── Divider ──────────────────────────────────────────────────── */
function Divider() {
  return <div className="mx-3 h-px bg-[color:var(--m3-surface-high)]" aria-hidden="true" />;
}

/* ── Main page ────────────────────────────────────────────────── */
export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [inputValue, setInputValue] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setQuery("");
      setResults([]);
      setEmpty(false);
      setError(null);
      setSearchParams({}, { replace: true });
      return;
    }

    debounceRef.current = setTimeout(() => {
      setQuery(trimmed);
      setSearchParams({ q: trimmed }, { replace: true });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setEmpty(false);

    searchAnime(query)
      .then((res) => {
        if (cancelled) return;
        setResults(res.items);
        setEmpty(res.items.length === 0);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Gagal mencari. Periksa koneksi lalu coba lagi.");
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [query]);

  const clearInput = () => {
    setInputValue("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--m3-surface)] text-[#E6E0E9]">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)] pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center gap-2 px-2">

          {/* back */}
          <Link
            to="/"
            aria-label="Kembali"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#E6E0E9] outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
          >
            <ArrowLeft size={22} />
          </Link>

          {/* search field */}
          <div className="relative flex flex-1 items-center">
            <SearchIcon
              size={18}
              className="pointer-events-none absolute left-3.5 text-[#938F99]"
            />
            <input
              ref={inputRef}
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Cari judul, genre, studio…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-label="Cari anime"
              className="h-11 w-full rounded-2xl bg-[color:var(--m3-surface-high)] pl-[38px] pr-10 text-[15px] text-[#E6E0E9] placeholder:text-[#938F99] outline-none transition-shadow focus:ring-2 focus:ring-[#D0BCFF] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {inputValue && (
              <button
                onClick={clearInput}
                aria-label="Hapus"
                className="absolute right-1 flex h-9 w-9 items-center justify-center rounded-xl text-[#938F99] outline-none transition-colors hover:text-[#E6E0E9] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
              >
                <X size={16} />
              </button>
            )}
          </div>

        </div>

        {/* thin progress bar saat loading */}
        <div
          className={`h-[2px] w-full bg-gradient-to-r from-[#4F378B] via-[#D0BCFF] to-[#4F378B] transition-opacity duration-300 ${
            loading ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </header>

      {/* ── Content ── */}
      <main className="flex-1 pb-[env(safe-area-inset-bottom)] pb-28">

        {/* idle */}
        {!query && !loading && (
          <div className="flex flex-col items-center gap-4 px-6 pt-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[color:var(--m3-surface-high)]">
              <Telescope size={36} className="text-[#D0BCFF]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[17px] font-semibold text-[#E6E0E9]">Temukan anime</p>
              <p className="mt-1.5 max-w-[260px] text-[13px] leading-5 text-[#938F99]">
                Ketik judul, genre, atau nama studio di kolom di atas.
              </p>
            </div>

            {/* quick genre chips */}
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {["Action", "Romance", "Comedy", "Fantasy", "Horror", "Slice of Life"].map((g) => (
                <button
                  key={g}
                  onClick={() => setInputValue(g)}
                  className="rounded-full border border-[#49454F] px-3.5 py-1.5 text-[13px] font-medium text-[#CAC4D0] outline-none transition-colors hover:border-[#D0BCFF]/60 hover:bg-[#D0BCFF]/[0.08] hover:text-[#EADDFF] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* loading skeleton */}
        {loading && (
          <div className="mt-1 px-1">
            <div className="overflow-hidden rounded-2xl bg-[color:var(--m3-surface-low)]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  {i > 0 && <Divider />}
                  <SkeletonCard />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* error */}
        {!loading && error && (
          <div className="mx-4 mt-6 rounded-2xl bg-[color:var(--m3-surface-high)] px-4 py-5">
            <p className="text-[13px] text-[#CAC4D0]">{error}</p>
          </div>
        )}

        {/* empty */}
        {!loading && empty && (
          <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[color:var(--m3-surface-high)]">
              <SearchIcon size={28} className="text-[#49454F]" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-[#E6E0E9]">Tidak ditemukan</p>
            <p className="max-w-[240px] text-[13px] leading-5 text-[#938F99]">
              Tidak ada anime untuk{" "}
              <span className="font-medium text-[#D0BCFF]">"{query}"</span>.
              Coba kata kunci lain.
            </p>
          </div>
        )}

        {/* results */}
        {!loading && results.length > 0 && (
          <section aria-label={`Hasil "${query}"`}>
            {/* result count label */}
            <p className="px-4 pb-2 pt-3 text-[12px] font-medium uppercase tracking-wide text-[#938F99]">
              {results.length} hasil
            </p>

            {/* result list card */}
            <div className="mx-3 overflow-hidden rounded-2xl bg-[color:var(--m3-surface-low)]">
              {results.map((item, i) => (
                <div key={item.seriesSlug}>
                  {i > 0 && <Divider />}
                  <ResultCard item={item} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
