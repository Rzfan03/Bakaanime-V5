import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { getDetail } from "./api/anime";
import { readLibrary } from "./storage";
import { diffNewEpisodes } from "./notifDiff";
import type { EpisodeEntry, FreshEpisode, SeenMap } from "./notifDiff";

const SEEN_KEY = "bakaanime_notif_seen";
const LOG_KEY = "bakaanime_notif_log";
const EVENT = "bakaanime:notif";
// Re-checking is network-heavy (one detail call per library anime); throttle the
// extra web visibility triggers. Launch always runs.
const MIN_INTERVAL_MS = 15 * 60 * 1000;
// ponytail: sequential detail fetches, capped. Parallelize only if libraries get large.
const MAX_CHECK = 15;
const MAX_LOG = 50;

export type NotifLogItem = {
  slug: string;
  title: string;
  episode: number;
  at: number;
  read: boolean;
};

let lastRun = 0;

// Capacitor needs a stable numeric id per notification; derive one from slug+episode.
function notifId(slug: string, episode: number): number {
  const s = `${slug}:${episode}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

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

export function readNotifLog(): NotifLogItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as NotifLogItem[]) : [];
  } catch {
    return [];
  }
}

function writeNotifLog(items: NotifLogItem[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(items.slice(0, MAX_LOG)));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function notifUnread(): number {
  return readNotifLog().filter((n) => !n.read).length;
}

export function markNotifsRead() {
  const items = readNotifLog();
  if (!items.some((n) => !n.read)) return;
  writeNotifLog(items.map((n) => ({ ...n, read: true })));
}

export function onNotifChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function appendNotifs(fresh: FreshEpisode[]) {
  const existing = readNotifLog();
  const seen = new Set(existing.map((n) => `${n.slug}:${n.episode}`));
  const now = Date.now();
  const added = fresh
    .filter((f) => !seen.has(`${f.slug}:${f.episode}`))
    .map((f) => ({ slug: f.slug, title: f.title, episode: f.episode, at: now, read: false }));
  if (added.length) writeNotifLog([...added, ...existing]);
}

/** Prompt for notification permission (native local notifications or web Notification API). */
export async function requestNotifPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === "granted") return true;
      const res = await LocalNotifications.requestPermissions();
      return res.display === "granted";
    } catch {
      return false;
    }
  }
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

async function collectNewEpisodes(): Promise<FreshEpisode[]> {
  const library = readLibrary();
  if (library.length === 0) return [];

  const entries: EpisodeEntry[] = [];
  for (const item of library.slice(0, MAX_CHECK)) {
    try {
      const detail = await getDetail(item.slug);
      const latest = detail.episodes.reduce((max, e) => Math.max(max, e.number), 0);
      if (latest > 0) entries.push({ slug: item.slug, title: detail.title || item.title, latest });
    } catch {
      /* network/format error: skip, retry on the next run */
    }
  }

  const { seen, fresh } = diffNewEpisodes(readSeen(), entries);
  writeSeen(seen);
  return fresh;
}

/**
 * Check Library anime for new episodes, store them in the in-app feed, and
 * (on devices) fire a local notification. Runs on launch and when the app
 * resumes / the web tab becomes visible.
 */
export async function runNotifCheck(force = false): Promise<number> {
  const now = Date.now();
  if (!force && now - lastRun < MIN_INTERVAL_MS) return 0;
  lastRun = now;

  const fresh = await collectNewEpisodes();
  if (fresh.length === 0) return 0;

  appendNotifs(fresh);

  if (Capacitor.isNativePlatform()) {
    if (await requestNotifPermission()) {
      await LocalNotifications.schedule({
        notifications: fresh.map((f) => ({
          id: notifId(f.slug, f.episode),
          title: f.title,
          body: `Episode ${f.episode} baru tersedia`,
        })),
      }).catch(() => {});
    }
  } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    for (const f of fresh.slice(0, 5)) {
      try {
        new Notification(f.title, { body: `Episode ${f.episode} baru tersedia`, tag: f.slug });
      } catch {
        /* ignore */
      }
    }
  }

  return fresh.length;
}
