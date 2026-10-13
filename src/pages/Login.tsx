import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/react";
import { useSignIn, useSignUp } from "@clerk/react/legacy";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../lib/auth";
import { startNativeSSO } from "../lib/clerk/sso";

const row =
  "flex h-14 w-full items-center bg-[color:var(--m3-surface-low)] text-[15px] font-medium text-m3-on-surface outline-none transition-colors hover:bg-[color:var(--m3-surface-high)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-m3-primary";

// Show the real Clerk message (temporary, to debug the APK without console access)
function errText(e: unknown): string {
  const a = e as { errors?: { code?: string; message?: string }[]; message?: string };
  const f = a?.errors?.[0];
  if (f?.message) return f.code ? `${f.message} (${f.code})` : f.message;
  return a?.message ?? "Telah Terjadi Sebuah Kesalahan.";
}

export default function Login() {
  const { user, loading: authLoading, loginWithKey, exchange, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const clerk = useClerk();
  const { isSignedIn } = useClerkAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [panel, setPanel] = useState<"none" | "key">("none");
  const [key, setKey] = useState("");
  const [busyGoogle, setBusyGoogle] = useState(false);
  const [busyKey, setBusyKey] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [user, authLoading, navigate, from]);

  // Clerk is signed in but our JWT is missing → exchange automatically.
  // If the exchange fails, log out of Clerk to reset state.
  useEffect(() => {
    if (isSignedIn && !authLoading && !user) {
      exchange().catch((e) => {
        // Exchange failed (e.g. stale session) → force a Clerk logout
        console.error("[exchange]", e);
        logout();
      });
    }
  }, [isSignedIn, authLoading, user, exchange, logout]);

  const google = async () => {
    if (busyGoogle || !clerk.loaded || !clerk.client) return;
    setBusyGoogle(true);
    setError("");
    try {
      // Already signed in to Clerk → exchange first, no need for OAuth again
      if (isSignedIn) {
        await exchange();
        return;
      }
      // Sign out first in case of a stale session not caught by isSignedIn
      await clerk.signOut({ redirectUrl: undefined });
      if (Capacitor.isNativePlatform()) {
        // APK: OAuth via system browser + deep link (cookies don't work natively).
        if (!signIn || !signUp) {
          setBusyGoogle(false);
          return;
        }
        const sessionId = await startNativeSSO({ signIn, signUp, setActive: clerk.setActive });
        if (!sessionId) {
          setBusyGoogle(false);
          return;
        }
        await exchange();
        return;
      }
      await clerk.client.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/sso-callback",
        redirectUrlComplete: from,
      });
    } catch (e) {
      console.error("[login google]", e);
      // Details only on APK (to debug without console); web stays generic
      setError(Capacitor.isNativePlatform() ? errText(e) : "Telah Terjadi Sebuah Kesalahan.");
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
    <div className="flex min-h-screen flex-col bg-[color:var(--m3-surface)] text-m3-on-surface">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <h1 className="text-left text-[28px] font-bold leading-tight">Masuk</h1>
        <p className="mt-2 text-left text-[14px] leading-6 text-m3-outline">
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
                className="h-full flex-1 bg-transparent text-[15px] text-m3-on-surface outline-none placeholder:text-m3-outline-variant"
              />
              <button
                type="submit"
                disabled={!key.trim() || busyKey}
                aria-label="Masuk"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-m3-primary text-m3-on-primary outline-none transition-colors hover:bg-m3-primary-hover focus-visible:ring-2 focus-visible:ring-m3-on-primary-container disabled:opacity-40"
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

        {error && <p className="mt-3 text-left text-[13px] text-m3-error">{error}</p>}

        {/* Reset button shown when stuck with a stale Clerk session */}
        {isSignedIn && !user && (
          <button
            type="button"
            onClick={logout}
            className="mt-4 text-[12px] text-m3-outline-variant underline hover:text-m3-outline"
          >
            Reset session
          </button>
        )}
      </main>
    </div>
  );
}
