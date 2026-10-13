import { BASE } from "./api/backend";

const PROXY_HOST_SUFFIXES = ["anoboy.be", "anime-kuindo.com", "otakudesu.blog", "otakudesu.best"];
const PHOTON_HOSTS = new Set(["i0.wp.com", "i1.wp.com", "i2.wp.com"]);

const matchesSuffix = (host: string) => {
  const h = host.toLowerCase();
  return PROXY_HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`));
};

const unwrap = (url: string): string => {
  if (!/\/img\?/.test(url)) return url;
  const m = url.match(/[?&]u=([^&]+)/);
  if (!m) return url;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return url;
  }
};

export function rawPoster(url: string | undefined | null): string {
  let u = (url ?? "").trim();
  if (!u) return "";
  u = unwrap(u);
  if (u.startsWith("//")) return `https:${u}`;
  if (/^http:\/\//i.test(u)) return u.replace(/^http:/i, "https:");
  if (/^(https:|data:|blob:|\/)/i.test(u)) return u;
  return `https://${u}`;
}

const proxyUrl = (raw: string): string | null => {
  try {
    const { protocol, hostname, pathname, search } = new URL(raw);
    if (protocol !== "https:") return null;

    const viaPhoton =
      PHOTON_HOSTS.has(hostname.toLowerCase()) &&
      matchesSuffix(pathname.split("/")[1] ?? "");

    if (!viaPhoton && !matchesSuffix(hostname)) return null;
    return `${BASE}/img?u=${encodeURIComponent(hostname + pathname + search)}`;
  } catch {
    return null;
  }
};

export function posterSources(url: string | undefined | null): string[] {
  const raw = rawPoster(url);
  if (!raw) return [];
  const proxy = proxyUrl(raw);
  return proxy ? [proxy, raw] : [raw];
}
