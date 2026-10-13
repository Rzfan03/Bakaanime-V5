import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getSchedule } from "../lib/api/anime";
import type { ScheduleDay } from "../types/anime";
import { PosterGrid } from "../components/PosterGrid";

export default function Schedule() {
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getSchedule()
      .then((d) => {
        if (!cancelled) setDays(d);
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

  const current = days[active];

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
          <h1 className="text-[22px] font-medium leading-7">Jadwal rilis</h1>
        </div>

        {!loading && !error && days.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {days.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                className={`flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-m3-primary ${
                  i === active
                    ? "bg-m3-primary-container text-m3-on-primary-container"
                    : "border border-m3-outline-variant text-m3-on-surface-variant hover:bg-m3-primary/[0.08]"
                }`}
              >
                {d.day}
              </button>
            ))}
          </div>
        )}
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
          <PosterGrid items={current?.items ?? []} loading={loading} />
        )}
      </main>
    </div>
  );
}
