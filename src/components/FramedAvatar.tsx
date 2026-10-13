import { useEffect, useState } from "react";

export type FrameId = "plain" | "aurora" | "neon" | "hex" | "ember" | "orbit" | "gold";

export interface FrameDef {
  id: FrameId;
  label: string;
  minRole: "user" | "admin" | "dev";
  ring: React.CSSProperties;
  inner?: React.CSSProperties;
}

export const FRAMES: FrameDef[] = [
  {
    id: "plain",
    label: "Polos",
    minRole: "user",
    ring: { background: "#4f378b", borderRadius: "50%", padding: 3 },
  },
  {
    id: "aurora",
    label: "Aurora",
    minRole: "admin",
    ring: {
      background: "conic-gradient(from 0deg, #d0bcff, #efb8c8, #4f378b, #d0bcff)",
      borderRadius: "50%",
      padding: 4,
      animation: "spin 6s linear infinite",
    },
    inner: { animation: "spin 6s linear infinite reverse" },
  },
  {
    id: "neon",
    label: "Neon",
    minRole: "admin",
    ring: {
      background: "#d0bcff",
      borderRadius: "50%",
      padding: 4,
      boxShadow: "0 0 14px 2px #d0bcff",
      animation: "neon-glow 2s ease-in-out infinite",
    },
  },
  {
    id: "hex",
    label: "Hex",
    minRole: "dev",
    ring: {
      background: "linear-gradient(135deg, #d0bcff, #efb8c8)",
      clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
      padding: 5,
    },
    inner: {
      clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
      borderRadius: 0,
    },
  },
  {
    id: "ember",
    label: "Ember",
    minRole: "dev",
    ring: {
      background: "conic-gradient(from 0deg, #ff7a45, #ffd666, #ff4d4f, #ff7a45)",
      borderRadius: "50%",
      padding: 4,
      boxShadow: "0 0 18px rgba(255,122,69,.55)",
      animation: "spin 6s linear infinite",
    },
    inner: { animation: "spin 6s linear infinite reverse" },
  },
  {
    id: "orbit",
    label: "Orbit",
    minRole: "dev",
    ring: {
      background: "none",
      borderRadius: "50%",
      padding: 10,
      outline: "2px dashed #d0bcff",
      outlineOffset: -2,
      animation: "spin 14s linear infinite",
    },
  },
  {
    id: "gold",
    label: "Emas",
    minRole: "admin",
    ring: {
      background: "conic-gradient(#f7e08a,#b8860b,#fff3b0,#b8860b,#f7e08a)",
      borderRadius: "50%",
      padding: 5,
    },
  },
];

export function roleLevel(role: string): number {
  if (role === "dev") return 3;
  if (role === "admin") return 2;
  return 1;
}

export function canUseFrame(userRole: string, frame: FrameDef): boolean {
  return roleLevel(userRole) >= roleLevel(frame.minRole);
}

export function frameById(id: string | null | undefined): FrameDef {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0];
}

function AvatarPlaceholder({ name, size }: { name: string; size: number }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4F378B] to-[#7965AF] font-bold text-[#EADDFF]"
      style={{ fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </div>
  );
}

export function FramedAvatar({
  src,
  name,
  size = 40,
  frameId = "plain",
  className = "",
}: {
  src?: string | null;
  name: string;
  size?: number;
  frameId?: string | null;
  className?: string;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [src]);

  const frame = frameById(frameId);
  const pad = (frame.ring.padding as number) ?? 4;
  const inner = size - pad * 2;
  const showImg = !!src && !imgError;
  const loading = showImg && !imgLoaded;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {loading && (
        <div className="absolute inset-0 animate-pulse rounded-full bg-[color:var(--m3-surface-high)]" />
      )}

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ ...frame.ring, opacity: loading ? 0 : 1, transition: "opacity 0.3s" }}
      >
        <div
          className="flex items-center justify-center overflow-hidden bg-[color:var(--m3-surface)]"
          style={{
            width: inner,
            height: inner,
            borderRadius: frame.inner?.clipPath ? 0 : "50%",
            clipPath: frame.inner?.clipPath,
            ...(frame.inner?.animation ? { animation: frame.inner.animation } : {}),
          }}
        >
          <div
            className="overflow-hidden"
            style={{
              width: "100%",
              height: "100%",
              borderRadius: frame.inner?.clipPath ? 0 : "50%",
              clipPath: frame.inner?.clipPath,
            }}
          >
            {showImg ? (
              <img
                key={src}
                src={src}
                alt={name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                style={{ display: imgLoaded ? "block" : "none" }}
              />
            ) : (
              <AvatarPlaceholder name={name} size={inner} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
