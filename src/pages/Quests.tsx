import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Flame, Swords } from "lucide-react";
import { motion } from "framer-motion";
import { useUserProgress } from "@/hooks/queries/useUserProgress";
import { useRecentXpEvents } from "@/hooks/queries/useBadges";
import { formatDistanceToNow } from "date-fns";
import SeasonCard from "@/components/gamification/SeasonCard";
import BadgeShelf from "@/components/gamification/BadgeShelf";
import { TierBadge } from "@/components/gamification/TierBadge";
import QuestsPanel from "@/components/gamification/QuestsPanel";
import { Button } from "@/components/ui/button";

const SOURCE_LABEL: Record<string, string> = {
  daily_open: "Daily check-in",
  workout: "Workout logged",
  sleep_log: "Sleep logged",
  sleep_log_with_stages: "Sleep stages",
  food_log_any: "Food logged",
  food_log_complete: "Calorie goal hit",
  protein_goal: "Protein goal",
  water_goal: "Water goal",
  bodyweight: "Bodyweight logged",
  biometric_checkin: "Morning check-in",
  progress_photo: "Progress photo",
  weekly_review: "Weekly review",
  personal_record: "Personal Record",
  first_time_feature: "New feature",
};


export default function Quests() {
  const navigate = useNavigate();
  const { data: progress } = useUserProgress();
  const { data: events = [] } = useRecentXpEvents(20);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Quests & Rewards</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {/* Hero card */}
        {progress && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-border p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-primary font-semibold">Level</p>
                <p className="font-display text-5xl font-bold leading-none mt-1">{progress.level}</p>
              </div>
              <div className="text-right space-y-1">
                <TierBadge rp={progress.seasonRp} />
                <div className="flex items-center justify-end gap-2 text-sm">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="font-bold tabular-nums">{progress.coins}</span>
                </div>
                {progress.currentStreak > 0 && (
                  <div className="flex items-center justify-end gap-1 text-sm">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span className="font-bold">{progress.currentStreak}d</span>
                    {progress.streakBadge && <span className="text-xs">{progress.streakBadge.icon}</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>{progress.levelProgress.current.toLocaleString()} XP</span>
                <span>{progress.levelProgress.needed.toLocaleString()} XP to L{progress.level + 1}</span>
              </div>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.levelProgress.pct}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-gradient-to-r from-primary to-primary/70"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
              <Stat label="Total XP" value={progress.xp.toLocaleString()} />
              <Stat label="Longest Streak" value={`${progress.longestStreak}d`} />
              <Stat label="Freezes" value={`${progress.freezeTokens}/3`} />
            </div>
          </motion.div>
        )}

        {/* Season + Tier */}
        <SeasonCard />

        {/* Badges */}
        <BadgeShelf variant="full" />

        {/* Recent XP feed */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Recent XP
          </h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {events.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No XP events yet — log a workout to start earning.
              </div>
            )}
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {SOURCE_LABEL[e.source] ?? e.source}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold shrink-0">
                  {e.xp > 0 && <span className="text-primary">+{e.xp} XP</span>}
                  {e.coins > 0 && <span className="text-amber-400">+{e.coins} 🪙</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
