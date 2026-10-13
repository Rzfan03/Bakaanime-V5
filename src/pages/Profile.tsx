import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  Loader2,
  Lock,
  Heart,
} from "lucide-react";

import { fileToResizedDataUrl } from "../lib/image";
import { isNative, pickNativeImage } from "../lib/picker";
import { useAuth } from "../lib/auth";
import { backend } from "../lib/api/backend";
import type { UserComment } from "../lib/api/backend";
import { loadFavorites, removeFavorite } from "../lib/favorites";
import type { FavoriteItem, UserProfile } from "../lib/storage";
import Poster from "../components/Poster";

const detailPath = (slug: string) => `/detail/${encodeURIComponent(slug)}`;

/* ───────────────────────────────────────────────────────────────
   Avatar frame types & styles
   ─────────────────────────────────────────────────────────────── */
type FrameId = "plain" | "aurora" | "neon" | "hex" | "ember" | "orbit" | "gold";

interface FrameDef {
  id: FrameId;
  label: string;
  minRole: "user" | "admin" | "dev";
  ring: React.CSSProperties;
  inner?: React.CSSProperties;
  extra?: string;
}

const FRAMES: FrameDef[] = [
  {
    id: "plain",
    label: "Polos",
    minRole: "user",
    ring: { background: "#4f378b", borderRadius: "50%", padding: 3 },
  },
  {
    id: "aurora",
    label: "Aurora",
    minRole: "admin",
    ring: {
      background: "conic-gradient(from 0deg, #d0bcff, #efb8c8, #4f378b, #d0bcff)",
      borderRadius: "50%",
      padding: 4,
      animation: "spin 6s linear infinite",
    },
    inner: { animation: "spin 6s linear infinite reverse" },
  },
  {
    id: "neon",
    label: "Neon",
    minRole: "admin",
    ring: {
      background: "#d0bcff",
      borderRadius: "50%",
      padding: 4,
      boxShadow: "0 0 14px 2px #d0bcff",
      animation: "neon-glow 2s ease-in-out infinite",
    },
  },
  {
    id: "hex",
    label: "Hex",
    minRole: "dev",
    ring: {
      background: "linear-gradient(135deg, #d0bcff, #efb8c8)",
      clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
      padding: 5,
    },
    inner: {
      clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
      borderRadius: 0,
    },
  },
  {
    id: "ember",
    label: "Ember",
    minRole: "dev",
    ring: {
      background: "conic-gradient(from 0deg, #ff7a45, #ffd666, #ff4d4f, #ff7a45)",
      borderRadius: "50%",
      padding: 4,
      boxShadow: "0 0 18px rgba(255,122,69,.55)",
      animation: "spin 6s linear infinite",
    },
    inner: { animation: "spin 6s linear infinite reverse" },
  },
  {
    id: "orbit",
    label: "Orbit",
    minRole: "dev",
    ring: {
      background: "none",
      borderRadius: "50%",
      padding: 10,
      outline: "2px dashed #d0bcff",
      outlineOffset: -2,
      animation: "spin 14s linear infinite",
    },
  },
  {
    id: "gold",
    label: "Emas",
    minRole: "admin",
    ring: {
      background: "conic-gradient(#f7e08a,#b8860b,#fff3b0,#b8860b,#f7e08a)",
      borderRadius: "50%",
      padding: 5,
    },
  },
];

function roleLevel(role: string): number {
  if (role === "dev") return 3;
  if (role === "admin") return 2;
  return 1;
}

function canUseFrame(userRole: string, frame: FrameDef): boolean {
  return roleLevel(userRole) >= roleLevel(frame.minRole);
}

/* ───────────────────────────────────────────────────────────────
   Avatar placeholder
   ─────────────────────────────────────────────────────────────── */
function AvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4F378B] to-[#7965AF] text-2xl font-bold text-[#EADDFF]">
      {initials || "?"}
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Skeleton shimmer (untuk avatar loading)
   ─────────────────────────────────────────────────────────────── */
function AvatarSkeleton() {
  return (
    <div
      className="animate-pulse rounded-full bg-[color:var(--m3-surface-high)]"
      style={{ width: 104, height: 104 }}
      aria-label="Memuat foto profil…"
    />
  );
}

/* ───────────────────────────────────────────────────────────────
   Dev badge
   ─────────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  if (role === "dev")
    return (
      <span className="inline-flex items-center rounded-md bg-[#4F378B] px-1.5 py-0.5 text-[10px] font-extrabold tracking-widest text-[#EADDFF]">
        DEV
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex items-center rounded-md bg-[#1D3A5F] px-1.5 py-0.5 text-[10px] font-extrabold tracking-widest text-[#90CAF9]">
        ADMIN
      </span>
    );
  return null;
}

/* ───────────────────────────────────────────────────────────────
   Avatar frame component
   ─────────────────────────────────────────────────────────────── */
function AvatarFrame({
  src,
  name,
  busy,
  frameId,
  onClick,
}: {
  src: string;
  name: string;
  busy: boolean;
  frameId: FrameId;
  onClick: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(!src);
  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label="Ubah foto profil"
      className="group relative shrink-0 outline-none disabled:opacity-80"
      style={{ width: 104, height: 104 }}
    >
      {!imgLoaded && (
        <div className="absolute inset-0 animate-pulse rounded-full bg-[color:var(--m3-surface-high)]" />
      )}

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          ...frame.ring,
          opacity: imgLoaded ? 1 : 0,
          transition: "opacity 0.3s",
        }}
      >
        <div
          className="flex items-center justify-center overflow-hidden bg-[color:var(--m3-surface)]"
          style={{
            width: 104 - ((frame.ring.padding as number) ?? 4) * 2,
            height: 104 - ((frame.ring.padding as number) ?? 4) * 2,
            borderRadius: frame.inner?.clipPath ? 0 : "50%",
            clipPath: frame.inner?.clipPath,
            ...(frame.inner?.animation ? { animation: frame.inner.animation } : {}),
          }}
        >
          <div
            className="overflow-hidden"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: frame.inner?.clipPath ? 0 : "50%",
              clipPath: frame.inner?.clipPath,
            }}
          >
            {src ? (
              <img
                src={src}
                alt={name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onLoad={() => setImgLoaded(true)}
                style={{ display: imgLoaded ? "block" : "none" }}
              />
            ) : (
              <AvatarPlaceholder name={name} />
            )}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {busy ? (
          <Loader2 size={22} className="animate-spin text-white" />
        ) : (
          <Camera size={22} className="text-white" />
        )}
      </div>
    </button>
  );
}

/* ───────────────────────────────────────────────────────────────
   Frame picker di dalam EditSheet
   ─────────────────────────────────────────────────────────────── */
