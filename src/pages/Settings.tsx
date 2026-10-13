import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, History, Info, LogOut, RotateCcw } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../lib/auth";
import { useSettings } from "../lib/settings";
import type { AppFontId, TextSizeId, ThemeId } from "../lib/settings";
import { ensureNotificationPermission } from "../lib/notifications";
import { getInstalledVersion } from "../lib/version";
import { FramedAvatar } from "../components/FramedAvatar";
import { Dialog } from "../components/Dialog";

const ITEM =
  "flex w-full min-h-[72px] items-center gap-4 bg-[color:var(--m3-surface-container)] px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D0BCFF]";
const ITEM_PRESS = "active:bg-[color:var(--m3-surface-high)]";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-4 pb-2 pt-6 text-[14px] font-medium leading-5 tracking-[0.1px] text-[#D0BCFF]">
      {children}
    </h2>
  );
}

function Group({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 overflow-hidden rounded-[28px] bg-[color:var(--m3-surface)]">
      {children}
    </div>
  );
}

function Texts({
  title,
  desc,
  danger,
}: {
  title: string;
  desc?: string;
  danger?: boolean;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span
        className={`block text-[16px] leading-6 tracking-[0.5px] ${
          danger ? "text-[#F2B8B5]" : "text-[#E6E0E9]"
        }`}
      >
        {title}
      </span>
      {desc && (
        <span className="block text-[14px] leading-5 tracking-[0.25px] text-[#CAC4D0]">{desc}</span>
      )}
    </span>
  );
}

