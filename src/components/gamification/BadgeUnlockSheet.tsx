import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { onBadgeUnlock } from "@/lib/gamification/notify";
import type { UnlockedBadge } from "@/lib/gamification/badges";

export default function BadgeUnlockSheet() {
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState<UnlockedBadge[]>([]);

  useEffect(() => {
    return onBadgeUnlock((r) => {
      setBadges(r.unlockedBadges);
      setOpen(true);
    });
  }, []);

  const tierColor = (t: string) =>
    t === "gold" ? "from-amber-400/30 to-amber-500/10" : t === "silver" ? "from-slate-300/30 to-slate-400/10" : "from-orange-700/30 to-orange-800/10";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl border-none p-6 max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Badge Unlocked</p>
          <h2 className="font-display text-2xl font-bold mt-1">
            {badges.length === 1 ? "New Badge!" : `${badges.length} New Badges!`}
          </h2>
        </div>
        <div className="space-y-3">
          {badges.map((b, i) => (
            <motion.div
              key={b.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl p-4 bg-gradient-to-br ${tierColor(b.tier)} border border-border flex items-center gap-4`}
            >
              <div className="text-4xl">{b.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">{b.name}</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">{b.tier}</p>
                <p className="text-xs text-muted-foreground mt-1">+{b.xpReward} XP · +{b.coinReward} 🪙</p>
              </div>
            </motion.div>
          ))}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="mt-6 w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm"
        >
          Awesome
        </button>
      </SheetContent>
    </Sheet>
  );
}
