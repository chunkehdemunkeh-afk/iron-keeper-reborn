import { motion } from "framer-motion";
import { Flame, Coins, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserProgress } from "@/hooks/queries/useUserProgress";
import { useEquippedCosmetics, useCosmetics } from "@/hooks/queries/useCosmetics";

interface Props {
  compact?: boolean;
}

export default function XpBar({ compact = false }: Props) {
  const navigate = useNavigate();
  const { data: progress } = useUserProgress();
  const { data: equipped } = useEquippedCosmetics();
  const { data: catalog } = useCosmetics();
  if (!progress) return null;

  const { level, levelProgress, xp, coins, currentStreak, streakBadge } = progress;
  const themePayload = equipped?.xp_theme
    ? (catalog?.find(c => c.code === equipped.xp_theme)?.payload as { from?: string; to?: string } | undefined)
    : undefined;
  const barGradient = themePayload?.from && themePayload?.to
    ? `linear-gradient(90deg, ${themePayload.from}, ${themePayload.to})`
    : undefined;

  return (
    <button
      onClick={() => navigate("/quests")}
      className="w-full text-left rounded-xl bg-card border border-border p-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
    >
      {/* Level chip */}
      <div className="flex flex-col items-center justify-center min-w-[44px] h-11 rounded-lg bg-primary/15 text-primary">
        <span className="text-[8px] uppercase tracking-widest opacity-70 leading-none">Lvl</span>
        <span className="font-display font-bold text-lg leading-none">{level}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-[11px] font-semibold text-muted-foreground tabular-nums">
            {levelProgress.current.toLocaleString()} / {levelProgress.needed.toLocaleString()} XP
          </p>
          <p className="text-[10px] text-muted-foreground">{xp.toLocaleString()} total</p>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barGradient ? "" : "bg-gradient-to-r from-primary to-primary/70"}`}
            style={barGradient ? { background: barGradient } : undefined}
            initial={{ width: 0 }}
            animate={{ width: `${levelProgress.pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {!compact && (
        <div className="flex items-center gap-2 shrink-0">
          {currentStreak > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-orange-400">
              <Flame className="h-3.5 w-3.5" />
              <span>{currentStreak}</span>
              {streakBadge && <span className="text-[10px]">{streakBadge.icon}</span>}
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
            <Coins className="h-3.5 w-3.5" />
            <span className="tabular-nums">{coins}</span>
          </div>
          <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </button>
  );
}
