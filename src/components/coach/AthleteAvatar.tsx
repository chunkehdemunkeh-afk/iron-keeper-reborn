interface Props {
  name: string;
  url: string | null;
  size?: number;
}

/** Circular athlete avatar with initials fallback. */
export default function AthleteAvatar({ name, url, size = 40 }: Props) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center hairline border"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display font-bold text-muted-foreground" style={{ fontSize: size * 0.36 }}>
          {initials || "?"}
        </span>
      )}
    </div>
  );
}
