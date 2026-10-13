import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/react";
import { useAuth } from "../lib/auth";

const row =
  "flex h-14 w-full items-center bg-[color:var(--m3-surface-low)] text-[15px] font-medium text-[#E6E0E9] outline-none transition-colors hover:bg-[color:var(--m3-surface-high)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D0BCFF]";

export default function Login() {
  const { user, loading: authLoading, loginWithKey, exchange, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const clerk = useClerk();
  const { isSignedIn } = useClerkAuth();

  const [panel, setPanel] = useState<"none" | "key">("none");
  const [key, setKey] = useState("");
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [busyKey, setBusyKey] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [user, authLoading, navigate, from]);

  // Clerk sudah sign in tapi JWT kita belum ada → exchange otomatis
  // Kalau exchange gagal → logout Clerk biar bersih
  useEffect(() => {
    if (isSignedIn && !authLoading && !user) {
      exchange().catch(() => {
        // Exchange gagal (mis. stale session) → paksa logout Clerk
        logout();
      });
    }
  }, [isSignedIn, authLoading, user, exchange, logout]);

  const google = async () => {
    if (busyGoogle || !clerk.loaded || !clerk.client) return;
    setBusyGoogle(true);
    setError("");
    try {
      // Kalau sudah signed in di Clerk → exchange dulu, tidak perlu OAuth lagi
      if (isSignedIn) {
        await exchange();
        return;
      }
      // Sign out dulu kalau ada stale session yang tidak terdeteksi isSignedIn
      await clerk.signOut({ redirectUrl: undefined });
      await clerk.client.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/sso-callback",
        redirectUrlComplete: from,
      });
    } catch {
      setError("Telah Terjadi Sebuah Kesalahan.");
      setBusyGoogle(false);
    }
  };

  const submitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = key.trim();
    if (!value || busyKey) return;
    setBusyKey(true);
    setError("");
    try {
      await loginWithKey(value);
    } catch {
      setError("Telah Terjadi Sebuah Kesalahan.");
    } finally {
      setBusyKey(false);
    }
  };

  const openPanel = (p: "key") => {
    setPanel((cur) => (cur === p ? "none" : p));
    setError("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--m3-surface)] text-[#E6E0E9]">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <h1 className="text-left text-[28px] font-bold leading-tight">Masuk</h1>
        <p className="mt-2 text-left text-[14px] leading-6 text-[#938F99]">
          Masuk untuk menyinkronkan profil, favorit, dan komentar kamu.
        </p>

        <div className="mt-8 overflow-hidden rounded-3xl">
          <button
            type="button"
            onClick={google}
            disabled={busyGoogle || !clerk.loaded || !clerk.client}
            className={`${row} justify-center gap-3 disabled:opacity-60`}
          >
            {busyGoogle ? (
              <Loader2 size={18} className="animate-spin motion-reduce:animate-none" />
            ) : null}
            Masuk dengan Google
          </button>

          <div className="h-px bg-[color:var(--m3-surface-high)]" />

          {panel === "key" ? (
            <form
              onSubmit={submitKey}
              className="flex h-14 items-center gap-2 bg-[color:var(--m3-surface-low)] px-4 transition-colors focus-within:bg-[color:var(--m3-surface-high)]"
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
                disabled={!key.trim() || busyKey}
                aria-label="Masuk"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D0BCFF] text-[#381E72] outline-none transition-colors hover:bg-[#DCCBFF] focus-visible:ring-2 focus-visible:ring-[#EADDFF] disabled:opacity-40"
              >
                {busyKey ? (
                  <Loader2 size={17} className="animate-spin motion-reduce:animate-none" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => openPanel("key")} className={`${row} justify-center`}>
              Masuk dengan Key
            </button>
          )}
        </div>

        {error && <p className="mt-3 text-left text-[13px] text-[#F2B8B8]">{error}</p>}

        {/* Tombol reset muncul kalau stuck dengan stale Clerk session */}
        {isSignedIn && !user && (
          <button
            type="button"
            onClick={logout}
            className="mt-4 text-[12px] text-[#49454F] underline hover:text-[#938F99]"
          >
            Reset session
          </button>
        )}
      </main>
    </div>
  );
}
