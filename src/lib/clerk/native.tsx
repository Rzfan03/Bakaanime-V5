import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import { Clerk } from "@clerk/clerk-js";
import { InternalClerkProvider } from "@clerk/react/internal";
import { Preferences } from "@capacitor/preferences";

// Clerk tak bisa CNAME ke *.vercel.app, jadi FAPI di-proxy lewat domain web
// (lihat api/clerk-proxy.ts). Host FAPI dari pk_live tak resolve → native wajib
// menembak proxy absolut ini.
export const NATIVE_PROXY_URL = "https://bakaanime-v5.vercel.app/__clerk";

// __clerk_client_jwt mengidentifikasi "client" Clerk lintas request tanpa cookie
// (cookie diblokir: vercel.app public-suffix + CapacitorHttp tak simpan cookie).
const CLIENT_JWT_KEY = "__clerk_client_jwt";

const PK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const tokenCache = {
  async getToken(key: string) {
    return (await Preferences.get({ key })).value;
  },
  async saveToken(key: string, value: string) {
    await Preferences.set({ key, value });
  },
  async clearToken(key: string) {
    await Preferences.remove({ key });
  },
};

type FapiReq = RequestInit & { url?: URL };

let cached: { key: string; clerk: Clerk } | null = null;

function getNativeClerk(publishableKey: string): Clerk {
  if (cached && cached.key === publishableKey) return cached.clerk;
  // pk_test bicara langsung ke clerk.accounts.dev (host resolve); pk_live wajib
  // lewat proxy karena host FAPI-nya tak punya DNS.
  const isProd = publishableKey.startsWith("pk_live_");
  const clerk = new Clerk(publishableKey, isProd ? { proxyUrl: NATIVE_PROXY_URL } : undefined);

  // Mode native Clerk: `?_is_native=1` + Authorization bearer menggantikan cookie.
  clerk.__internal_onBeforeRequest(async (req: FapiReq) => {
    req.credentials = "omit";
    req.url?.searchParams.append("_is_native", "1");
    const jwt = await tokenCache.getToken(CLIENT_JWT_KEY);
    const headers = new Headers(req.headers);
    if (jwt) headers.set("authorization", jwt);
    headers.set("x-mobile", "1");
    req.headers = headers;
  });
  clerk.__internal_onAfterResponse(async (_req: unknown, res?: Response) => {
    const auth = res?.headers.get("authorization");
    if (auth) await tokenCache.saveToken(CLIENT_JWT_KEY, auth);
  });

  cached = { key: publishableKey, clerk };
  return clerk;
}

// InternalClerkProvider terima instance Clerk yang sudah jadi via prop `Clerk`.
// Typing publiknya ketat → cast longgar (pola yang sama dipakai @clerk/expo).
const Inner = InternalClerkProvider as unknown as ComponentType<
  Record<string, unknown> & { children?: ReactNode }
>;

export function NativeClerkProvider({ children }: { children: ReactNode }) {
  const clerk = useMemo(() => getNativeClerk(PK), []);
  return (
    <Inner
      Clerk={clerk}
      publishableKey={PK}
      // Matikan alur cookie/dev-browser; pakai bearer + x-mobile.
      standardBrowser={false}
      experimental={{ runtimeEnvironment: "headless" }}
    >
      {children}
    </Inner>
  );
}
