import { TIERS, TIER_COLORS, type Tier } from "@/lib/strength-standards";

interface Props {
  tier: Tier | null;
  className?: string;
}

/** 6-segment tier bar: Untrained → Beginner → Novice → Intermediate → Advanced → Elite */
export default function StrengthBar({ tier, className = "" }: Props) {
  const activeIdx = tier ? TIERS.indexOf(tier) : -1;
  return (
    <div className={`flex gap-0.5 h-1.5 w-full ${className}`}>
      {TIERS.map((t, i) => {
        const active = i <= activeIdx;
        return (
          <div
            key={t}
            className="flex-1 rounded-sm transition-colors duration-300"
            style={{
              background: active ? TIER_COLORS[t] : "hsl(220 14% 22%)",
              opacity: active ? 1 : 0.6,
            }}
            aria-label={t}
          />
        );
      })}
    </div>
  );
}
