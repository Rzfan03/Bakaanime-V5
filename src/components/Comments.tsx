import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BadgeCheck, Loader2, Send } from "lucide-react";
import { backend } from "../lib/api/backend";
import type { BackendComment } from "../lib/api/backend";
import { useAuth } from "../lib/auth";

function errMessage(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "unauthorized") return "Sesi berakhir. Silakan masuk lagi.";
  return msg || fallback;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Avatar({ name, src }: { name: string; src: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4F378B] to-[#7965AF] text-xs font-bold text-[#EADDFF]">
      {initials || "?"}
    </div>
  );
}

function CommentRow({ comment }: { comment: BackendComment }) {
  return (
    <li className="flex gap-3 py-3">
      <Avatar name={comment.author_name} src={comment.author_avatar} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="flex min-w-0 items-center gap-1 text-sm font-medium text-[#E6E0E9]">
            <span className="truncate">{comment.author_name}</span>
            {comment.author_verified && (
              <BadgeCheck size={15} className="shrink-0 text-[#1D9BF0]" aria-label="Terverifikasi" />
            )}
          </p>
          <span className="shrink-0 text-[11px] text-[#938F99]">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p className="mt-0.5 whitespace-pre-line break-words text-sm leading-5 text-[#CAC4D0]">
          {comment.body}
        </p>
      </div>
    </li>
  );
}

export default function Comments({ animeSlug }: { animeSlug: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<BackendComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [stale, setStale] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    backend
      .getComments(animeSlug)
      .then((res) => {
        if (!cancelled) setComments(res.comments);
      })
      .catch((e) => {
        if (!cancelled) setError(errMessage(e, "Gagal memuat komentar."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [animeSlug]);

  const submit = async () => {
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);
    setStale("");
    try {
      const res = await backend.postComment(animeSlug, value);
      setComments((prev) => [res.comment, ...prev]);
      setText("");
    } catch (e) {
      setStale(errMessage(e, "Gagal mengirim komentar."));
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className="mt-8 border-t border-[#49454F]/60 pt-5">
      <h2 className="px-4 pb-2 text-[22px] font-medium leading-7">Komentar</h2>

      {user ? (
        <div className="px-4">
          <div className="flex gap-3">
            <Avatar name={user.name} src={user.avatar} />
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Tulis komentar…"
                className="w-full resize-none rounded-2xl bg-[#2B2930] px-4 py-3 text-sm leading-5 text-[#E6E0E9] placeholder:text-[#49454F] outline-none focus:ring-2 focus:ring-[#D0BCFF]"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-[#49454F]">{text.length}/1000</span>
                <button
                  onClick={submit}
                  disabled={!text.trim() || posting}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-[#D0BCFF] px-4 text-sm font-semibold text-[#381E72] outline-none transition-colors hover:bg-[#DCCBFF] focus-visible:ring-2 focus-visible:ring-[#EADDFF] disabled:opacity-40"
                >
                  {posting ? (
                    <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Send size={15} />
                  )}
                  Kirim
                </button>
              </div>
              {stale && <p className="mt-1 text-[12px] text-[#F2B8B8]">{stale}</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-4 rounded-2xl bg-[#1C1B1F] px-4 py-3 text-[13px] leading-5 text-[#CAC4D0]">
          <Link to="/login" className="font-semibold text-[#D0BCFF] hover:underline">
            Masuk
          </Link>{" "}
          untuk ikut berkomentar.
        </div>
      )}

      <div className="mt-2 px-4">
        {loading ? (
          <div className="space-y-4 py-4" aria-hidden="true">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#2B2930] motion-reduce:animate-none" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-[#2B2930] motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-[#CAC4D0]">{error}</p>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#CAC4D0]">
            Belum ada komentar. Jadi yang pertama!
          </p>
        ) : (
          <ul className="divide-y divide-[#2B2930]">
            {comments.map((c) => (
              <CommentRow key={c.id} comment={c} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
