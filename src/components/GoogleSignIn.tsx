import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCRIPT_ID = "google-gsi-client";

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (opts: {
        client_id: string;
        callback: (res: { credential: string }) => void;
      }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

function loadScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gagal memuat Google")));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gagal memuat Google"));
    document.head.appendChild(script);
  });
}

export default function GoogleSignIn({ className }: { className?: string }) {
  const { login } = useAuth();
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    void loadScript()
      .then(() => {
        const el = holder.current;
        if (cancelled || !window.google || !el) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => {
            void login(res.credential);
          },
        });
        el.innerHTML = "";
        window.google.accounts.id.renderButton(el, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          width: Math.min(el.parentElement?.offsetWidth || 360, 400),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [login]);

  if (!CLIENT_ID) {
    return (
      <button
        type="button"
        disabled
        title="Set VITE_GOOGLE_CLIENT_ID untuk mengaktifkan"
        className={className}
      >
        Masuk dengan Google
      </button>
    );
  }

  return (
    <div className="group relative w-full">
      <div aria-hidden="true" className={`${className ?? ""} transition-colors group-hover:bg-[#2B2930]`}>
        Masuk dengan Google
      </div>
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-0">
        <div ref={holder} />
      </div>
    </div>
  );
}
