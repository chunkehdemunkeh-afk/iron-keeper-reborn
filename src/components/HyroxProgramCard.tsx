import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Calendar, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getHyroxProgress,
  startHyroxProgram,
  clearHyroxProgram,
  getCurrentWeek,
  getCurrentBlock,
  daysUntilRace,
  isProgramComplete,
  type HyroxProgress,
} from "@/lib/hyrox-program";
import { WORKOUTS } from "@/lib/workout-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hapticSuccess } from "@/lib/haptics";
import { toast } from "sonner";

export default function HyroxProgramCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<HyroxProgress | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [raceDate, setRaceDate] = useState("");

  useEffect(() => {
    if (!user) return;
    setProgress(getHyroxProgress(user.id));
  }, [user]);

  if (!user) return null;

  // ── No program: show a compact "Start" prompt ──
  if (!progress) {
    return (
      <>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSetupOpen(true)}
          className="w-full glass-card-elevated rounded-2xl overflow-hidden text-left"
        >
          <div className="bg-gradient-to-br from-orange-500/25 to-red-500/10 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 flex-shrink-0">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground">Start 8-Week Hyrox Program</h3>
                <p className="text-xs text-muted-foreground truncate">Periodized race prep — Base → Build → Peak → Taper</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        </motion.button>

        <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="font-display text-xl flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Start Hyrox Program
              </SheetTitle>
              <SheetDescription>
                8 weeks: 2× Base → 2× Build → 2× Intensify → Peak → Taper. Add your race date for a countdown.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 pb-6">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Race date (optional)
                </label>
                <Input
                  type="date"
                  value={raceDate}
                  onChange={(e) => setRaceDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const p = startHyroxProgram(user.id, raceDate || undefined);
                  setProgress(p);
                  setSetupOpen(false);
                  hapticSuccess();
                  toast.success("Hyrox program started — Week 1 begins today");
                }}
              >
                Start Week 1
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // ── Active program ──
  const week = getCurrentWeek(progress);
  const block = getCurrentBlock(progress);
  const days = daysUntilRace(progress);
  const complete = isProgramComplete(progress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-elevated rounded-2xl overflow-hidden"
    >
      <div className="bg-gradient-to-br from-orange-500/25 to-red-500/10 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">Hyrox · Week {week} of 8</h3>
                <span className="text-[9px] font-bold text-orange-500 bg-orange-500/15 rounded-full px-2 py-0.5 uppercase tracking-wide">
                  {block.phase}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{block.focus}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm("End the Hyrox program? Progress will be cleared.")) {
                clearHyroxProgram(user.id);
                setProgress(null);
              }
            }}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="End program"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
              style={{ width: `${(week / 8) * 100}%` }}
            />
          </div>
          {days !== null && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {days > 0 ? `${days} days to race` : days === 0 ? "Race day 🏁" : "Race complete"}
            </div>
          )}
        </div>

        {complete ? (
          <p className="text-xs text-muted-foreground italic">Program complete — end to start a new cycle.</p>
        ) : (
          <p className="text-xs text-foreground/80 mb-3 italic">"{block.note}"</p>
        )}

        {/* Session tiles for this week */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {block.sessions.map((id) => {
            const w = WORKOUTS.find((x) => x.id === id);
            if (!w) return null;
            const Icon = w.icon;
            return (
              <button
                key={id}
                onClick={() => navigate(`/workout/${id}`)}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-background/60 hover:bg-background/80 border border-border/50 px-2.5 py-1.5 text-[11px] font-medium text-foreground active:scale-95 transition-all"
              >
                <Icon className="h-3 w-3 text-orange-500" />
                {w.name.replace("Hyrox · ", "")}
              </button>
            );
          })}
        </div>

        {/* Benchmarks link */}
        <button
          onClick={() => navigate("/hyrox")}
          className="mt-3 w-full flex items-center justify-between rounded-lg bg-background/40 hover:bg-background/60 border border-border/50 px-3 py-2 text-xs font-medium text-foreground active:scale-[0.98] transition-all"
        >
          <span>View Hyrox benchmarks & pace charts</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}
