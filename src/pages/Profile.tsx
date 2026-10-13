import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  Loader2,
  Lock,
  Heart,
} from "lucide-react";

import { fileToResizedDataUrl, looksLikeGif } from "../lib/image";
import { useAuth } from "../lib/auth";
import { backend } from "../lib/api/backend";
import type { UserComment } from "../lib/api/backend";
import { loadFavorites, removeFavorite } from "../lib/favorites";
import type { FavoriteItem, UserProfile } from "../lib/storage";
import { FONT_OPTIONS, fontStyle } from "../lib/fonts";
import type { FontId } from "../lib/fonts";
import { FramedAvatar, FRAMES, canUseFrame } from "../components/FramedAvatar";
import type { FrameId } from "../components/FramedAvatar";
import Poster from "../components/Poster";

const detailPath = (slug: string) => `/detail/${encodeURIComponent(slug)}`;

function RoleBadge({ role }: { role: string }) {
  if (role === "dev")
    return (
      <span className="inline-flex items-center rounded-md bg-m3-primary-container px-1.5 py-0.5 text-[10px] font-extrabold tracking-widest text-m3-on-primary-container">
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

function AvatarSkeleton() {
  return (
    <div
      className="animate-pulse rounded-full bg-[color:var(--m3-surface-high)]"
      style={{ width: 104, height: 104 }}
      aria-label="Memuat foto profil…"
    />
  );
}

function AvatarButton({
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
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-label="Ubah foto profil"
      className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-m3-primary disabled:opacity-80"
      style={{ width: 104, height: 104 }}
    >
      <FramedAvatar src={src} name={name} frameId={frameId} size={104} />
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {busy ? (
          <Loader2 size={22} className="animate-spin text-white" />
        ) : (
          <Camera size={22} className="text-white" />
        )}
      </span>
    </button>
  );
}

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
      <p className="mb-2 text-[12px] text-m3-on-surface-variant">Bingkai avatar</p>
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
                  ? "bg-m3-primary-container text-m3-on-primary-container"
                  : unlocked
                    ? "bg-[color:var(--m3-surface-high)] text-m3-on-surface-variant hover:bg-m3-surface-hover"
                    : "bg-[color:var(--m3-surface-high)] text-m3-outline-variant opacity-50"
              }`}
            >
              <div className="relative">
                <FramedAvatar src={avatarSrc} name={userName} frameId={frame.id} size={48} />
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Lock size={14} className="text-m3-outline" />
                  </div>
                )}
              </div>
              <span className="leading-none">{frame.label}</span>
              {!unlocked && (
                <span className="text-[10px] text-m3-outline">
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

function FontPicker({
  current,
  userName,
  onChange,
}: {
  current: FontId;
  userName: string;
  onChange: (id: FontId) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = FONT_OPTIONS.find((o) => o.id === current) ?? FONT_OPTIONS[0];

  return (
    <div className="mb-4">
      <p className="mb-2 text-[12px] text-m3-on-surface-variant">Font username</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-12 w-full items-center justify-between rounded-xl bg-[color:var(--m3-surface-high)] px-4 text-left outline-none ring-1 ring-inset ring-m3-outline-variant transition-colors hover:bg-m3-surface-hover focus-visible:ring-2 focus-visible:ring-m3-primary"
        >
          <span className="truncate text-[15px] text-m3-on-surface" style={selected.style}>
            {userName || "Username"}
          </span>
          <ChevronDown
            size={20}
            className={`shrink-0 text-m3-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <ul
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-xl bg-[color:var(--m3-surface-high)] py-1 shadow-xl ring-1 ring-m3-outline-variant"
            >
              {FONT_OPTIONS.map((opt) => {
                const active = current === opt.id;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(opt.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none transition-colors ${
                        active ? "bg-m3-primary-container/40" : "hover:bg-m3-surface-hover"
                      }`}
                    >
                      <span className="truncate text-[15px] text-m3-on-surface" style={opt.style}>
                        {userName || "Username"}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[12px] text-m3-outline">{opt.label}</span>
                        {active && <Check size={16} className="text-m3-primary" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

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
      // Font is admin/dev only (backend returns 403 for regular users), so omit it
      const canFont = userRole === "admin" || userRole === "dev";
      await onSave({
        name: name.trim(),
        bio: bio.trim(),
        ...(canFont ? { font: fontId } : {}),
      });
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
        <div className="mx-auto mt-3 mb-4 h-1 w-8 rounded-full bg-m3-outline" />

        <div className="px-5">
          <h2 className="mb-4 text-[20px] font-bold text-m3-on-surface">Edit profil</h2>

          <div className="mb-4 flex items-center gap-3">
            <FramedAvatar
              src={profile.avatar}
              name={name || profile.name}
              frameId={frameId}
              size={64}
            />
            <p
              className="min-w-0 truncate text-[17px] font-bold text-m3-on-surface"
              style={fontStyle(fontId)}
            >
              {name || "Username"}
            </p>
          </div>

          <div className="mb-1.5 flex gap-2">
            <button
              onClick={onPickAvatar}
              disabled={busyAvatar}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--m3-surface-high)] text-[13px] font-semibold text-m3-primary outline-none transition-colors hover:bg-m3-surface-hover focus-visible:ring-2 focus-visible:ring-m3-primary disabled:opacity-60"
            >
              {busyAvatar ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              Foto profil
            </button>
            <button
              onClick={onPickBanner}
              disabled={busyBanner}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--m3-surface-high)] text-[13px] font-semibold text-m3-primary outline-none transition-colors hover:bg-m3-surface-hover focus-visible:ring-2 focus-visible:ring-m3-primary disabled:opacity-60"
            >
              {busyBanner ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              Banner
            </button>
          </div>
          <p className="mb-4 text-[12px] text-m3-outline">
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

          <label className="mb-1 block text-[12px] text-m3-on-surface-variant">Nama</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Nama kamu"
            className="mb-3 w-full rounded-xl border border-m3-outline-variant bg-[color:var(--m3-surface-high)] px-3.5 py-3 text-[15px] text-m3-on-surface placeholder:text-m3-outline-variant outline-none focus:border-m3-primary"
          />

          <label className="mb-1 block text-[12px] text-m3-on-surface-variant">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Ceritakan sedikit tentang dirimu…"
            className="mb-1 w-full resize-none rounded-xl border border-m3-outline-variant bg-[color:var(--m3-surface-high)] px-3.5 py-3 text-[15px] leading-relaxed text-m3-on-surface placeholder:text-m3-outline-variant outline-none focus:border-m3-primary"
          />
          <p className="mb-4 text-right text-[11px] text-m3-outline-variant">{bio.length}/160</p>

          {error && <p className="mb-3 text-[13px] text-m3-error">{error}</p>}

          <button
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="flex h-12 w-full items-center justify-center rounded-full bg-m3-primary text-[15px] font-bold text-m3-on-primary outline-none transition-colors hover:bg-m3-primary-hover focus-visible:ring-2 focus-visible:ring-m3-on-primary-container disabled:opacity-60"
          >
            {saving ? <Loader2 size={20} className="animate-spin text-m3-on-primary" /> : "Simpan"}
          </button>
        </div>
      </div>
    </>
  );
}

function FavCard({ item, onRemove }: { item: FavoriteItem; onRemove: (slug: string) => void }) {
  return (
    <div className="group relative">
      <Link
        to={detailPath(item.slug)}
        className="block outline-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-m3-primary"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[color:var(--m3-surface-high)] shadow-lg">
          <Poster
            src={item.poster}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0D0B12]/90 to-transparent" />
          <p className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-2 text-[11px] font-semibold leading-4 text-m3-on-surface">
            {item.title}
          </p>
        </div>
      </Link>
      <button
        onClick={() => onRemove(item.slug)}
        aria-label={`Hapus ${item.title} dari favorit`}
        className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--m3-surface)]/80 text-m3-primary backdrop-blur-sm outline-none transition-colors hover:text-m3-error focus-visible:ring-2 focus-visible:ring-m3-primary"
      >
        <Heart size={15} className="fill-current" />
      </button>
    </div>
  );
}

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
      className="block border-b border-m3-outline-variant/60 px-4 py-4 outline-none transition-colors hover:bg-m3-primary/[0.05] focus-visible:bg-m3-primary/[0.05]"
    >
      <p className="line-clamp-1 text-[12px] font-semibold capitalize text-m3-primary">
        {c.anime_slug.replace(/-/g, " ")}
      </p>
      <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-snug text-m3-on-surface">{c.body}</p>
      <p className="mt-1.5 text-[12px] text-m3-outline">{timeAgo(c.created_at)}</p>
    </Link>
  );
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
  const [frameId, setFrameId] = useState<FrameId>(
    () => (user?.frame as FrameId) ?? "plain",
  );
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
    setFrameId((res.user.frame as FrameId) ?? "plain");
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
      if (await looksLikeGif(file)) {
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
    // Use a plain <input type="file"> on every platform: even in the Android
    // WebView the system file chooser returns the original file, so GIFs stay
    // animated (the Camera plugin re-encodes to a static JPEG).
    (kind === "avatar" ? avatarInputRef : bannerInputRef).current?.click();
  };

  const handleRemoveFav = (slug: string) => {
    const before = favorites;
    setFavorites((prev) => prev.filter((f) => f.slug !== slug));
    void removeFavorite(slug).catch(() => setFavorites(before));
  };

  const handleFrameChange = (id: FrameId) => {
    const prev = frameId;
    setFrameId(id);
    void backend
      .updateProfile({ frame: id })
      .then((res) => setUser(res.user))
      .catch(() => setFrameId(prev));
  };

  const handleFontChange = (id: FontId) => {
    setFontId(id);
  };

  const commentCount = comments.length;

  return (
    <div
      className="relative min-h-screen bg-[color:var(--m3-surface)] text-m3-on-surface"
      style={{ maxWidth: 480, margin: "0 auto" }}
    >
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
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-m3-primary ${
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
          <p className="text-[12px] leading-tight text-m3-on-surface-variant">
            {commentCount} komentar
          </p>
        </div>
      </header>

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

      <div className="relative z-[1] px-4">
        <div className="-mt-12 flex items-end justify-between gap-3">
          {busyImage === "avatar" ? (
            <AvatarSkeleton />
          ) : (
            <AvatarButton
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
              className="flex h-9 items-center rounded-full bg-m3-secondary-container px-4 text-[13px] font-semibold text-m3-on-secondary-container outline-none transition-colors hover:bg-m3-secondary-container-hover focus-visible:ring-2 focus-visible:ring-m3-primary"
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
                className="shrink-0 text-m3-primary"
                aria-label="Terverifikasi"
              />
            )}
            <RoleBadge role={user.role} />
            {saved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-m3-primary-container/50 px-2 py-0.5 text-[11px] font-medium text-m3-on-primary-container">
                <Check size={11} /> Tersimpan
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-[13px] text-m3-outline">{user.email}</p>
        </div>

        {profile.bio ? (
          <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-m3-on-surface-variant">
            {profile.bio}
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-m3-outline-variant">
            Belum ada bio. Tap &quot;Edit profil&quot; untuk menambahkan.
          </p>
        )}

        {imageError && (
          <p className="mt-2 text-[12px] text-m3-error">{imageError}</p>
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
              <p className="text-[20px] font-extrabold leading-none text-m3-primary">
                {value}
              </p>
              <p className="mt-1 text-[12px] text-m3-on-surface-variant">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="sticky z-10 mt-5 grid grid-cols-2 border-b border-m3-outline-variant/80 bg-[color:var(--m3-surface)]"
        style={{ top: "calc(56px + env(safe-area-inset-top, 0px))" }}
      >
        {(["Komentar", "Favorit"] as const).map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i as 0 | 1)}
            className={`relative h-11 text-[14px] font-semibold outline-none transition-colors ${
              tab === i ? "text-m3-primary" : "text-m3-outline"
            }`}
          >
            {label}
          </button>
        ))}
        <div
          className="absolute bottom-0 flex w-1/2 justify-center transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ transform: `translateX(${tab * 100}%)` }}
        >
          <div className="h-[3px] w-10 rounded-t-full bg-m3-primary" />
        </div>
      </div>

      {tab === 0 && (
        <div className="pb-6">
          {commentsLoading ? (
            <p className="py-12 text-center text-[13px] text-m3-outline">
              Memuat komentar...
            </p>
          ) : comments.length === 0 ? (
            <p className="px-6 py-12 text-center text-[13px] leading-relaxed text-m3-outline">
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
            <p className="px-4 py-12 text-center text-[13px] leading-relaxed text-m3-outline">
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
                className="mt-5 flex h-10 w-full items-center justify-center rounded-full border border-m3-outline-variant text-[13px] font-semibold text-m3-primary outline-none transition-colors hover:bg-m3-primary/[0.06] focus-visible:ring-2 focus-visible:ring-m3-primary"
              >
                Buka Library
              </Link>
            </>
          )}
        </div>
      )}

      {/* Bottom spacer (nav is hidden) */}
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
