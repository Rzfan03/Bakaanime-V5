import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { BadgeCheck } from "lucide-react";
import { backend } from "../lib/api/backend";
import type { BackendComment } from "../lib/api/backend";
import { useAuth } from "../lib/auth";
import { fontStyle } from "../pages/Profile";

/* ─────────────────────────────────────────────
   Material 3 dark — token yang dipakai
   surface                #141218
   surface-container-low  #1D1B20   on-surface          #E6E0E9
   surface-container      #211F26   on-surface-variant  #CAC4D0
   outline                #938F99   outline-variant     #49454F
   primary                #D0BCFF   on-primary          #381E72
   primary-container      #4F378B   on-primary-cont.    #EADDFF
   secondary-container    #4A4458   on-secondary-cont.  #E8DEF8
   error                  #F2B8B5   error-container     #8C1D18
   ───────────────────────────────────────────── */

/* Class statis (aman untuk Tailwind JIT). Feedback sentuh pakai active:, bukan hover. */
const FILLED_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-full bg-[#D0BCFF] px-6 text-[14px] font-medium text-[#381E72] outline-none transition-[filter] active:brightness-90 disabled:bg-[#E6E0E9]/[0.12] disabled:text-[#E6E0E9]/[0.38]";

const TEXT_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-full px-4 text-[14px] font-medium text-[#D0BCFF] outline-none transition-colors active:bg-[#D0BCFF]/[0.12]";

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */
function timeAgo(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} hr lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─────────────────────────────────────────────
   Avatar
   ───────────────────────────────────────────── */
function CommentAvatar({
  name,
  src,
  size = 40,
}: {
  name: string;
  src: string | null;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  if (src && !err) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setErr(true)}
        className="shrink-0 rounded-full bg-[#2B2930] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-[#4F378B] font-medium text-[#EADDFF]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Verified badge
   ───────────────────────────────────────────── */
function VerifiedBadge({ role }: { role: string }) {
  const fill = role === "dev" ? "#D0BCFF" : role === "admin" ? "#80BCBD" : "#60A5FA";
  return (
    <span className="inline-flex h-5 shrink-0 items-center">
      <BadgeCheck size={17} fill={fill} stroke="#141218" strokeWidth={2} aria-hidden="true" />
      <span className="sr-only">Terverifikasi</span>
    </span>
  );
}

/* ─────────────────────────────────────────────
   Role chip
   ───────────────────────────────────────────── */
function RoleChip({ role }: { role: string }) {
  if (role === "dev")
    return (
      <span className="inline-flex h-5 items-center rounded-md bg-[#4F378B] px-1.5 text-[11px] font-medium leading-none tracking-[0.5px] text-[#EADDFF]">
        DEV
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex h-5 items-center rounded-md bg-[#004F50] px-1.5 text-[11px] font-medium leading-none tracking-[0.5px] text-[#A8F0F1]">
        ADMIN
      </span>
    );
  return null;
}

function cardTone(role: string): string {
  if (role === "dev") return "bg-[#4F378B]/[0.22]";
  if (role === "admin") return "bg-[#004F50]/[0.35]";
  return "bg-[#1D1B20]";
}

/* ─────────────────────────────────────────────
   Comment row
   Nama, badge, dan chip dikelompokkan rapat (gap-1),
   lalu waktu dipisah lebih longgar di sebelahnya.
   ───────────────────────────────────────────── */
function CommentRow({ comment }: { comment: BackendComment }) {
  const isPrivileged = comment.author_role === "dev" || comment.author_role === "admin";
  const font = isPrivileged ? fontStyle(comment.author_font ?? "default") : {};
  const hasTags = comment.author_verified || isPrivileged;

  return (
    <li className={`flex gap-3 rounded-2xl p-4 ${cardTone(comment.author_role)}`}>
      <CommentAvatar name={comment.author_name} src={comment.author_avatar} size={40} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {/* identitas: nama + badge + chip */}
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="truncate text-[14px] font-medium leading-5 text-[#E6E0E9]"
              style={font}
            >
              {comment.author_name}
            </span>
            {hasTags && (
              <span className="flex shrink-0 items-center gap-1">
                {comment.author_verified && <VerifiedBadge role={comment.author_role} />}
                <RoleChip role={comment.author_role} />
              </span>
            )}
          </div>

          <time dateTime={comment.created_at} className="text-[12px] leading-5 text-[#938F99]">
            {timeAgo(comment.created_at)}
          </time>
        </div>

        <p className="mt-1 whitespace-pre-line break-words text-[14px] leading-5 text-[#CAC4D0]">
          {comment.body}
        </p>
      </div>
    </li>
  );
}

/* ─────────────────────────────────────────────
   Skeleton
   ───────────────────────────────────────────── */
function CommentSkeleton() {
  const bar = "animate-pulse rounded-full bg-[#2B2930] motion-reduce:animate-none";
  return (
    <div className="flex gap-3 rounded-2xl bg-[#1D1B20] p-4">
      <div className={`h-10 w-10 shrink-0 ${bar}`} />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className={`h-3.5 w-28 ${bar}`} />
        <div className={`h-3.5 w-3/4 ${bar}`} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────── */
const VISIBLE_LIMIT = 8;
const MAX_LENGTH = 1000;
const WARN_AT = 900;

export default function Comments({ animeSlug }: { animeSlug: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<BackendComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [postErr, setPostErr] = useState("");
  const [showAll, setShowAll] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setShowAll(false);
    backend
      .getComments(animeSlug)
      .then((res) => {
        if (!cancelled) setComments(res.comments);
      })
      .catch(() => {
        if (!cancelled) setError("Telah Terjadi Sebuah Kesalahan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [animeSlug]);

  useEffect(() => load(), [load]);

  /* auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const submit = async () => {
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);
    setPostErr("");
    try {
      const res = await backend.postComment(animeSlug, value);
      setComments((prev) => [res.comment, ...prev]);
      setText("");
    } catch {
      setPostErr("Telah Terjadi Sebuah Kesalahan.");
    } finally {
      setPosting(false);
    }
  };

  const count = comments.length;
  const shown = showAll ? comments : comments.slice(0, VISIBLE_LIMIT);
  const hiddenCount = count - shown.length;
  const canSend = !!text.trim() && !posting;

  return (
    <section className="pb-6" aria-labelledby="comments-title">
      {/* ── header ── */}
      <div className="flex items-center gap-3 px-4 pb-4 pt-6">
        <h2 id="comments-title" className="text-[22px] font-normal leading-7 text-[#E6E0E9]">
          Komentar
        </h2>
        {count > 0 && (
          <span className="rounded-full bg-[#4A4458] px-2.5 py-0.5 text-[12px] font-medium text-[#E8DEF8]">
            {count}
          </span>
        )}
      </div>

      {/* ── kolom tulis ── */}
      {user ? (
        <div className="mx-4 mb-5 flex gap-3">
          <CommentAvatar name={user.name} src={user.avatar} size={40} />

          <div className="min-w-0 flex-1 rounded-3xl bg-[#211F26] px-4 pb-3 pt-3.5 ring-1 ring-inset ring-[#49454F] focus-within:ring-2 focus-within:ring-[#D0BCFF]">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_LENGTH}
              rows={1}
              placeholder="Tulis komentar..."
              aria-label="Tulis komentar"
              className="block min-h-6 w-full resize-none overflow-hidden bg-transparent text-[16px] leading-6 text-[#E6E0E9] outline-none placeholder:text-[#938F99]"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <span
                className={`text-[12px] ${
                  text.length >= WARN_AT ? "text-[#F2B8B5]" : "text-[#938F99]"
                } ${text.length === 0 ? "opacity-0" : "opacity-100"}`}
              >
                {text.length}/{MAX_LENGTH}
              </span>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={!canSend}
                className={`${FILLED_BUTTON} !px-5`}
              >
                {posting ? "Mengirim..." : "Kirim"}
              </button>
            </div>

            {postErr && (
              <p role="alert" className="mt-3 text-[13px] leading-5 text-[#F2B8B5]">
                {postErr}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mx-4 mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[#211F26] py-3 pl-4 pr-3">
          <p className="text-[14px] leading-5 text-[#CAC4D0]">Masuk untuk ikut berkomentar.</p>
          <Link to="/login" className={FILLED_BUTTON}>
            Masuk
          </Link>
        </div>
      )}

      {/* ── daftar ── */}
      {loading ? (
        <div role="status" aria-busy="true" aria-label="Memuat komentar" className="space-y-2 px-4">
          <CommentSkeleton />
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      ) : error ? (
        <div role="alert" className="mx-4 flex items-center justify-between gap-3 py-2">
          <p className="text-[14px] leading-5 text-[#F2B8B5]">{error}</p>
          <button type="button" onClick={load} className={TEXT_BUTTON}>
            Coba lagi
          </button>
        </div>
      ) : count === 0 ? (
        <p className="px-4 py-8 text-center text-[14px] leading-5 text-[#938F99]">
          Belum ada komentar. Jadilah yang pertama menulis.
        </p>
      ) : (
        <>
          <ul className="space-y-2 px-4">
            {shown.map((c) => (
              <CommentRow key={c.id} comment={c} />
            ))}
          </ul>

          {hiddenCount > 0 && (
            <div className="mt-3 flex justify-center">
              <button type="button" onClick={() => setShowAll(true)} className={TEXT_BUTTON}>
                Lihat {hiddenCount} komentar lainnya
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}