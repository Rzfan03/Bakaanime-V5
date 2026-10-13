import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BookOpen, Trash2 } from "lucide-react";
import type { BackendItem } from "../lib/api/backend";
import { useAuth } from "../lib/auth";
import { loadFavorites, removeFavorite } from "../lib/favorites";
import Poster from "../components/Poster";

const detailPath = (slug: string) => `/detail/${encodeURIComponent(slug)}`;

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 pt-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[color:var(--m3-surface-high)]">
        <BookOpen size={36} className="text-[#D0BCFF]" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[17px] font-semibold text-[#E6E0E9]">Library kosong</p>
        <p className="mt-1.5 max-w-[260px] text-[13px] leading-5 text-[#938F99]">
          Tekan tombol hati di halaman detail atau saat menonton, dan anime-nya masuk ke library dan favorit di profil.
        </p>
      </div>
      <Link
        to="/"
        className="mt-1 flex h-11 items-center rounded-full bg-[#4F378B] px-6 text-sm font-semibold text-[#EADDFF] outline-none transition-colors hover:bg-[#5A42A0] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
      >
        Jelajahi anime
      </Link>
    </div>
  );
}

function AnimeCard({
  item,
  onRemove,
}: {
  item: BackendItem;
  onRemove: (slug: string) => void;
}) {
  return (
    <div className="group relative">
      <Link
        to={detailPath(item.slug)}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-[#D0BCFF] focus-visible:rounded-xl"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[color:var(--m3-surface-high)]">
          <Poster
            src={item.poster}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0D0B12]/80 to-transparent" />
        </div>
        <p className="mt-2 line-clamp-2 text-xs font-medium leading-4 text-[#E6E0E9]">
          {item.title}
        </p>
      </Link>
      <button
        onClick={() => onRemove(item.slug)}
        aria-label={`Hapus ${item.title} dari favorit`}
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--m3-surface)]/80 text-[#CAC4D0] opacity-90 backdrop-blur-sm outline-none transition-all group-hover:opacity-100 hover:bg-[color:var(--m3-surface-high)] hover:text-[#F2B8B8] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 px-4 pt-2 sm:grid-cols-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] animate-pulse rounded-xl bg-[color:var(--m3-surface-high)]" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-[color:var(--m3-surface-high)]" />
        </div>
      ))}
    </div>
  );
}

export default function Library() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<BackendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    loadFavorites()
      .then((res) => {
        if (cancelled) return;
        setLibrary(res.library);
      })
      .catch(() => {
        if (!cancelled) setError("Telah Terjadi Sebuah Kesalahan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  const handleRemove = async (slug: string) => {
    const before = library;
    setLibrary((prev) => prev.filter((l) => l.slug !== slug)); // optimistic
    try {
      await removeFavorite(slug); // hapus dari library sekaligus dari favorit di profil
    } catch {
      setLibrary(before); // rollback
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--m3-surface)] text-[#E6E0E9]">
      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
          <h1 className="text-[22px] font-semibold">Library</h1>
          {library.length > 0 && (
            <span className="rounded-full bg-[#4F378B]/60 px-3 py-0.5 text-xs font-medium text-[#EADDFF]">
              {library.length} anime
            </span>
          )}
        </div>
      </header>

      <main className="pb-32">
        {loading ? (
          <GridSkeleton />
        ) : error ? (
          <p className="py-10 text-center text-sm text-[#938F99]">{error}</p>
        ) : library.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-3 gap-3 px-4 pt-2 sm:grid-cols-4 md:grid-cols-5">
            {library.map((item) => (
              <AnimeCard
                key={item.slug}
                item={item}
                onRemove={(slug) => void handleRemove(slug)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
