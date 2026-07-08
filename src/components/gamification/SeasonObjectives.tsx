/**
 * Season Objectives — long-form goals for the current season with progress bars.
 * Backed by quests with `scope='season'`.
 */
import { motion } from "framer-motion";
import { Target, Coins, Sparkles, Check } from "lucide-react";
import { useSeasonObjectives } from "@/hooks/queries/useSeasonFinale";
import { useCurrentSeason } from "@/hooks/queries/useCurrentSeason";
import type { SeasonObjective } from "@/lib/data/season-queries";

function formatProgress(o: SeasonObjective): string {
  if (o.metric === "volume_kg") {
    return `${(o.progress / 1000).toFixed(1)}t / ${(o.target / 1000).toFixed(0)}t`;
  }
  return `${Math.floor(o.progress)} / ${o.target}`;
}

export default function SeasonObjectives() {
  const { data: season } = useCurrentSeason();
  const { data: objectives = [], isLoading } = useSeasonObjectives(season?.starts_at);

  if (isLoading || objectives.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Target className="h-3.5 w-3.5 text-primary" />
        <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          Season Objectives
        </h4>
      </div>
      <div className="space-y-2">
        {objectives.map((o, idx) => (
          <motion.div
            key={o.code}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className={`rounded-xl border p-3 ${
              o.completed
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border/40 bg-card/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold truncate">{o.title}</p>
                  {o.completed && <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{o.description}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-0.5 text-amber-400">
                  <Coins className="h-3 w-3" />
                  <span className="text-[10px] font-bold tabular-nums">{o.coin_reward}</span>
                </div>
                <div className="flex items-center gap-0.5 text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-[10px] font-bold tabular-nums">{o.xp_reward}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    o.completed ? "bg-emerald-400" : "bg-gradient-to-r from-primary to-primary/60"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${o.pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground min-w-[60px] text-right">
                {formatProgress(o)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
