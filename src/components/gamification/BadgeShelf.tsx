import * as Icons from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useBadges } from "@/hooks/queries/useBadges";
import { Lock } from "lucide-react";

const TIER_RING: Record<string, string> = {
  bronze: "ring-amber-700/40 bg-amber-700/10 text-amber-500",
  silver: "ring-slate-300/40 bg-slate-300/10 text-slate-200",
  gold:   "ring-amber-400/50 bg-amber-400/15 text-amber-300",
};

interface Props {
  /** Compact = top 6 unlocked + grid; Full = all categories. */
  variant?: "compact" | "full";
  /** Hide locked badges entirely. */
  unlockedOnly?: boolean;
}

export default function BadgeShelf({ variant = "compact", unlockedOnly = false }: Props) {
  const navigate = useNavigate();
  const { data: badges = [], isLoading } = useBadges();

  if (isLoading) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const visible = badges.filter((b) => !b.hidden || b.unlockedAt);
  const sorted = [...visible].sort((a, b) => {
    if (!!a.unlockedAt !== !!b.unlockedAt) return a.unlockedAt ? -1 : 1;
    return 0;
  });
  const list = unlockedOnly ? sorted.filter((b) => b.unlockedAt) : sorted;
  const shown = variant === "compact" ? list.slice(0, 6) : list;

  const unlockedCount = badges.filter((b) => b.unlockedAt).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">Badges</h3>
          <p className="text-[11px] text-muted-foreground">
            {unlockedCount} / {badges.length} unlocked
          </p>
        </div>
        {variant === "compact" && (
          <button
            onClick={() => navigate("/quests")}
            className="text-[11px] font-semibold text-primary hover:underline"
          >
            View all
          </button>
        )}
      </div>

      <div className={`grid ${variant === "compact" ? "grid-cols-6" : "grid-cols-4 sm:grid-cols-6"} gap-2`}>
        {shown.map((b, i) => {
          const Icon = (Icons as unknown as Record<string, typeof Lock>)[b.icon] ?? Lock;
          const ring = TIER_RING[b.tier] ?? TIER_RING.bronze;
          const locked = !b.unlockedAt;
          return (
            <motion.button
              key={b.code}
              type="button"
              onClick={() => navigate("/quests")}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              title={`${b.name} — ${b.description}`}
              className={`aspect-square rounded-xl ring-1 flex flex-col items-center justify-center gap-1 p-1.5 transition ${
                locked ? "bg-muted/20 ring-border/30 text-muted-foreground/40 grayscale" : ring
              }`}
            >
              {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-5 w-5" />}
              <span className="text-[8px] font-semibold uppercase tracking-wide truncate w-full text-center">
                {b.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
