export type FontId = "default" | "mono" | "serif" | "cursive" | "pixel" | "rounded";

export const FONT_OPTIONS: { id: FontId; label: string; style: React.CSSProperties }[] = [
  { id: "default", label: "Default", style: { fontFamily: "inherit" } },
  { id: "mono", label: "Mono", style: { fontFamily: "'Roboto Mono', 'Courier New', monospace" } },
  { id: "serif", label: "Serif", style: { fontFamily: "Georgia, 'Times New Roman', serif" } },
  { id: "cursive", label: "Cursive", style: { fontFamily: "'Dancing Script', cursive" } },
  { id: "pixel", label: "Pixelify", style: { fontFamily: "'Pixelify Sans', monospace" } },
  {
    id: "rounded",
    label: "Rounded",
    style: { fontFamily: "'Nunito', 'Varela Round', sans-serif", fontWeight: 700 },
  },
];

export function fontStyle(fontId: string): React.CSSProperties {
  return FONT_OPTIONS.find((f) => f.id === fontId)?.style ?? {};
}
