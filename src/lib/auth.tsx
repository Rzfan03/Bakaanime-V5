import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/react";
import { backend, getToken, setToken } from "./api/backend";
import type { SessionUser } from "./api/backend";

type AuthValue = {
  user: SessionUser | null;
  loading: boolean;
  loginWithKey: (key: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  exchange: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken: getClerkToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const exchangedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const res = await backend.getMe();
      setUser(res.user);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  // Tukar sesi Clerk → JWT kita
  const exchange = useCallback(async () => {
    const token = await getClerkToken();
    if (!token) throw new Error("no_clerk_token");
    const res = await backend.loginWithClerk({
      token,
      name: clerkUser?.fullName ?? clerkUser?.username ?? undefined,
      email: clerkUser?.primaryEmailAddress?.emailAddress,
      avatar: clerkUser?.imageUrl,
    });
    setToken(res.token);
    setUser(res.user);
  }, [getClerkToken, clerkUser]);

  useEffect(() => {
    if (!clerkLoaded) return;
    let active = true;
    (async () => {
      if (isSignedIn && !clerkUser) return; // tunggu profil Clerk
      try {
        if (isSignedIn && !getToken() && !exchangedRef.current) {
          exchangedRef.current = true;
          await exchange();
        } else {
          await refresh();
        }
      } catch {
        exchangedRef.current = false;
        /* biarkan halaman login menangani */
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [clerkLoaded, isSignedIn, clerkUser, exchange, refresh]);

  const loginWithKey = useCallback(async (key: string) => {
    const res = await backend.loginWithKey(key);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    void signOut();
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithKey, logout, refresh, exchange, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
