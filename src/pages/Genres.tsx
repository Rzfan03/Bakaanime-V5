import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getGenres } from "../lib/api/anime";
import type { Genre } from "../types/anime";

export default function Genres() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getGenres()
      .then((g) => {
        if (!cancelled) setGenres(g);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return (
    <div className="min-h-screen bg-[color:var(--m3-surface)] pb-32 text-m3-on-surface">
      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-16 items-center gap-1 px-2">
          <Link
            to="/"
            aria-label="Kembali"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-m3-primary/[0.08] focus-visible:ring-2 focus-visible:ring-m3-primary"
          >
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-[22px] font-medium leading-7">Jelajah genre</h1>
        </div>
      </header>

      <main className="px-4 pt-2">
        {loading ? (
          <div className="flex flex-wrap gap-2" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-20 animate-pulse rounded-full bg-[color:var(--m3-surface-high)] motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-m3-outline">Telah Terjadi Sebuah Kesalahan.</p>
            <button
              onClick={() => setReload((k) => k + 1)}
              className="flex h-10 items-center gap-2 rounded-full bg-m3-primary-container px-4 text-sm font-medium text-m3-on-primary-container outline-none transition-colors hover:bg-m3-primary-container-hover focus-visible:ring-2 focus-visible:ring-m3-primary"
            >
              <RefreshCw size={18} />
              Coba lagi
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => (
              <Link
                key={g.slug}
                to={`/genre/${encodeURIComponent(g.slug)}`}
                className="flex h-9 items-center rounded-full border border-m3-outline-variant px-4 text-sm font-medium text-m3-on-surface-variant outline-none transition-colors hover:border-m3-primary/60 hover:bg-m3-primary/[0.08] hover:text-m3-on-primary-container focus-visible:ring-2 focus-visible:ring-m3-primary"
              >
                {g.title}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
