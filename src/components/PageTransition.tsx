import { useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router";

/* Halaman tab di bottom nav: pindah antar-tab pakai fade-through */
const TABS = new Set(["/", "/search", "/library", "/profile"]);

type Kind = "forward" | "back" | "fade";

/**
 * Transisi halaman ala Android (Material motion):
 * - buka halaman baru (Detail, Watch, Settings)  → geser masuk dari kanan
 * - tombol kembali                                → geser masuk dari kiri
 * - pindah antar-tab                              → fade + sedikit zoom
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const [state, setState] = useState<{ path: string; kind: Kind }>({
    path: pathname,
    kind: "fade",
  });

  // hitung arah transisi saat path berubah (pola "adjust state during render")
  if (state.path !== pathname) {
    const kind: Kind =
      TABS.has(state.path) && TABS.has(pathname)
        ? "fade"
        : navType === "POP"
          ? "back"
          : "forward";
    setState({ path: pathname, kind });
  }

  return (
    // overflow-x: clip mencegah scroll horizontal saat halaman bergeser masuk
    <div className="overflow-x-clip">
      <div key={pathname} className={`page-${state.kind}`}>
        {children}
      </div>
    </div>
  );
}