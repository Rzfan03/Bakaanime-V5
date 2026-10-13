import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { MoreVertical } from "lucide-react";

export type MenuItem = {
  label: string;
  icon: ReactNode;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
};

const itemClass = (danger?: boolean) =>
  `flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D0BCFF] ${
    danger
      ? "text-[#F2B8B8] hover:bg-[#F2B8B8]/10"
      : "text-[#E6E0E9] hover:bg-[#D0BCFF]/[0.08]"
  }`;

export default function OverflowMenu({
  items,
  label = "Menu lainnya",
}: {
  items: MenuItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-full text-[#E6E0E9] outline-none transition-colors hover:bg-[#D0BCFF]/[0.08] focus-visible:ring-2 focus-visible:ring-[#D0BCFF]"
      >
        <MoreVertical size={24} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[200px] rounded-2xl bg-[color:var(--m3-surface-high)] p-2 shadow-lg shadow-black/50"
        >
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={itemClass(item.danger)}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={itemClass(item.danger)}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