function ControlItem({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-[color:var(--m3-surface-container)] px-4 pb-4 pt-3.5">
      <p className="text-[16px] leading-6 tracking-[0.5px] text-[#E6E0E9]">{title}</p>
      {desc && <p className="text-[14px] leading-5 tracking-[0.25px] text-[#CAC4D0]">{desc}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex overflow-hidden rounded-full border border-[#938F99]"
    >
      {options.map((o, i) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`h-10 flex-1 text-[14px] font-medium leading-5 tracking-[0.1px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#EADDFF] ${
              i > 0 ? "border-l border-[#938F99]" : ""
            } ${
              active ? "bg-[#D0BCFF] text-[#381E72]" : "text-[#E6E0E9] active:bg-[#E6E0E9]/[0.10]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SwitchItem({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${ITEM} ${ITEM_PRESS}`}
    >
      <Texts title={title} desc={desc} />
      <span
        aria-hidden="true"
        className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#D0BCFF]" : "border-2 border-[#938F99] bg-[#36343B]"
        }`}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all ${
            checked ? "left-[24px] h-6 w-6 bg-[#381E72]" : "left-[6px] h-4 w-4 bg-[#938F99]"
          }`}
        />
      </span>
    </button>
  );
}

function Snackbar({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[70] mx-auto max-w-md">
      <div
        role="status"
        className="flex min-h-12 items-center rounded bg-[#E6E0E9] px-4 py-3 text-[14px] leading-5 tracking-[0.25px] text-[#322F35] shadow-lg shadow-black/40"
      >
        {message}
      </div>
    </div>
  );
}

const THEMES: { id: ThemeId; label: string }[] = [
  { id: "dark", label: "Gelap" },
  { id: "amoled", label: "AMOLED" },
];

const TEXT_SIZES: { id: TextSizeId; label: string }[] = [
  { id: "sm", label: "Kecil" },
  { id: "md", label: "Normal" },
  { id: "lg", label: "Besar" },
  { id: "xl", label: "Terbesar" },
];

const APP_FONTS: { id: AppFontId; label: string }[] = [
  { id: "default", label: "Bawaan" },
  { id: "pixel", label: "Pixelify" },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { settings, update, reset } = useSettings();
  const [dialog, setDialog] = useState<"history" | "logout" | null>(null);
  const [snack, setSnack] = useState("");
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(""), 3000);
    return () => clearTimeout(t);
  }, [snack]);

  // The app's own version, read from the installed build — no network call.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await getInstalledVersion();
      if (!cancelled && v) setVersion(v);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem("watched");
    } catch {
      /* ignore */
    }
    setDialog(null);
    setSnack("Riwayat tontonan dihapus");
  };

  const icon = "shrink-0 text-[#CAC4D0]";

  return (
    <div className="min-h-screen bg-[color:var(--m3-surface)] text-[#E6E0E9]">
      <header className="sticky top-0 z-40 bg-[color:var(--m3-surface)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-1">
          <button
            type="button"
            aria-label="Kembali"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full text-[#E6E0E9] outline-none transition-colors active:bg-[#E6E0E9]/[0.10] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-36">
        <h1 className="px-4 pb-4 text-[28px] font-normal leading-9 text-[#E6E0E9]">Pengaturan</h1>

        <Group>
          <Link to="/profile" className={`${ITEM} ${ITEM_PRESS} min-h-[88px]`}>
            <FramedAvatar name={user?.name ?? ""} src={user?.avatar} frameId={user?.frame} size={56} />
            <Texts title={user?.name || "Profil"} desc="Ubah nama, foto, dan bio" />
            <ChevronRight size={24} className={icon} />
          </Link>
        </Group>

        <SectionLabel>Tampilan</SectionLabel>
        <Group>
          <ControlItem title="Tema" desc="AMOLED memakai hitam pekat dan hemat baterai di layar OLED">
            <Segmented
              label="Tema"
              value={settings.theme}
              options={THEMES}
              onChange={(theme) => update({ theme })}
            />
          </ControlItem>

          <ControlItem title="Ukuran teks" desc="Berlaku untuk seluruh aplikasi">
            <Segmented
              label="Ukuran teks"
              value={settings.textSize}
              options={TEXT_SIZES}
              onChange={(textSize) => update({ textSize })}
            />
          </ControlItem>

          <ControlItem title="Font aplikasi">
            <Segmented
              label="Font aplikasi"
              value={settings.appFont}
              options={APP_FONTS}
              onChange={(appFont) => update({ appFont })}
            />
          </ControlItem>

          <SwitchItem
            title="Kurangi animasi"
            desc="Matikan transisi dan efek gerak"
            checked={settings.reduceMotion}
            onChange={(reduceMotion) => update({ reduceMotion })}
          />

          <button
            type="button"
            onClick={() => {
              reset();
              setSnack("Tampilan diatur ulang");
            }}
            className={`${ITEM} ${ITEM_PRESS}`}
          >
            <RotateCcw size={24} className={icon} />
            <Texts title="Atur ulang tampilan" desc="Kembali ke pengaturan awal" />
          </button>
        </Group>

        {Capacitor.isNativePlatform() && (
          <>
            <SectionLabel>Notifikasi</SectionLabel>
            <Group>
              <SwitchItem
                title="Notifikasi episode baru"
                desc="Beri tahu saat anime di Library punya episode baru"
                checked={settings.notifications}
                onChange={(notifications) => {
                  update({ notifications });
                  if (notifications) void ensureNotificationPermission();
                }}
              />
            </Group>
          </>
        )}

        <SectionLabel>Data</SectionLabel>
        <Group>
          <button type="button" onClick={() => setDialog("history")} className={`${ITEM} ${ITEM_PRESS}`}>
            <History size={24} className={icon} />
            <Texts
              title="Hapus riwayat tontonan"
              desc="Tanda episode yang sudah ditonton di perangkat ini"
            />
          </button>
        </Group>

        <SectionLabel>Tentang</SectionLabel>
        <Group>
          <div className={ITEM}>
            <Info size={24} className={icon} />
            <Texts title="BakaAnime" desc={version ? `Versi ${version}` : undefined} />
          </div>
        </Group>

        <div className="mt-6">
          <Group>
            <button type="button" onClick={() => setDialog("logout")} className={`${ITEM} ${ITEM_PRESS}`}>
              <LogOut size={24} className="shrink-0 text-[#F2B8B5]" />
              <Texts title="Keluar" danger />
            </button>
          </Group>
        </div>
      </main>

      {dialog === "history" && (
        <Dialog
          title="Hapus riwayat tontonan?"
          body="Semua tanda episode yang sudah ditonton di perangkat ini akan dihapus. Tindakan ini tidak bisa dibatalkan."
          confirmLabel="Hapus"
          onConfirm={clearHistory}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === "logout" && (
        <Dialog
          title="Keluar dari akun?"
          body="Kamu perlu masuk lagi untuk membuka komentar, favorit, dan profilmu."
          confirmLabel="Keluar"
          onConfirm={() => {
            setDialog(null);
            logout();
          }}
          onCancel={() => setDialog(null)}
        />
      )}
      {snack && <Snackbar message={snack} />}
    </div>
  );
}