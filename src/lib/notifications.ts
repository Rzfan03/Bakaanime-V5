import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getDetail } from "./api/anime";
import { readLibrary } from "./storage";
import { diffNewEpisodes } from "./notifDiff";
import type { EpisodeEntry, SeenMap } from "./notifDiff";

const SEEN_KEY = "bakaanime_notif_seen";
// ponytail: sequential detail fetches, capped. Parallelize only if libraries get large.
const MAX_CHECK = 15;

function readSeen(): SeenMap {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}

function writeSeen(map: SeenMap) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Stable 32-bit id from a slug, so re-runs replace instead of stacking. */
function notificationId(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483647 || 1;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === "granted") return true;
    const { display: after } = await LocalNotifications.requestPermissions();
    return after === "granted";
  } catch {
    return false;
  }
}

/**
 * Notify about new episodes of anime in the user's Library. Runs on launch/resume
 * only (no background worker). First time we see an anime we record its latest
 * episode as a baseline instead of notifying, so adding an anime stays quiet.
 */
export async function checkNewEpisodes(): Promise<number> {
  if (!Capacitor.isNativePlatform()) return 0;
  const library = readLibrary();
  if (library.length === 0) return 0;
  if (!(await ensureNotificationPermission())) return 0;

  const entries: EpisodeEntry[] = [];
  for (const item of library.slice(0, MAX_CHECK)) {
    try {
      const detail = await getDetail(item.slug);
      const latest = detail.episodes.reduce((max, e) => Math.max(max, e.number), 0);
      if (latest > 0) entries.push({ slug: item.slug, title: detail.title || item.title, latest });
    } catch {
      /* network/format error: skip, retry on the next launch */
    }
  }

  const { seen, fresh } = diffNewEpisodes(readSeen(), entries);
  writeSeen(seen);
  if (fresh.length === 0) return 0;

  await LocalNotifications.schedule({
    notifications: fresh.map((f) => ({
      id: notificationId(f.slug),
      title: f.title,
      body: `Episode ${f.episode} baru tersedia`,
      extra: { slug: f.slug },
    })),
  });
  return fresh.length;
}
