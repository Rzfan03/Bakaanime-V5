import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";
import GoogleSignIn from "../components/GoogleSignIn";

function errMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (!msg || msg === "invalid_key") return "Key tidak valid. Coba lagi.";
  return msg;
}

export default function Login() {
  const { user, loading: authLoading, loginWithKey } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [keyMode, setKeyMode] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [user, authLoading, navigate, from]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = key.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      await loginWithKey(value);
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const row =
    "flex h-14 w-full items-center bg-[#1C1B1F] text-[15px] font-medium text-[#E6E0E9] outline-none transition-colors hover:bg-[#2B2930] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D0BCFF]";

  return (
    <div className="flex min-h-screen flex-col bg-[#141218] text-[#E6E0E9]">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <h1 className="text-left text-[28px] font-bold leading-tight">Masuk</h1>
        <p className="mt-2 text-left text-[14px] leading-6 text-[#938F99]">
          Masuk untuk menyinkronkan profil, favorit, dan komentar kamu.
        </p>

        <div className="mt-8">
          {keyMode ? (
            <form
              onSubmit={submit}
              className="flex h-14 items-center gap-2 rounded-t-3xl bg-[#1C1B1F] px-4 transition-colors focus-within:bg-[#2B2930]"
            >
              <input
                autoFocus
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                placeholder="Masukkan key"
                className="h-full flex-1 bg-transparent text-[15px] text-[#E6E0E9] outline-none placeholder:text-[#49454F]"
              />
              <button
                type="submit"
                disabled={!key.trim() || busy}
                aria-label="Masuk"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D0BCFF] text-[#381E72] outline-none transition-colors hover:bg-[#DCCBFF] focus-visible:ring-2 focus-visible:ring-[#EADDFF] disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 size={17} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setKeyMode(true)} className={`${row} justify-center rounded-t-3xl`}>
              Masuk dengan Key
            </button>
          )}

          <div className="h-px bg-[#2B2930]" />

          <GoogleSignIn className={`${row} justify-center rounded-b-3xl`} />
        </div>

        {error && <p className="mt-3 text-left text-[13px] text-[#F2B8B8]">{error}</p>}
      </main>
    </div>
  );
}
