import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import { useUserProgress } from "@/hooks/queries/useUserProgress";
import { useCurrentSeason, daysRemaining } from "@/hooks/queries/useCurrentSeason";
import { tierFromRp, nextTier, tierProgress } from "@/lib/gamification/tiers";
import { TierBadge } from "./TierBadge";

export default function SeasonCard() {
  const { data: progress } = useUserProgress();
  const { data: season } = useCurrentSeason();

  const rp = progress?.seasonRp ?? 0;
  const tier = tierFromRp(rp);
  const next = nextTier(rp);
  const pct = tierProgress(rp) * 100;
  const days = daysRemaining(season);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-br ${tier.gradient} ring-1 ring-border/40 p-4 space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider">
            Season {season?.number ?? 1}
          </h3>
        </div>
        <TierBadge rp={rp} />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
            {rp.toLocaleString()} RP
          </p>
          {next ? (
            <p className="text-[10px] text-muted-foreground">
              {(next.minRp - rp).toLocaleString()} to {next.label}
            </p>
          ) : (
            <p className="text-[10px] text-fuchsia-300 font-bold">Top tier</p>
          )}
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r from-primary to-primary/60`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {days} day{days === 1 ? "" : "s"} left
        </span>
        <span className="opacity-70">Earn RP from duels &amp; challenges</span>
      </div>
    </motion.div>
  );
}
