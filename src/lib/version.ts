import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export const APK_URL =
  "https://github.com/Rzfan03/Bakaanime-V5/releases/download/latest/app-release.apk";

export interface ReleaseInfo {
  version: string;
  notes: string;
  apkUrl: string;
}

/** Version of the app the user actually has installed (native only). */
export async function getInstalledVersion(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return (await App.getInfo()).version;
  } catch {
    return null;
  }
}

interface GithubRelease {
  name?: string;
  tag_name?: string;
  body?: string;
  assets?: { name?: string; browser_download_url?: string }[];
}

/** Latest published release: version, notes, and the APK asset URL. */
export async function getLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/Rzfan03/Bakaanime-V5/releases/latest"
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GithubRelease;
    const version =
      String(data.name ?? "").match(/v?(\d+\.\d+\.\d+)/)?.[1] ??
      String(data.tag_name ?? "").replace(/^v/, "");
    if (!version) return null;
    const apk = data.assets?.find((a) => /\.apk$/i.test(a.name ?? ""));
    return {
      version,
      notes: String(data.body ?? "").trim(),
      apkUrl: apk?.browser_download_url ?? APK_URL,
    };
  } catch {
    return null;
  }
}

export function isNewer(latest: string, current: string): boolean {
  const a = latest.split(".").map(Number);
  const b = current.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}
