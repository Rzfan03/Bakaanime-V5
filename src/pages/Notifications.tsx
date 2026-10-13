import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Bell, BellRing, ChevronRight } from "lucide-react";
import {
  markNotifsRead,
  onNotifChange,
  readNotifLog,
  requestNotifPermission,
} from "../lib/notifications";
import type { NotifLogItem } from "../lib/notifications";

const timeAgo = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

export default function Notifications() {
  const [items, setItems] = useState<NotifLogItem[]>([]);
  const [granted, setGranted] = useState(true);

  useEffect(() => {
    setItems(readNotifLog());
    const off = onNotifChange(() => setItems(readNotifLog()));
    // Viewing the feed clears the unread badge.
    const t = setTimeout(() => {
      markNotifsRead();
      setItems(readNotifLog());
    }, 1200);
    if (typeof Notification !== "undefined") {
      setGranted(Notification.permission === "granted");
    }
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);

  const enable = async () => {
    const ok = await requestNotifPermission();
    setGranted(ok);
  };

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
          <h1 className="text-[22px] font-medium leading-7">Notifikasi</h1>
        </div>
      </header>

      <main className="px-4 pt-2">
        {!granted && (
          <button
            onClick={() => void enable()}
            className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-m3-primary-container p-4 text-left outline-none transition-colors hover:bg-m3-primary-container-hover focus-visible:ring-2 focus-visible:ring-m3-primary"
          >
            <BellRing size={22} className="shrink-0 text-m3-on-primary-container" />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-m3-on-primary-container">
                Aktifkan notifikasi
              </span>
              <span className="block text-xs text-m3-on-primary-container/80">
                Dapatkan pemberitahuan episode baru dari Library.
              </span>
            </span>
          </button>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 pt-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[color:var(--m3-surface-high)]">
              <Bell size={36} className="text-m3-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[17px] font-semibold text-m3-on-surface">Belum ada notifikasi</p>
              <p className="mt-1.5 max-w-[260px] text-[13px] leading-5 text-m3-outline">
                Tambahkan anime ke Library, dan episode barunya akan muncul di sini.
              </p>
            </div>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-[color:var(--m3-surface-low)]">
            {items.map((n, i) => (
              <li key={`${n.slug}:${n.episode}:${n.at}`}>
                {i > 0 && <div className="mx-3 h-px bg-[color:var(--m3-surface-high)]" />}
                <Link
                  to={`/detail/${encodeURIComponent(n.slug)}`}
                  className="flex items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-m3-primary/[0.06] focus-visible:ring-2 focus-visible:ring-m3-primary"
                >
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-m3-primary" />}
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-1 text-sm font-semibold text-m3-on-surface">
                      {n.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-m3-on-surface-variant">
                      Episode {n.episode} baru • {timeAgo(n.at)}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-m3-outline-variant" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
