/**
 * Renders an avatar wrapped in the user's currently equipped frame cosmetic.
 * Falls back to a plain ring when nothing is equipped.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEquippedCosmetics } from "@/hooks/queries/useCosmetics";
import { useCosmetics } from "@/hooks/queries/useCosmetics";

interface Props {
  userId?: string;
  src?: string | null;
  fallback?: string;
  size?: number;
  className?: string;
}

export default function AvatarFrame({ userId, src, fallback, size = 48, className = "" }: Props) {
  const { data: equipped } = useEquippedCosmetics(userId);
  const { data: catalog } = useCosmetics();
  const frameCode = equipped?.frame;
  const frame = catalog?.find((c) => c.code === frameCode);
  const gradient = (frame?.payload as { gradient?: string } | undefined)?.gradient;

  const ringStyle = gradient
    ? { background: gradient, padding: 2 }
    : { padding: 1 };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full ${gradient ? "" : "ring-1 ring-border/40"} ${className}`}
      style={{ ...ringStyle, width: size + 4, height: size + 4 }}
    >
      <Avatar style={{ width: size, height: size }}>
        {src ? <AvatarImage src={src} /> : null}
        <AvatarFallback className="text-xs font-bold">{fallback ?? "?"}</AvatarFallback>
      </Avatar>
    </div>
  );
}
