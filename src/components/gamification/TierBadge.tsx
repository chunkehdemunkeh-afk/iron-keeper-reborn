import { motion } from "framer-motion";
import { Shield, Award, Gem, Crown } from "lucide-react";
import { tierFromRp, type TierMeta } from "@/lib/gamification/tiers";

const ICON_MAP = { Shield, Award, Gem, Crown };

interface Props {
  rp: number;
  /** Show "TIER LABEL" or just an icon. */
  variant?: "chip" | "icon";
  className?: string;
}

export function TierBadge({ rp, variant = "chip", className = "" }: Props) {
  const tier: TierMeta = tierFromRp(rp);
  const Icon = (ICON_MAP as Record<string, typeof Shield>)[tier.icon] ?? Shield;

  if (variant === "icon") {
    return (
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${tier.gradient} ring-1 ring-border/30 ${className}`}>
        <Icon className={`h-3.5 w-3.5 ${tier.color}`} />
      </span>
    );
  }

  return (
    <motion.span
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${tier.gradient} px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-border/30 ${tier.color} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {tier.label}
    </motion.span>
  );
}
