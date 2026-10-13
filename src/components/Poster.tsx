import { useState } from "react";
import { ImageOff } from "lucide-react";
import { posterSources } from "../lib/poster";

type Props = {
  src: string | undefined | null;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  fallback?: "icon" | "none";
};

function PosterImage({ src, alt = "", className = "", loading, fallback = "icon" }: Props) {
  const sources = posterSources(src);
  const [index, setIndex] = useState(0);
  const current = sources[index];

  if (!current) {
    if (fallback === "none") return null;
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`flex items-center justify-center bg-[color:var(--m3-surface-high)] text-[#49454F] ${className}`}
      >
        <ImageOff size={24} />
      </div>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
      className={className}
    />
  );
}

export default function Poster(props: Props) {
  return <PosterImage key={props.src ?? ""} {...props} />;
}
