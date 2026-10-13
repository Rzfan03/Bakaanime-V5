import { useSyncExternalStore } from "react";

export type ThemeId = "dark" | "amoled";
export type TextSizeId = "sm" | "md" | "lg" | "xl";
export type AppFontId = "default" | "pixel";

export type AppSettings = {
  theme: ThemeId;
  textSize: TextSizeId;
  appFont: AppFontId;
  reduceMotion: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  textSize: "md",
  appFont: "default",
  reduceMotion: false,
};

const KEY = "bakaanime_settings";

const ZOOM: Record<TextSizeId, number> = { sm: 0.9, md: 1, lg: 1.1, xl: 1.2 };
const THEME_COLOR: Record<ThemeId, string> = { dark: "#141218", amoled: "#000000" };

function read(): AppSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw === "object") return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    /* pakai default */
  }
  return DEFAULT_SETTINGS;
}

/* Terapkan ke <html>: dipanggil sekali saat start dan tiap pengaturan berubah */
export function applySettings(s: AppSettings) {
  const el = document.documentElement;
  el.dataset.theme = s.theme;
  el.dataset.font = s.appFont;
  el.dataset.motion = s.reduceMotion ? "reduce" : "full";
  el.style.zoom = ZOOM[s.textSize] === 1 ? "" : String(ZOOM[s.textSize]);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[s.theme]);
}

/* ── store sederhana (tanpa library) ── */
let current = read();
const listeners = new Set<() => void>();

function emit(next: AppSettings) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* abaikan kalau storage penuh/diblokir */
  }
  applySettings(next);
  listeners.forEach((l) => l());
}

export function initSettings() {
  applySettings(current);
}

export function useSettings() {
  const settings = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );

  return {
    settings,
    update: (patch: Partial<AppSettings>) => emit({ ...current, ...patch }),
    reset: () => emit(DEFAULT_SETTINGS),
  };
}
