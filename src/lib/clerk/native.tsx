import { useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import { Clerk } from "@clerk/clerk-js";
import { InternalClerkProvider } from "@clerk/react/internal";
import { Preferences } from "@capacitor/preferences";

// Clerk can't CNAME to *.vercel.app, so FAPI is proxied through the web domain
// (see api/clerk-proxy.ts). The FAPI host from pk_live doesn't resolve → native
// must hit this absolute proxy.
export const NATIVE_PROXY_URL = "https://bakaanime-v5.vercel.app/__clerk";

// __clerk_client_jwt identifies the Clerk "client" across requests without cookies
// (cookies are blocked: vercel.app public-suffix + CapacitorHttp doesn't persist cookies).
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
  // pk_test talks directly to clerk.accounts.dev (host resolves); pk_live must go
  // through the proxy because its FAPI host has no DNS.
  const isProd = publishableKey.startsWith("pk_live_");
  const clerk = new Clerk(publishableKey, isProd ? { proxyUrl: NATIVE_PROXY_URL } : undefined);

  // Native Clerk mode: `?_is_native=1` + Authorization bearer replaces cookies.
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

// InternalClerkProvider takes a ready-made Clerk instance via the `Clerk` prop.
// Its public typing is strict → cast loosely (same pattern used by @clerk/expo).
const Inner = InternalClerkProvider as unknown as ComponentType<
  Record<string, unknown> & { children?: ReactNode }
>;

export function NativeClerkProvider({ children }: { children: ReactNode }) {
  const clerk = useMemo(() => getNativeClerk(PK), []);
  return (
    <Inner
      Clerk={clerk}
      publishableKey={PK}
      // Disable the cookie/dev-browser flow; use bearer + x-mobile.
      standardBrowser={false}
      experimental={{ runtimeEnvironment: "headless" }}
    >
      {children}
    </Inner>
  );
}
