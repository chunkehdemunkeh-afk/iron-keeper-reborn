import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Footprints, Gauge, Calendar, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  HM_PROGRAM,
  getHMProgress,
  getCurrentHMWeek,
  daysUntilRace,
  goalPaceSecPerKm,
  formatDuration,
  DEFAULT_GOAL_SECONDS,
  type HMProgress,
} from "@/lib/half-marathon-program";
import { WORKOUTS } from "@/lib/workout-data";
import { EmptyState } from "@/components/ui/empty-state";

export default function HalfMarathonProgram() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<HMProgress | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    const p = getHMProgress(user.id);
    setProgress(p);
    setOpen(p ? getCurrentHMWeek(p) : 1);
  }, [user]);

  const currentWeek = progress ? getCurrentHMWeek(progress) : null;
  const days = progress ? daysUntilRace(progress) : null;
  const pace = goalPaceSecPerKm(progress?.goalSeconds ?? DEFAULT_GOAL_SECONDS);

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-full bg-card/60 hairline border text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold">Half Marathon Plan</h1>
            <p className="text-sm text-muted-foreground">8 weeks · 4 runs per week</p>
          </div>
        </div>

        {/* Summary */}
        <div className="glass-card-elevated rounded-2xl p-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Week</p>
              <p className="font-display text-xl font-bold">{currentWeek ?? "—"}<span className="text-sm text-muted-foreground">/8</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">To race</p>
              <p className="font-display text-xl font-bold">{days !== null ? `${Math.max(days, 0)}d` : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Goal pace</p>
              <p className="font-display text-xl font-bold">{formatDuration(pace)}</p>
            </div>
          </div>
          {!progress && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Start the plan from the card on your home screen to track your week and countdown.
            </p>
          )}
        </div>

        {/* How the week works */}
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <h2 className="font-display text-sm font-bold flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-500" /> How each week works
          </h2>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li><span className="text-foreground font-medium">Easy run</span> — 6:45–7:15/km, conversational. Builds the aerobic engine.</li>
            <li><span className="text-foreground font-medium">Intervals</span> — 200m–1km reps well under race pace. Raises your ceiling.</li>
            <li><span className="text-foreground font-medium">Tempo</span> — sustained blocks at 5:41/km. Best predictor of race day.</li>
            <li><span className="text-foreground font-medium">Long run</span> — the key session, 10km → 18km. Time on feet and fuelling practice.</li>
          </ul>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
            Keep lifting as normal — put the long run at least 48h after your heaviest leg session, and never stack intervals the day after squats.
          </p>
        </div>

        {/* Weeks */}
        <div className="space-y-2">
          {HM_PROGRAM.map((block) => {
            const isOpen = open === block.week;
            const isCurrent = currentWeek === block.week;
            return (
              <div
                key={block.week}
                className={`glass-card rounded-2xl overflow-hidden ${isCurrent ? "ring-1 ring-emerald-500/50" : ""}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : block.week)}
                  className="w-full flex items-center gap-3 p-3.5 text-left"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 font-display text-sm font-bold text-emerald-500">
                    {block.week}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{block.focus}</p>
                      {isCurrent && (
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/15 rounded-full px-1.5 py-0.5 uppercase">Now</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{block.phase} · ~{block.volumeKm} km</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3.5 pb-3.5 space-y-2">
                    <p className="text-xs text-foreground/80 italic">"{block.note}"</p>
                    <div className="space-y-1.5">
                      {block.sessions.map((id, i) => {
                        const w = WORKOUTS.find((x) => x.id === id);
                        if (!w) return null;
                        const Icon = w.icon;
                        return (
                          <button
                            key={`${id}-${i}`}
                            onClick={() => navigate(`/workout/${id}`)}
                            className="w-full flex items-center gap-2.5 rounded-xl bg-background/50 border border-border/50 px-3 py-2.5 text-left active:scale-[0.99] transition-all"
                          >
                            <Icon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{w.name.replace("Run · ", "")}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{w.focus}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Day {i + 1}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate("/run")}
          className="w-full glass-card rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-all"
        >
          <Trophy className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium flex-1">Pace benchmarks & finish-time projection</span>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </button>

        {HM_PROGRAM.length === 0 && (
          <EmptyState icon={Footprints} title="No plan" description="Nothing scheduled." />
        )}
      </div>
    </div>
  );
}
