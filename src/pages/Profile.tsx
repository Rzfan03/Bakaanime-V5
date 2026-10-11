import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { BadgeCheck, Camera, Check, Loader2, LogOut, Pencil, Star, X } from "lucide-react";
import { fileToResizedDataUrl } from "../lib/image";
import { isNative, pickNativeImage } from "../lib/picker";
import { useAuth } from "../lib/auth";
import { backend } from "../lib/api/backend";
import type { FavoriteItem, LibraryItem, UserProfile } from "../lib/storage";

const detailPath = (slug: string) => `/detail/${encodeURIComponent(slug)}`;

/* ── Avatar placeholder ──────────────────────────────────────── */
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

/* ── Edit profile modal ──────────────────────────────────────── */
function EditModal({
  profile,
  onSave,
  onClose,
}: {
  profile: UserProfile;
  onSave: (data: Partial<UserProfile>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), bio: bio.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-[#1C1B1F] pb-[env(safe-area-inset-bottom)] sm:rounded-3xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#2B2930] px-4 py-3">
          <button
            onClick={onClose}
            aria-label="Batal"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#CAC4D0] outline-none hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
          >
            <X size={20} />
          </button>
          <h2 className="text-[15px] font-semibold text-[#E6E0E9]">Edit profil</h2>
          <button
            onClick={handleSave}
            className="flex h-9 items-center rounded-full bg-[#D0BCFF] px-4 text-sm font-semibold text-[#381E72] outline-none transition-colors hover:bg-[#DCCBFF] focus-visible:ring-2 focus-visible:ring-[#EADDFF] disabled:opacity-40"
          >
            Simpan
          </button>
        </div>

        <div className="space-y-4 px-4 py-5">
          {/* name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#938F99]">
              Nama
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Nama kamu"
              className="h-12 w-full rounded-2xl bg-[#2B2930] px-4 text-[15px] text-[#E6E0E9] placeholder:text-[#49454F] outline-none focus:ring-2 focus:ring-[#D0BCFF]"
            />
          </div>
          {/* bio */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#938F99]">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="Ceritakan sedikit tentang dirimu…"
              className="w-full resize-none rounded-2xl bg-[#2B2930] px-4 py-3 text-[15px] leading-relaxed text-[#E6E0E9] placeholder:text-[#49454F] outline-none focus:ring-2 focus:ring-[#D0BCFF]"
            />
            <p className="mt-1 text-right text-[11px] text-[#49454F]">
              {bio.length}/120
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Fav anime card ──────────────────────────────────────────── */
function FavCard({
  item,
  onRemove,
}: {
  item: FavoriteItem;
  onRemove: (slug: string) => void;
}) {
  return (
    <div className="group relative">
      <Link
        to={detailPath(item.slug)}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-[#D0BCFF] focus-visible:rounded-xl"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#2B2930] shadow-lg">
          <img
            src={item.poster}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0D0B12]/90 to-transparent" />
          <p className="absolute inset-x-0 bottom-0 line-clamp-2 px-2 pb-2 text-[11px] font-medium leading-4 text-[#E6E0E9]">
            {item.title}
          </p>
        </div>
      </Link>
      <button
        onClick={() => onRemove(item.slug)}
        aria-label="Hapus dari favorit"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#141218]/80 text-[#CAC4D0] opacity-0 backdrop-blur-sm outline-none transition-all group-hover:opacity-100 hover:text-[#F2B8B8] focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
      >
        <X size={13} />
      </button>
    </div>
  );
}

/* ── Empty fav slot ──────────────────────────────────────────── */
function EmptyFavSlot({ index, libraryItems, onPick }: {
  index: number;
  libraryItems: LibraryItem[];
  onPick: (item: LibraryItem) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#49454F] text-[#49454F] outline-none transition-colors hover:border-[#D0BCFF]/40 hover:text-[#D0BCFF]/60 focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
        aria-label={`Pilih anime favorit ke-${index + 1}`}
      >
        <Star size={20} strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Tambah</span>
      </button>

      {/* picker modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-t-3xl bg-[#1C1B1F] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between border-b border-[#2B2930] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-[#E6E0E9]">Pilih dari Library</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#CAC4D0] outline-none hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
              >
                <X size={20} />
              </button>
            </div>

            {libraryItems.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#938F99]">
                Library masih kosong. Tambahkan anime dulu.
              </p>
            ) : (
              <ul className="max-h-80 overflow-y-auto py-2">
                {libraryItems.map((lib) => (
                  <li key={lib.slug}>
                    <button
                      onClick={() => { onPick(lib); setOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-[#D0BCFF]/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D0BCFF]"
                    >
                      <div className="aspect-[2/3] w-10 shrink-0 overflow-hidden rounded-lg bg-[#2B2930]">
                        <img
                          src={lib.poster}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span className="line-clamp-2 text-[14px] font-medium text-[#E6E0E9]">
                        {lib.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function Profile() {
  const { user, logout, setUser } = useAuth();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyImage, setBusyImage] = useState<"avatar" | "banner" | null>(null);
  const [imageError, setImageError] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void Promise.all([backend.getFavorites(), backend.getLibrary()])
      .then(([fav, lib]) => {
        if (cancelled) return;
        setFavorites(fav.items);
        setLibrary(lib.items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  // sudah dijaga RequireAuth, tapi jaga-jaga saat transisi logout
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

  const handleSave = async (data: Partial<UserProfile>) => {
    try {
      const res = await backend.updateProfile(data);
      setUser(res.user);
      flashSaved();
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  };

  const handleImage = async (
    file: File | undefined,
    kind: "avatar" | "banner",
  ) => {
    if (!file) return;
    setImageError("");
    setBusyImage(kind);
    try {
      const dataUrl = await fileToResizedDataUrl(file, kind === "avatar" ? 300 : 1000);
      await handleSave(kind === "avatar" ? { avatar: dataUrl } : { banner: dataUrl });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusyImage(null);
    }
  };

  // native: pakai kamera/galeri Android; web: buka <input type=file>
  const pickImage = (kind: "avatar" | "banner") => {
    if (isNative()) {
      void handleNativeImage(kind);
    } else {
      (kind === "avatar" ? avatarInputRef : bannerInputRef).current?.click();
    }
  };

  const handleNativeImage = async (kind: "avatar" | "banner") => {
    setImageError("");
    setBusyImage(kind);
    try {
      const dataUrl = await pickNativeImage(kind === "avatar" ? 300 : 1000);
      if (!dataUrl) return;
      await handleSave(kind === "avatar" ? { avatar: dataUrl } : { banner: dataUrl });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Gagal mengambil gambar.");
    } finally {
      setBusyImage(null);
    }
  };

  const persistFavorites = (next: FavoriteItem[]) => {
    setFavorites(next);
    void backend.putFavorites(next).catch(() => {});
  };

  const handleRemoveFav = (slug: string) => {
    persistFavorites(favorites.filter((f) => f.slug !== slug));
  };

  const handlePickFav = (item: LibraryItem) => {
    if (favorites.some((f) => f.slug === item.slug)) return;
    persistFavorites([...favorites, item].slice(0, 3));
  };

  // library items not already in favorites
  const availableLibrary = library.filter(
    (l) => !favorites.some((f) => f.slug === l.slug)
  );

  const BANNER_GRADIENT = "bg-gradient-to-br from-[#1A0533] via-[#2D1B69] to-[#0D0B12]";

  return (
    <div className="min-h-screen bg-[#141218] text-[#E6E0E9]">
      {/* ── Banner ── */}
      <div className={`relative h-36 w-full ${BANNER_GRADIENT}`}>
        {profile.banner && (
          <img
            src={profile.banner}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
        {/* subtle purple grain overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#141218]/60" />
        <button
          onClick={() => pickImage("banner")}
          disabled={busyImage === "banner"}
          aria-label="Ubah banner"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#141218]/70 text-[#E6E0E9] backdrop-blur-sm outline-none transition-colors hover:bg-[#141218] focus-visible:ring-2 focus-visible:ring-[#D0BCFF] disabled:opacity-60"
        >
          {busyImage === "banner" ? (
            <Loader2 size={17} className="animate-spin motion-reduce:animate-none" />
          ) : (
            <Camera size={17} />
          )}
        </button>
      </div>

      {/* ── Avatar row ── */}
      <div className="relative px-4">
        <div className="flex items-end justify-between">
          {/* avatar */}
          <button
          onClick={() => pickImage("avatar")}
          disabled={busyImage === "avatar"}
          aria-label="Ubah foto profil"
            className="group relative -mt-12 h-24 w-24 overflow-hidden rounded-full border-4 border-[#141218] bg-[#2B2930] shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-[#D0BCFF] disabled:opacity-80"
          >
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <AvatarPlaceholder name={profile.name} />
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
              {busyImage === "avatar" ? (
                <Loader2 size={22} className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Camera size={22} />
              )}
            </span>
          </button>

          {/* actions */}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={logout}
              aria-label="Keluar"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#938F99] text-[#E6E0E9] outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
            >
              <LogOut size={15} />
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-[#938F99] px-4 text-sm font-semibold text-[#E6E0E9] outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
            >
              <Pencil size={14} />
              Edit profil
            </button>
          </div>
        </div>

        {/* name + bio */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold leading-tight text-[#E6E0E9]">
              {profile.name}
            </h1>
            {user.verified && (
              <BadgeCheck
                size={19}
                className="shrink-0 text-[#1D9BF0]"
                aria-label="Akun terverifikasi"
              />
            )}
            {saved && (
              <span className="flex items-center gap-1 rounded-full bg-[#4F378B]/60 px-2 py-0.5 text-[11px] font-medium text-[#EADDFF]">
                <Check size={11} />
                Tersimpan
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-[#938F99]">{user.email}</p>
          {profile.bio ? (
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#CAC4D0]">
              {profile.bio}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-[#49454F]">
              Belum ada bio. Tap "Edit profil" untuk menambahkan.
            </p>
          )}
          {imageError && (
            <p className="mt-2 text-[12px] text-[#F2B8B8]">{imageError}</p>
          )}
        </div>

        {/* stats */}
        <div className="mt-4 flex gap-5 border-b border-[#2B2930] pb-4">
          <div>
            <p className="text-[17px] font-bold text-[#E6E0E9]">{library.length}</p>
            <p className="text-[12px] text-[#938F99]">Library</p>
          </div>
          <div>
            <p className="text-[17px] font-bold text-[#E6E0E9]">{favorites.length}</p>
            <p className="text-[12px] text-[#938F99]">Favorit</p>
          </div>
        </div>
      </div>

      {/* ── 3 Anime Favorit ── */}
      <section className="px-4 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <Star size={16} className="text-[#D0BCFF]" />
          <h2 className="text-[15px] font-semibold text-[#E6E0E9]">3 Anime Favorit</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* render existing favorites */}
          {favorites.map((fav) => (
            <FavCard key={fav.slug} item={fav} onRemove={handleRemoveFav} />
          ))}

          {/* empty slots */}
          {Array.from({ length: Math.max(0, 3 - favorites.length) }).map((_, i) => (
            <EmptyFavSlot
              key={`empty-${i}`}
              index={favorites.length + i}
              libraryItems={availableLibrary}
              onPick={handlePickFav}
            />
          ))}
        </div>

        {favorites.length === 0 && (
          <p className="mt-3 text-center text-[12px] text-[#938F99]">
            Pilih hingga 3 anime favorit dari library kamu.
          </p>
        )}
      </section>

      {/* ── Library shortcut ── */}
      <section className="mt-6 px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#E6E0E9]">Library</h2>
          <Link
            to="/library"
            className="text-[13px] font-medium text-[#D0BCFF] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
          >
            Lihat semua
          </Link>
        </div>

        {library.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#938F99]">
            Library kosong.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {library.slice(0, 10).map((item) => (
              <Link
                key={item.slug}
                to={detailPath(item.slug)}
                className="group block w-20 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#D0BCFF] focus-visible:rounded-xl"
              >
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-[#2B2930]">
                  <img
                    src={item.poster}
                    alt=""
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                  />
                </div>
                <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-3.5 text-[#CAC4D0]">
                  {item.title}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="h-32" />

      {/* hidden image pickers */}
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

      {/* ── Edit modal ── */}
      {editing && (
        <EditModal
          profile={profile}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
