import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getByGenre } from "../lib/api/anime";
import type { AnimeItem, Pagination } from "../types/anime";
import { Pager, PosterGrid } from "../components/PosterGrid";

const titleCase = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function Genre() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;

  const [items, setItems] = useState<AnimeItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getByGenre(slug, page)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPagination(res.pagination);
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
  }, [slug, page, reload]);

  const goTo = (p: number) => {
    setSearchParams(p === 1 ? {} : { page: String(p) });
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-screen bg-[color:var(--m3-surface)] pb-32 text-m3-on-surface">
      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-16 items-center gap-1 px-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-m3-primary/[0.08] focus-visible:ring-2 focus-visible:ring-m3-primary"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="line-clamp-1 text-[22px] font-medium leading-7">{titleCase(slug)}</h1>
        </div>
      </header>

      <main>
        {error ? (
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
          <>
            <PosterGrid items={items} loading={loading} />
            {!loading && items.length === 0 && (
              <p className="px-4 py-12 text-center text-sm text-m3-on-surface-variant">
                Belum ada anime di genre ini.
              </p>
            )}
            {!loading && pagination && (
              <Pager
                page={pagination.currentPage}
                hasPrev={pagination.hasPrev}
                hasNext={pagination.hasNext}
                onChange={goTo}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
