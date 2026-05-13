/**
 * Animated season finale recap.
 * Triggered manually from the Quests page; calls settle_season RPC then
 * shows the user's final rank, tier, badges, and rewards.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Coins, Trophy } from "lucide-react";
import { TierBadge } from "./TierBadge";
import { tierFromRp } from "@/lib/gamification/tiers";
import { settleSeason } from "@/lib/data/season-queries";
import { usePendingSeasonFinale, useMyLatestSeasonResult } from "@/hooks/queries/useSeasonFinale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SeasonFinaleSheet() {
  const [open, setOpen] = useState(false);
  const [settling, setSettling] = useState(false);
  const { data: pending } = usePendingSeasonFinale();
  const { data: result, refetch: refetchResult } = useMyLatestSeasonResult();
  const qc = useQueryClient();

  useEffect(() => {
    if (pending) setOpen(true);
  }, [pending]);

  const handleSettle = async () => {
    if (!pending) return;
    setSettling(true);
    try {
      await settleSeason(pending.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["season-finale-pending"] }),
        qc.invalidateQueries({ queryKey: ["current-season"] }),
        qc.invalidateQueries({ queryKey: ["user-progress"] }),
      ]);
      await refetchResult();
      toast.success("Season settled!");
    } catch (e) {
      toast.error("Could not settle season");
    } finally {
      setSettling(false);
    }
  };

  const showResult = result && pending && result.season_id === pending.id;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/40 bg-background/95 backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 space-y-6"
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-fuchsia-500"
              >
                <Crown className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h2 className="font-display text-2xl font-black uppercase tracking-wider">
                  Season {pending?.number} Finale
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Lock in your final rank, claim your rewards, and prepare for next season.
                </p>
              </div>
              <Button onClick={handleSettle} disabled={settling} size="lg" className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                {settling ? "Settling..." : "Claim Season Rewards"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 space-y-5"
            >
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Season {pending?.number} Result
                </p>
                <h2 className="font-display text-3xl font-black mt-1">
                  Rank #{result.final_rank ?? "—"}
                </h2>
                <div className="mt-3 inline-block">
                  <TierBadge rp={result.final_rp} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary/50 p-3 text-center">
                  <Trophy className="h-4 w-4 mx-auto text-amber-400" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Final RP</p>
                  <p className="font-display text-xl font-bold tabular-nums">{result.final_rp}</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3 text-center">
                  <Coins className="h-4 w-4 mx-auto text-amber-400" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Coin Reward</p>
                  <p className="font-display text-xl font-bold tabular-nums">
                    {coinRewardForTier(tierFromRp(result.final_rp).id)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                RP soft-reset to your tier floor. New season starts immediately.
              </p>

              <Button onClick={() => setOpen(false)} className="w-full" variant="outline">
                Continue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function coinRewardForTier(tier: string): number {
  switch (tier) {
    case "champion": return 5000;
    case "diamond": return 2500;
    case "platinum": return 1500;
    case "gold": return 800;
    case "silver": return 400;
    default: return 150;
  }
}
