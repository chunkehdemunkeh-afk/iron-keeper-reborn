import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { HYROX_SESSION_GROUPS } from "@/lib/hyrox-workouts";
import { WORKOUTS } from "@/lib/workout-data";
import { motion } from "framer-motion";
import { Play, Flame } from "lucide-react";
import { hapticMedium } from "@/lib/haptics";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function HyroxSwapSheet({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  const start = (id: string) => {
    hapticMedium();
    onOpenChange(false);
    navigate(`/workout/${id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/30 to-red-500/20">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <SheetTitle className="font-display text-xl">Hyrox Training</SheetTitle>
              <SheetDescription className="text-xs">
                Drop-in Hyrox session — replaces your scheduled workout.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {HYROX_SESSION_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
                <p className="text-xs text-muted-foreground/80">{group.description}</p>
              </div>
              <div className="space-y-2">
                {group.ids.map((id, i) => {
                  const w = WORKOUTS.find((x) => x.id === id);
                  if (!w) return null;
                  const Icon = w.icon;
                  return (
                    <motion.button
                      key={w.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => start(w.id)}
                      className="w-full glass-card-elevated rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-all"
                    >
                      <div className={`bg-gradient-to-br ${w.color} p-3.5`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 flex-shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display text-sm font-bold text-foreground">{w.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{w.focus}</p>
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary flex-shrink-0">
                            <Play className="h-3.5 w-3.5 fill-current text-primary-foreground" />
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
