import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Trophy } from "lucide-react";
import { onLevelUp } from "@/lib/gamification/notify";

export default function LevelUpSheet() {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<number>(0);

  useEffect(() => {
    return onLevelUp((r) => {
      setLevel(r.newLevel);
      setOpen(true);
    });
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl border-none bg-gradient-to-b from-primary/20 to-card p-8">
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="h-24 w-24 rounded-full bg-primary/30 flex items-center justify-center"
          >
            <Trophy className="h-12 w-12 text-primary" />
          </motion.div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Level Up!</p>
          <h2 className="font-display text-5xl font-bold">Level {level}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Keep building. New badges unlock at every milestone.
          </p>
          <button
            onClick={() => setOpen(false)}
            className="mt-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm"
          >
            Let's go
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
