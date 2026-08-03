import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Footprints, Calendar, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getHMProgress,
  startHMProgram,
  clearHMProgram,
  getCurrentHMWeek,
  getCurrentHMBlock,
  daysUntilRace,
  isHMProgramComplete,
  goalPaceSecPerKm,
  formatDuration,
  parseGoalTime,
  DEFAULT_GOAL_SECONDS,
  type HMProgress,
} from "@/lib/half-marathon-program";
import { WORKOUTS } from "@/lib/workout-data";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hapticSuccess } from "@/lib/haptics";
import { toast } from "sonner";

const DEFAULT_RACE_DATE = "2026-10-04";

export default function HalfMarathonProgramCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<HMProgress | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [raceDate, setRaceDate] = useState(DEFAULT_RACE_DATE);
  const [goalTime, setGoalTime] = useState("2:00");

  useEffect(() => {
    if (!user) return;
    setProgress(getHMProgress(user.id));
  }, [user]);

  if (!user) return null;

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
          <div className="bg-gradient-to-br from-emerald-500/25 to-teal-500/10 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 flex-shrink-0">
                <Footprints className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground">Start 8-Week Half Marathon Plan</h3>
                <p className="text-xs text-muted-foreground truncate">4 runs/week · Base → Build → Peak → Taper</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        </motion.button>

        <Sheet open={setupOpen} onOpenChange={setSetupOpen}>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="font-display text-xl flex items-center gap-2">
                <Footprints className="h-5 w-5 text-emerald-500" />
                Start Half Marathon Plan
              </SheetTitle>
              <SheetDescription>
                8 weeks, 4 runs per week — easy volume, intervals, tempo and a progressive long run. Your lifting split stays untouched.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 pb-6">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Race date</label>
                <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Goal finish time (h:mm)
                </label>
                <Input value={goalTime} onChange={(e) => setGoalTime(e.target.value)} placeholder="2:00" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {(() => {
                    const g = parseGoalTime(goalTime) ?? DEFAULT_GOAL_SECONDS;
                    return `Target pace ${formatDuration(goalPaceSecPerKm(g))} /km`;
                  })()}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  const goal = parseGoalTime(goalTime) ?? DEFAULT_GOAL_SECONDS;
                  const p = startHMProgram(user.id, raceDate || undefined, goal);
                  setProgress(p);
                  setSetupOpen(false);
                  hapticSuccess();
                  toast.success("Half marathon plan started — Week 1 begins today");
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

  const week = getCurrentHMWeek(progress);
  const block = getCurrentHMBlock(progress);
  const days = daysUntilRace(progress);
  const complete = isHMProgramComplete(progress);
  const pace = goalPaceSecPerKm(progress.goalSeconds ?? DEFAULT_GOAL_SECONDS);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-elevated rounded-2xl overflow-hidden"
    >
      <div className="bg-gradient-to-br from-emerald-500/25 to-teal-500/10 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <Footprints className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">Half Marathon · Week {week} of 8</h3>
                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/15 rounded-full px-2 py-0.5 uppercase tracking-wide">
                  {block.phase}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{block.focus}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (confirm("End the half marathon plan? Progress will be cleared.")) {
                clearHMProgram(user.id);
                setProgress(null);
              }
            }}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="End plan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3">
          <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${(week / 8) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {days !== null && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {days > 0 ? `${days} days to race` : days === 0 ? "Race day 🏁" : "Race complete"}
              </span>
            )}
            <span>~{block.volumeKm} km · {formatDuration(pace)}/km goal</span>
          </div>
        </div>

        {complete ? (
          <p className="text-xs text-muted-foreground italic">Plan complete — end it to start a new block.</p>
        ) : (
          <p className="text-xs text-foreground/80 mb-3 italic">"{block.note}"</p>
        )}

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
                <Icon className="h-3 w-3 text-emerald-500" />
                {w.name.replace("Run · ", "")}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => navigate("/half-marathon")}
            className="flex items-center justify-between rounded-lg bg-background/40 hover:bg-background/60 border border-border/50 px-3 py-2 text-xs font-medium text-foreground active:scale-[0.98] transition-all"
          >
            <span>Full 8-week plan</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/run")}
            className="flex items-center justify-between rounded-lg bg-background/40 hover:bg-background/60 border border-border/50 px-3 py-2 text-xs font-medium text-foreground active:scale-[0.98] transition-all"
          >
            <span>Pace & PBs</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
