import { useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigationType } from "react-router";

/* Bottom-nav tab routes; switching between tabs uses fade-through. */
const TABS = new Set(["/", "/search", "/library", "/profile"]);

type Kind = "forward" | "back" | "fade";

/**
 * Android-style transitions: a new page slides in from the right, back slides
 * in from the left, and tab switches fade with a slight zoom.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const [state, setState] = useState<{ path: string; kind: Kind }>({
    path: pathname,
    kind: "fade",
  });

  // Adjust state during render to recompute the direction when the path changes.
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
    // overflow-x: clip stops horizontal scroll while pages slide in
    <div className="overflow-x-clip">
      <div key={pathname} className={`page-${state.kind}`}>
        {children}
      </div>
    </div>
  );
}