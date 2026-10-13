export const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "bakaanime_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      "Tidak bisa menghubungi backend. Pastikan `vercel dev` jalan (port 3000) dan VITE_API_URL benar.",
    );
  } finally {
    clearTimeout(timer);
  }

  // jangan asumsikan JSON: Vite dev / SPA fallback bisa balikin JS atau HTML
  const raw = await res.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (res.status === 401) {
    setToken(null);
    throw new Error("unauthorized");
  }

  const body = (data ?? {}) as { message?: string; error?: string };

  if (!res.ok) {
    throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
  }
  if (data === null) {
    throw new Error(
      "Backend tidak merespons JSON. Jalankan backend (vercel dev) dan pastikan VITE_API_URL benar.",
    );
  }
  return data as T;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  verified: boolean;
  role: string;
  font: string;
};

export type BackendItem = { slug: string; title: string; poster: string };

export type BackendComment = {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_verified: boolean;
  author_role: string;
  author_font: string;
};

// komentar milik user sendiri — include anime_slug untuk ditampilkan di profil
export type UserComment = BackendComment & { anime_slug: string };

export const backend = {
  getMe: () => request<{ user: SessionUser | null }>("/me"),

  loginWithClerk: (payload: { token: string; name?: string; email?: string; avatar?: string | null }) =>
    request<{ token: string; user: SessionUser }>("/auth/clerk", { method: "POST", body: payload }),

  loginWithKey: (key: string) =>
    request<{ token: string; user: SessionUser }>("/auth/key", {
      method: "POST",
      body: { key },
    }),

  updateProfile: (data: Partial<Pick<SessionUser, "name" | "bio" | "avatar" | "banner" | "font">>) =>
    request<{ user: SessionUser }>("/profile", { method: "PUT", body: data }),

  getFavorites: () => request<{ items: BackendItem[] }>("/favorites"),
  putFavorites: (items: BackendItem[]) =>
    request<{ items: BackendItem[] }>("/favorites", { method: "PUT", body: { items } }),
  addFavorite: (item: BackendItem) =>
    request<{ ok: true }>("/favorites", { method: "POST", body: item }),
  removeFavorite: (slug: string) =>
    request<{ ok: true }>(`/favorites?slug=${encodeURIComponent(slug)}`, { method: "DELETE" }),

  getLibrary: () => request<{ items: BackendItem[] }>("/library"),
  addLibrary: (item: BackendItem) =>
    request<{ ok: true }>("/library", { method: "POST", body: item }),
  removeLibrary: (slug: string) =>
    request<{ ok: true }>(`/library?slug=${encodeURIComponent(slug)}`, { method: "DELETE" }),

  getWatched: () => request<{ watched: Record<string, string[]> }>("/watched"),
  markWatched: (animeSlug: string, episodeSlug: string) =>
    request<{ ok: true }>("/watched", { method: "POST", body: { animeSlug, episodeSlug } }),

  getComments: (slug: string) =>
    request<{ comments: BackendComment[] }>(`/comments?slug=${encodeURIComponent(slug)}`),
  getMyComments: () =>
    request<{ comments: UserComment[] }>("/comments?user=me"),
  postComment: (animeSlug: string, body: string) =>
    request<{ comment: BackendComment }>("/comments", {
      method: "POST",
      body: { animeSlug, body },
    }),
};
