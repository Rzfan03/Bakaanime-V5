import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Search as SearchIcon, Telescope, X } from "lucide-react";
import { searchAnime } from "../lib/api/anime";
import type { AnimeItem } from "../types/anime";
import Poster from "../components/Poster";


const detailPath = (a: AnimeItem) => `/detail/${encodeURIComponent(a.seriesSlug)}`;

function ResultCard({ item }: { item: AnimeItem }) {
  return (
    <Link
      to={detailPath(item)}
      className="group flex items-center gap-4 p-3 outline-none transition-colors active:bg-m3-primary/[0.10] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-m3-primary"
    >
      <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl bg-[color:var(--m3-surface-high)] shadow-md">
        <Poster
          src={item.poster}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
        />
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-m3-on-surface">
          {item.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.type && (
            <span className="rounded-full bg-[color:var(--m3-surface-high)] px-2.5 py-0.5 text-[11px] font-medium text-m3-on-surface-variant">
              {item.type}
            </span>
          )}
          {item.episode && (
            <span className="rounded-full bg-m3-primary-container/70 px-2.5 py-0.5 text-[11px] font-medium text-m3-on-primary-container">
              {item.episode}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-m3-outline-variant transition-colors group-hover:text-m3-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}

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

function Divider() {
  return <div className="mx-3 h-px bg-[color:var(--m3-surface-high)]" aria-hidden="true" />;
}

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
        setError("Telah Terjadi Sebuah Kesalahan.");
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
    <div className="flex min-h-screen flex-col bg-[color:var(--m3-surface)] text-m3-on-surface">

      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)] pt-[env(safe-area-inset-top)]">
        <div className="flex h-16 items-center gap-2 px-2">

          <Link
            to="/"
            aria-label="Kembali"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-m3-on-surface outline-none transition-colors hover:bg-m3-primary/[0.08] focus-visible:ring-2 focus-visible:ring-m3-primary"
          >
            <ArrowLeft size={22} />
          </Link>

          <div className="relative flex flex-1 items-center">
            <SearchIcon
              size={18}
              className="pointer-events-none absolute left-3.5 text-m3-outline"
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
              className="h-11 w-full rounded-2xl bg-[color:var(--m3-surface-high)] pl-[38px] pr-10 text-[15px] text-m3-on-surface placeholder:text-m3-outline outline-none transition-shadow focus:ring-2 focus:ring-m3-primary [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
            />
            {inputValue && (
              <button
                onClick={clearInput}
                aria-label="Hapus"
                className="absolute right-1 flex h-9 w-9 items-center justify-center rounded-xl text-m3-outline outline-none transition-colors hover:text-m3-on-surface focus-visible:ring-2 focus-visible:ring-m3-primary"
              >
                <X size={16} />
              </button>
            )}
          </div>

        </div>

        {/* Thin progress bar while loading */}
        <div
          className={`h-[2px] w-full bg-gradient-to-r from-m3-primary-container via-m3-primary to-m3-primary-container transition-opacity duration-300 ${
            loading ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      </header>

      <main className="flex-1 pb-[env(safe-area-inset-bottom)] pb-28">

        {!query && !loading && (
          <div className="flex flex-col items-center gap-4 px-6 pt-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[color:var(--m3-surface-high)]">
              <Telescope size={36} className="text-m3-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[17px] font-semibold text-m3-on-surface">Temukan anime</p>
              <p className="mt-1.5 max-w-[260px] text-[13px] leading-5 text-m3-outline">
                Ketik judul, genre, atau nama studio di kolom di atas.
              </p>
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {["Action", "Romance", "Comedy", "Fantasy", "Horror", "Slice of Life"].map((g) => (
                <button
                  key={g}
                  onClick={() => setInputValue(g)}
                  className="rounded-full border border-m3-outline-variant px-3.5 py-1.5 text-[13px] font-medium text-m3-on-surface-variant outline-none transition-colors hover:border-m3-primary/60 hover:bg-m3-primary/[0.08] hover:text-m3-on-primary-container focus-visible:ring-2 focus-visible:ring-m3-primary"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

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

        {!loading && error && (
          <div className="mx-4 mt-6 rounded-2xl bg-[color:var(--m3-surface-high)] px-4 py-5">
            <p className="text-[13px] text-m3-on-surface-variant">{error}</p>
          </div>
        )}

        {!loading && empty && (
          <div className="flex flex-col items-center gap-3 px-6 pt-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[color:var(--m3-surface-high)]">
              <SearchIcon size={28} className="text-m3-outline-variant" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-m3-on-surface">Tidak ditemukan</p>
            <p className="max-w-[240px] text-[13px] leading-5 text-m3-outline">
              Tidak ada anime untuk{" "}
              <span className="font-medium text-m3-primary">"{query}"</span>.
              Coba kata kunci lain.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <section aria-label={`Hasil "${query}"`}>
            <p className="px-4 pb-2 pt-3 text-[12px] font-medium uppercase tracking-wide text-m3-outline">
              {results.length} hasil
            </p>

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
