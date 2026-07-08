/**
 * Animated season finale recap.
 * Auto-opens when a pending finale exists; settles via RPC then shows the
 * user's rank, tier, coin reward, and unlocked cosmetics.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Coins, Trophy, Gift, ShoppingBag } from "lucide-react";
import { TierBadge } from "./TierBadge";
import { tierFromRp } from "@/lib/gamification/tiers";
import { settleSeason } from "@/lib/data/season-queries";
import {
  usePendingSeasonFinale,
  useMyLatestSeasonResult,
  useCosmeticsUnlockedInSeason,
} from "@/hooks/queries/useSeasonFinale";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SeasonFinaleSheet() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const { data: pending } = usePendingSeasonFinale();
  const { data: result, refetch: refetchResult } = useMyLatestSeasonResult();
  const { data: unlocked = [] } = useCosmeticsUnlockedInSeason(pending?.starts_at);
  const qc = useQueryClient();

  useEffect(() => {
    if (pending) setOpen(true);
  }, [pending]);

  const handleSettle = async () => {
    if (!pending) return;
    setSettling(true);
    try {
      await settleSeason(pending.id);
      // Force-refresh caches. Note: after RPC completes, the pending season
      // becomes `completed` — so the sheet's `pending` query returns null.
      // We latch a local `settled` flag so the result view stays visible.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["season-finale-pending"] }),
        qc.invalidateQueries({ queryKey: ["current-season"] }),
        qc.invalidateQueries({ queryKey: ["user-progress"] }),
        qc.invalidateQueries({ queryKey: ["cosmetics-unlocked-season"] }),
      ]);
      await refetchResult();
      setSettled(true);
      toast.success("Season settled — new season live!");
    } catch (e) {
      console.error("[SeasonFinale] settleSeason failed:", e);
      const msg = (e as Error).message ?? "Could not settle season";
      toast.error(msg);
    } finally {
      setSettling(false);
    }
  };

  const showResult = settled && result;

  const handleContinue = () => {
    setOpen(false);
    setSettled(false);
  };

  const handleGoToShop = () => {
    setOpen(false);
    setSettled(false);
    navigate("/shop");
  };

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
                className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-fuchsia-500 shadow-2xl shadow-fuchsia-500/30"
              >
                <Crown className="h-10 w-10 text-white" />
              </motion.div>
              <div>
                <h2 className="font-display text-2xl font-black uppercase tracking-wider">
                  Season {pending?.number} Finale
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  Lock in your final rank, claim your rewards, and step into next season.
                </p>
              </div>
              <Button onClick={handleSettle} disabled={settling} size="lg" className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                {settling ? "Settling…" : "Claim Season Rewards"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 space-y-5 max-h-[80vh] overflow-y-auto"
            >
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Season {pending?.number ?? ""} Result
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

              {unlocked.length > 0 && (
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-fuchsia-500/10 border border-primary/30 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-[11px] uppercase tracking-widest font-bold">
                      Unlocked This Season
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {unlocked.map((u) => (
                      <span
                        key={u.code}
                        className="text-[10px] font-semibold rounded-full bg-background/60 px-2 py-1 border border-border/40"
                      >
                        {u.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-center text-muted-foreground">
                RP soft-reset to your tier floor. A new season is now live.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleContinue} variant="outline" className="w-full">
                  Continue
                </Button>
                <Button onClick={handleGoToShop} className="w-full">
                  <ShoppingBag className="h-4 w-4 mr-1.5" />
                  Spend Coins
                </Button>
              </div>
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
    case "diamond":  return 2500;
    case "platinum": return 1500;
    case "gold":     return 800;
    case "silver":   return 400;
    default:         return 150;
  }
}
