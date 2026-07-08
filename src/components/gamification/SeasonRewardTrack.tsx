/**
 * Season Reward Track — battle-pass style horizontal preview of what you
 * unlock by climbing tiers. Current tier highlighted, future tiers locked.
 */
import { motion } from "framer-motion";
import { Coins, Lock, Check, Shield, Award, Gem, Crown } from "lucide-react";
import { TIERS, tierFromRp } from "@/lib/gamification/tiers";
import { TIER_REWARDS } from "@/lib/data/season-queries";

const ICONS: Record<string, typeof Shield> = {
  bronze: Shield, silver: Shield, gold: Award,
  platinum: Award, diamond: Gem, champion: Crown,
};

export default function SeasonRewardTrack({ rp }: { rp: number }) {
  const currentTier = tierFromRp(rp);
  const currentIdx = TIERS.findIndex(t => t.id === currentTier.id);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          Reward Track
        </p>
        <p className="text-[10px] text-muted-foreground">Claimed at season end</p>
      </div>

      <div className="relative -mx-4 overflow-x-auto pb-1">
        <div className="flex gap-2 px-4 min-w-max">
          {TIER_REWARDS.map((reward, idx) => {
            const tier = TIERS.find(t => t.id === reward.tier)!;
            const isUnlocked = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            const Icon = ICONS[reward.tier];
            return (
              <motion.div
                key={reward.tier}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`relative w-[110px] flex-shrink-0 rounded-xl border p-2.5 space-y-1.5 ${
                  isCurrent
                    ? "border-primary/60 bg-primary/5 ring-2 ring-primary/40"
                    : isUnlocked
                      ? "border-border/60 bg-card/60"
                      : "border-border/30 bg-card/30"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-primary-foreground">
                    You
                  </div>
                )}
                <div
                  className={`aspect-square w-10 mx-auto rounded-lg bg-gradient-to-br ${tier.gradient} flex items-center justify-center ${!isUnlocked ? "grayscale opacity-40" : ""}`}
                >
                  <Icon className={`h-5 w-5 ${tier.color}`} />
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-wider text-center ${tier.color}`}>
                  {tier.label}
                </p>
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  <Coins className="h-3 w-3" />
                  <span className="text-[11px] font-bold tabular-nums">{reward.coins}</span>
                </div>
                <p className="text-[9px] text-muted-foreground text-center line-clamp-2 min-h-[22px] leading-tight">
                  {reward.cosmeticName}
                </p>
                <div className="flex justify-center">
                  {isUnlocked ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Lock className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