function FramePicker({
  current,
  userRole,
  avatarSrc,
  userName,
  onChange,
}: {
  current: FrameId;
  userRole: string;
  avatarSrc: string;
  userName: string;
  onChange: (id: FrameId) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[12px] text-[#CAC4D0]">Bingkai avatar</p>
      <div className="grid grid-cols-3 gap-2">
        {FRAMES.map((frame) => {
          const unlocked = canUseFrame(userRole, frame);
          const active = current === frame.id;
          return (
            <button
              key={frame.id}
              onClick={() => unlocked && onChange(frame.id)}
              disabled={!unlocked}
              className={`relative flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[12px] outline-none transition-colors ${
                active
                  ? "bg-[#4F378B] text-[#EADDFF]"
                  : unlocked
                  ? "bg-[color:var(--m3-surface-high)] text-[#CAC4D0] hover:bg-[#37343E]"
                  : "bg-[color:var(--m3-surface-high)] text-[#49454F] opacity-50"
              }`}
            >
              <div style={{ width: 48, height: 48, position: "relative" }}>
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ ...frame.ring, animation: "none" }}
                >
                  <div
                    className="flex items-center justify-center overflow-hidden bg-[color:var(--m3-surface)]"
                    style={{
                      width: 48 - ((frame.ring.padding as number) ?? 4) * 2,
                      height: 48 - ((frame.ring.padding as number) ?? 4) * 2,
                      borderRadius: frame.inner?.clipPath ? 0 : "50%",
                      clipPath: frame.inner?.clipPath,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: frame.inner?.clipPath ? 0 : "50%",
                        clipPath: frame.inner?.clipPath,
                        overflow: "hidden",
                      }}
                    >
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <AvatarPlaceholder name={userName} />
                      )}
                    </div>
                  </div>
                </div>
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Lock size={14} className="text-[#938F99]" />
                  </div>
                )}
              </div>
              <span className="leading-none">{frame.label}</span>
              {!unlocked && (
                <span className="text-[10px] text-[#938F99]">
                  {frame.minRole === "dev" ? "dev" : "admin"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Font options
   ─────────────────────────────────────────────────────────────── */
export type FontId = "default" | "mono" | "serif" | "cursive" | "pixel" | "rounded";

export const FONT_OPTIONS: { id: FontId; label: string; style: React.CSSProperties }[] = [
  { id: "default", label: "Default", style: { fontFamily: "inherit" } },
  { id: "mono", label: "Mono", style: { fontFamily: "'Roboto Mono', 'Courier New', monospace" } },
  { id: "serif", label: "Serif", style: { fontFamily: "Georgia, 'Times New Roman', serif" } },
  { id: "cursive", label: "Cursive", style: { fontFamily: "'Dancing Script', cursive" } },
  { id: "pixel", label: "Pixelify", style: { fontFamily: "'Pixelify Sans', monospace" } },
  { id: "rounded", label: "Rounded", style: { fontFamily: "'Nunito', 'Varela Round', sans-serif", fontWeight: 700 } },
];

export function fontStyle(fontId: string): React.CSSProperties {
  return FONT_OPTIONS.find((f) => f.id === fontId)?.style ?? {};
}

function FontPicker({
  current,
  userName,
  onChange,
}: {
  current: FontId;
  userName: string;
  onChange: (id: FontId) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-[12px] text-[#CAC4D0]">Font username</p>
      <div className="flex flex-col gap-2">
        {FONT_OPTIONS.map((opt) => {
          const active = current === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-left outline-none transition-colors ${
                active
                  ? "bg-[#4F378B] ring-1 ring-[#D0BCFF]"
                  : "bg-[color:var(--m3-surface-high)] hover:bg-[#37343E]"
              }`}
            >
              <span
                className={`text-[15px] ${active ? "text-[#EADDFF]" : "text-[#E6E0E9]"}`}
                style={opt.style}
              >
                {userName || "Username"}
              </span>
              <span className={`text-[12px] ${active ? "text-[#D0BCFF]" : "text-[#938F99]"}`}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Bottom sheet edit profil
   ─────────────────────────────────────────────────────────────── */
function EditSheet({
  profile,
  userRole,
  busyAvatar,
  busyBanner,
  frameId,
  fontId,
  onPickAvatar,
  onPickBanner,
  onFrameChange,
  onFontChange,
  onSave,
  onClose,
}: {
  profile: UserProfile;
  userRole: string;
  busyAvatar: boolean;
  busyBanner: boolean;
  frameId: FrameId;
  fontId: FontId;
  onPickAvatar: () => void;
  onPickBanner: () => void;
  onFrameChange: (id: FrameId) => void;
  onFontChange: (id: FontId) => void;
  onSave: (data: Partial<UserProfile & { font?: string }>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const close = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setError("");
    setSaving(true);
    try {
      await onSave({ name: name.trim(), bio: bio.trim(), font: fontId });
      close();
    } catch {
      setError("Telah Terjadi Sebuah Kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={close}
      />
      <div
        className={`fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 overflow-auto rounded-t-[28px] bg-[color:var(--m3-surface-container)] pb-[calc(24px+env(safe-area-inset-bottom,0px))] transition-transform duration-[350ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)] ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "92dvh" }}
      >
        <div className="mx-auto mt-3 mb-4 h-1 w-8 rounded-full bg-[#938F99]" />

        <div className="px-5">
          <h2 className="mb-4 text-[20px] font-bold text-[#E6E0E9]">Edit profil</h2>

          <div className="mb-1.5 flex gap-2">
            <button
              onClick={onPickAvatar}
              disabled={busyAvatar}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--m3-surface-high)] text-[13px] font-semibold text-[#D0BCFF] outline-none transition-colors hover:bg-[#37343E] focus-visible:ring-2 focus-visible:ring-[#D0BCFF] disabled:opacity-60"
            >
              {busyAvatar ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              Foto profil
            </button>
            <button
              onClick={onPickBanner}
              disabled={busyBanner}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--m3-surface-high)] text-[13px] font-semibold text-[#D0BCFF] outline-none transition-colors hover:bg-[#37343E] focus-visible:ring-2 focus-visible:ring-[#D0BCFF] disabled:opacity-60"
            >
              {busyBanner ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              Banner
            </button>
          </div>
          <p className="mb-4 text-[12px] text-[#938F99]">
            GIF avatar dan banner didukung (maks. 15 MB).
          </p>

          <FramePicker
            current={frameId}
            userRole={userRole}
            avatarSrc={profile.avatar}
            userName={profile.name}
            onChange={onFrameChange}
          />

          {(userRole === "admin" || userRole === "dev") && (
            <FontPicker
              current={fontId}
              userName={profile.name}
              onChange={onFontChange}
            />
          )}

          <label className="mb-1 block text-[12px] text-[#CAC4D0]">Nama</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Nama kamu"
            className="mb-3 w-full rounded-xl border border-[#49454F] bg-[color:var(--m3-surface-high)] px-3.5 py-3 text-[15px] text-[#E6E0E9] placeholder:text-[#49454F] outline-none focus:border-[#D0BCFF]"
          />

          <label className="mb-1 block text-[12px] text-[#CAC4D0]">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Ceritakan sedikit tentang dirimu…"
            className="mb-1 w-full resize-none rounded-xl border border-[#49454F] bg-[color:var(--m3-surface-high)] px-3.5 py-3 text-[15px] leading-relaxed text-[#E6E0E9] placeholder:text-[#49454F] outline-none focus:border-[#D0BCFF]"
          />
          <p className="mb-4 text-right text-[11px] text-[#49454F]">{bio.length}/160</p>

          {error && <p className="mb-3 text-[13px] text-[#F2B8B8]">{error}</p>}

          <button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#D0BCFF] text-[15px] font-bold text-[#381E72] outline-none transition-colors hover:bg-[#DCCBFF] focus-visible:ring-2 focus-visible:ring-[#EADDFF] disabled:opacity-60"
          >
            {saving ? <Loader2 size={20} className="animate-spin text-[#381E72]" /> : "Simpan"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────
   Fav card
   ─────────────────────────────────────────────────────────────── */
function FavCard({ item, onRemove }: { item: FavoriteItem; onRemove: (slug: string) => void }) {
  return (
    <div className="group relative">
      <Link
        to={detailPath(item.slug)}
        className="block outline-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[color:var(--m3-surface-high)] shadow-lg">
          <Poster
            src={item.poster}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0D0B12]/90 to-transparent" />
          <p className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-2 text-[11px] font-semibold leading-4 text-[#E6E0E9]">
            {item.title}
          </p>
        </div>
      </Link>
      <button
        onClick={() => onRemove(item.slug)}
        aria-label={`Hapus ${item.title} dari favorit`}
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--m3-surface)]/80 text-[#D0BCFF] backdrop-blur-sm outline-none transition-colors hover:text-[#F2B8B8] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
      >
        <Heart size={15} className="fill-current" />
      </button>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────
   Comment row
   ─────────────────────────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const m = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function CommentRow({ c }: { c: UserComment }) {
  return (
    <Link
      to={detailPath(c.anime_slug)}
      className="block border-b border-[#49454F]/60 px-4 py-4 outline-none transition-colors hover:bg-[#D0BCFF]/[0.05] focus-visible:bg-[#D0BCFF]/[0.05]"
    >
      <p className="line-clamp-1 text-[12px] font-semibold capitalize text-[#D0BCFF]">
        {c.anime_slug.replace(/-/g, " ")}
      </p>
      <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-snug text-[#E6E0E9]">{c.body}</p>
      <p className="mt-1.5 text-[12px] text-[#938F99]">{timeAgo(c.created_at)}</p>
    </Link>
  );
}

const CSS_KEYFRAMES = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes neon-glow {
  0%,100% { box-shadow: 0 0 6px #d0bcff; }
  50%      { box-shadow: 0 0 22px 4px #d0bcff; }
}
`;

/* ───────────────────────────────────────────────────────────────
   Main page
   ─────────────────────────────────────────────────────────────── */
const FRAME_KEY = "bakaanime_avatar_frame";

function readFrame(): FrameId {
  const v = localStorage.getItem(FRAME_KEY);
  return (FRAMES.find((f) => f.id === v)?.id ?? "plain") as FrameId;
}

function saveFrame(id: FrameId) {
  localStorage.setItem(FRAME_KEY, id);
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [comments, setComments] = useState<UserComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [tab, setTab] = useState<0 | 1>(0);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyImage, setBusyImage] = useState<"avatar" | "banner" | null>(null);
  const [imageError, setImageError] = useState("");
  const [frameId, setFrameId] = useState<FrameId>(readFrame);
  const [fontId, setFontId] = useState<FontId>(() => (user?.font as FontId) ?? "default");

  const [headerSolid, setHeaderSolid] = useState(false);
  const bannerImgRef = useRef<HTMLImageElement>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setHeaderSolid(window.scrollY > 120);
      if (bannerImgRef.current)
        bannerImgRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadFavorites()
      .then((res) => {
        if (!cancelled) setFavorites(res.favorites);
      })
      .catch(() => {});
    void backend
      .getMyComments()
      .then((res) => {
        if (!cancelled) setComments(res.comments);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const profile: UserProfile = {
    name: user.name,
    bio: user.bio,
    avatar: user.avatar ?? "",
    banner: user.banner ?? "",
  };

  const flashSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSave = async (data: Partial<UserProfile & { font?: string }>) => {
    const res = await backend.updateProfile(data);
    setUser(res.user);
    if (res.user.font) setFontId(res.user.font as FontId);
    flashSaved();
  };

  const handleImage = async (file: File | undefined, kind: "avatar" | "banner") => {
    if (!file) return;
    setImageError("");
    setBusyImage(kind);
    try {
      const maxSize = 15 * 1024 * 1024;
      if (file.size > maxSize) throw new Error("File terlalu besar (maks. 15 MB).");
      let dataUrl: string;
      if (file.type === "image/gif") {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        dataUrl = await fileToResizedDataUrl(file, kind === "avatar" ? 300 : 1000);
      }
      await handleSave(kind === "avatar" ? { avatar: dataUrl } : { banner: dataUrl });
    } catch {
      setImageError("Telah Terjadi Sebuah Kesalahan.");
    } finally {
      setBusyImage(null);
    }
  };

  const pickImage = (kind: "avatar" | "banner") => {
    if (isNative()) void handleNativeImage(kind);
    else (kind === "avatar" ? avatarInputRef : bannerInputRef).current?.click();
  };

  const handleNativeImage = async (kind: "avatar" | "banner") => {
    setImageError("");
    setBusyImage(kind);
    try {
      const dataUrl = await pickNativeImage(kind === "avatar" ? 300 : 1000);
      if (!dataUrl) return;
      await handleSave(kind === "avatar" ? { avatar: dataUrl } : { banner: dataUrl });
    } catch {
      setImageError("Telah Terjadi Sebuah Kesalahan.");
    } finally {
      setBusyImage(null);
    }
  };

  const handleRemoveFav = (slug: string) => {
    const before = favorites;
    setFavorites((prev) => prev.filter((f) => f.slug !== slug));
    void removeFavorite(slug).catch(() => setFavorites(before));
  };

  const handleFrameChange = (id: FrameId) => {
    setFrameId(id);
    saveFrame(id);
  };

  const handleFontChange = (id: FontId) => {
    setFontId(id);
  };

  const commentCount = comments.length;

  return (
    <div
      className="relative min-h-screen bg-[color:var(--m3-surface)] text-[#E6E0E9]"
      style={{ maxWidth: 480, margin: "0 auto" }}
    >
      <style>{CSS_KEYFRAMES}</style>

      {/* ── Sticky top bar ── */}
      <header
        className={`fixed top-0 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 items-center gap-1.5 px-2 transition-[background,backdrop-filter] duration-300 ${
          headerSolid
            ? "bg-[color:var(--m3-surface-container)]/92 backdrop-blur-[12px]"
            : "bg-transparent"
        }`}
        style={{
          paddingTop: "calc(8px + env(safe-area-inset-top, 0px))",
          paddingBottom: 8,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          aria-label="Kembali"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#D0BCFF] ${
            !headerSolid && "bg-[color:var(--m3-surface)]/55 backdrop-blur-[8px]"
          }`}
        >
          <ChevronLeft size={24} />
        </button>

        <div
          className={`min-w-0 flex-1 transition-opacity duration-300 ${
            headerSolid ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="truncate text-[16px] font-semibold leading-tight">
            {profile.name}
          </p>
          <p className="text-[12px] leading-tight text-[#CAC4D0]">
            {commentCount} komentar
          </p>
        </div>
      </header>

      {/* ── Banner ── */}
      <div className="relative h-[180px] overflow-hidden sm:h-[200px]">
        {profile.banner ? (
          <img
            ref={bannerImgRef}
            src={profile.banner}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transformOrigin: "center bottom", willChange: "transform" }}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #4f378b 0%, #2b1a4e 50%, var(--m3-surface) 100%)",
            }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[color:var(--m3-surface)]" />
      </div>

      {/* ── Profile head ── */}
      <div className="relative z-[1] px-4">
        <div className="-mt-12 flex items-end justify-between gap-3">
          {busyImage === "avatar" ? (
            <AvatarSkeleton />
          ) : (
            <AvatarFrame
              src={profile.avatar}
              name={profile.name}
              busy={false}
              frameId={frameId}
              onClick={() => setEditing(true)}
            />
          )}

          <div className="flex shrink-0 items-center gap-2 pb-1">
            <button
              onClick={() => setEditing(true)}
              className="flex h-9 items-center rounded-full bg-[#4A4458] px-4 text-[13px] font-semibold text-[#E8DEF8] outline-none transition-colors hover:bg-[#55506A] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
            >
              Edit profil
            </button>
          </div>
        </div>

        <div className="mt-3">
          <h1
            className="flex flex-wrap items-center gap-1.5 text-[22px] font-extrabold leading-tight tracking-tight"
            style={fontStyle(fontId)}
          >
            {profile.name}
            {user.verified && (
              <BadgeCheck
                size={20}
                className="shrink-0 text-[#D0BCFF]"
                aria-label="Terverifikasi"
              />
            )}
            <RoleBadge role={user.role} />
            {saved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#4F378B]/50 px-2 py-0.5 text-[11px] font-medium text-[#EADDFF]">
                <Check size={11} /> Tersimpan
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-[13px] text-[#938F99]">{user.email}</p>
        </div>

        {profile.bio ? (
          <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-[#CAC4D0]">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-[#49454F]">
            Belum ada bio. Tap &quot;Edit profil&quot; untuk menambahkan.
          </p>
        )}

        {imageError && (
          <p className="mt-2 text-[12px] text-[#F2B8B8]">{imageError}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            { label: "Favorit", value: favorites.length },
            { label: "Komentar", value: commentCount },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-2xl bg-[color:var(--m3-surface-container)] px-4 py-3"
            >
              <p className="text-[20px] font-extrabold leading-none text-[#D0BCFF]">
                {value}
              </p>
              <p className="mt-1 text-[12px] text-[#CAC4D0]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        className="sticky z-10 mt-5 grid grid-cols-2 border-b border-[#49454F]/80 bg-[color:var(--m3-surface)]"
        style={{ top: "calc(56px + env(safe-area-inset-top, 0px))" }}
      >
        {(["Komentar", "Favorit"] as const).map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i as 0 | 1)}
            className={`relative h-11 text-[14px] font-semibold outline-none transition-colors ${
              tab === i ? "text-[#D0BCFF]" : "text-[#938F99]"
            }`}
          >
            {label}
          </button>
        ))}
        <div
          className="absolute bottom-0 flex w-1/2 justify-center transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ transform: `translateX(${tab * 100}%)` }}
        >
          <div className="h-[3px] w-10 rounded-t-full bg-[#D0BCFF]" />
        </div>
      </div>

      {/* ── Tab content ── */}
      {tab === 0 && (
        <div className="pb-6">
          {commentsLoading ? (
            <p className="py-12 text-center text-[13px] text-[#938F99]">
              Memuat komentar...
            </p>
          ) : comments.length === 0 ? (
            <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-[#938F99]">
              Belum ada komentar.
              <br />
              Tulis komentar pertamamu di halaman detail anime.
            </p>
          ) : (
            comments.map((c) => <CommentRow key={c.id} c={c} />)
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="px-4 pb-6 pt-4">
          {favorites.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] leading-relaxed text-[#938F99]">
              Belum ada favorit.
              <br />
              Tekan tombol hati di halaman anime, lalu muncul di sini.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                {favorites.map((fav) => (
                  <FavCard
                    key={fav.slug}
                    item={fav}
                    onRemove={handleRemoveFav}
                  />
                ))}
              </div>
              <Link
                to="/library"
                className="mt-5 flex h-10 w-full items-center justify-center rounded-full border border-[#49454F] text-[13px] font-semibold text-[#D0BCFF] outline-none transition-colors hover:bg-[#D0BCFF]/[0.06] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
              >
                Buka Library
              </Link>
            </>
          )}
        </div>
      )}

      {/* Spacer bawah (nav sudah disembunyikan) */}
      <div className="h-[calc(24px+env(safe-area-inset-bottom,0px))]" />

      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleImage(e.target.files?.[0], "avatar");
          e.target.value = "";
        }}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleImage(e.target.files?.[0], "banner");
          e.target.value = "";
        }}
      />

      {/* Edit bottom sheet */}
      {editing && (
        <EditSheet
          profile={profile}
          userRole={user.role}
          busyAvatar={busyImage === "avatar"}
          busyBanner={busyImage === "banner"}
          frameId={frameId}
          fontId={fontId}
          onPickAvatar={() => pickImage("avatar")}
          onPickBanner={() => pickImage("banner")}
          onFrameChange={handleFrameChange}
          onFontChange={handleFontChange}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}