import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Poster from "./Poster";
import type { AnimeItem } from "../types/anime";

export function PosterGrid({ items, loading }: { items: AnimeItem[]; loading: boolean }) {
  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-3 px-4 pt-2 sm:grid-cols-4 md:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-[color:var(--m3-surface-high)] motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 px-4 pt-2 sm:grid-cols-4 md:grid-cols-5">
      {items.map((a) => (
        <Link
          key={a.seriesSlug}
          to={`/detail/${encodeURIComponent(a.slug)}`}
          className="group block outline-none"
        >
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[color:var(--m3-surface-high)] group-focus-visible:ring-2 group-focus-visible:ring-m3-primary">
            <Poster
              src={a.poster}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
            />
            {a.episode && (
              <span className="absolute bottom-2 left-2 rounded-lg bg-[color:var(--m3-surface)]/80 px-2 py-0.5 text-xs font-medium text-m3-on-primary-container backdrop-blur-sm">
                {a.episode}
              </span>
            )}
          </div>
          <h3 className="mt-2 line-clamp-2 text-xs font-medium leading-4 text-m3-on-surface">
            {a.title}
          </h3>
        </Link>
      ))}
    </div>
  );
}

export function Pager({
  page,
  hasPrev,
  hasNext,
  busy,
  onChange,
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  busy?: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav aria-label="Halaman" className="mt-8 flex items-center justify-center gap-3 px-4">
      <button
        disabled={busy || !hasPrev}
        onClick={() => onChange(page - 1)}
        className="flex h-10 items-center gap-1 rounded-full border border-m3-outline pl-3 pr-4 text-sm font-medium text-m3-primary outline-none transition-colors hover:bg-m3-primary/[0.08] focus-visible:ring-2 focus-visible:ring-m3-primary disabled:cursor-not-allowed disabled:border-m3-on-surface/[0.12] disabled:text-m3-on-surface/40 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={18} />
        Sebelumnya
      </button>

      <span className="min-w-20 text-center text-sm text-m3-on-surface-variant">
        Halaman {page}
      </span>

      <button
        disabled={busy || !hasNext}
        onClick={() => onChange(page + 1)}
        className="flex h-10 items-center gap-1 rounded-full bg-m3-primary pl-4 pr-3 text-sm font-medium text-m3-on-primary outline-none transition-colors hover:bg-m3-primary-hover focus-visible:ring-2 focus-visible:ring-m3-on-primary-container disabled:cursor-not-allowed disabled:bg-m3-on-surface/[0.12] disabled:text-m3-on-surface/40 disabled:hover:bg-m3-on-surface/[0.12]"
      >
        Berikutnya
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
