import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { type DailyScoreRecord } from "@/lib/cloud-data";
import { useDailyScores } from "@/hooks/queries/useDailyScores";
import { useDailyBiometrics } from "@/hooks/queries/useDailyBiometrics";
import { useSleepLogs } from "@/hooks/queries/useSleepLogs";
import {
  recoveryColor,
  recoveryLabel,
  stressLevelLabel,
  stressLevelColor,
  strainLabel,
  strainColor,
  sleepPerformanceLabel,
  computeUserBaseline,
  computeRecoveryBreakdown,
  type RecoveryFactor,
} from "@/lib/recovery-scores";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Edit2, Wind, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Minus } from "lucide-react";
import ExerciseTimer from "@/components/ExerciseTimer";

interface Props {
  open: boolean;
  score: DailyScoreRecord | null;
  onClose: () => void;
  onEdit: () => void;
}

interface ScoreCardProps {
  label: string;
  value: string;
  subLabel: string;
  color: string;
  explanation: string;
}

function ScoreCard({ label, value, subLabel, color, explanation }: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="rounded-xl bg-muted/30 border border-border/30 p-3.5 text-left w-full"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
      <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>{subLabel}</p>
      {expanded && (
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{explanation}</p>
      )}
      <div className="flex items-center gap-1 mt-1.5">
        <span className="text-[9px] text-muted-foreground">{expanded ? "Less" : "What does this mean?"}</span>
        {expanded ? <ChevronUp className="h-2.5 w-2.5 text-muted-foreground" /> : <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />}
      </div>
    </button>
  );
}

function FactorRow({ factor }: { factor: RecoveryFactor }) {
  const dirIcon =
    factor.direction === "positive" ? <ArrowUp className="h-3 w-3" /> :
    factor.direction === "negative" ? <ArrowDown className="h-3 w-3" /> :
    <Minus className="h-3 w-3" />;
  const dirColor =
    factor.direction === "positive" ? "hsl(152 70% 50%)" :
    factor.direction === "negative" ? "hsl(351 85% 60%)" :
    "hsl(var(--muted-foreground))";
  const widthPct = Math.round(factor.weight * 100);
  return (
    <div className="px-3.5 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-xs font-semibold text-foreground">{factor.label}</p>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums" style={{ color: dirColor }}>
            {dirIcon}
            <span>{factor.deltaPretty ?? "—"}</span>
          </div>
        </div>
        <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-500"
            style={{ width: `${Math.round(factor.score * 100)}%`, background: dirColor }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground mt-1">{widthPct}% weight</p>
      </div>
    </div>
  );
}

export default function RecoveryDetailSheet({ open, score, onClose, onEdit }: Props) {
  const { user } = useAuth();
  const [breathworkActive, setBreathworkActive] = useState(false);

  const { data: scores14d = [] } = useDailyScores(14, { enabled: open });
  const { data: biometrics14d = [] } = useDailyBiometrics(14, { range: "14d", enabled: open });
  const { data: sleepLogs = [] } = useSleepLogs(14);

  // Compute Whoop-style factor breakdown for today.
  const breakdown = useMemo(() => {
    if (!open) return null;
    const today = new Date().toISOString().split("T")[0];
    const todayBio = biometrics14d.find((b) => b.date === today) ?? null;
    const todaySleep = sleepLogs.find((s) => s.date === today) ?? null;
    const baseline = computeUserBaseline(biometrics14d);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
    const prevStrain = scores14d.find((s) => s.date === yesterday)?.strainScore ?? 0;
    return computeRecoveryBreakdown(todayBio, baseline, todaySleep, prevStrain);
  }, [open, biometrics14d, sleepLogs, scores14d]);

  if (!score) return null;

  const { recoveryScore, strainScore, stressLevel, sleepPerformance, aiInsight } = score;
  const rec   = recoveryScore  ?? 0;
  const strain = strainScore   ?? 0;
  const stress = stressLevel   ?? 0;
  const sleep  = sleepPerformance ?? 0;

  // Build trend data (oldest → newest for chart)
  const trendData = [...scores14d].reverse().map((s, i) => ({
    day: i + 1,
    recovery: s.recoveryScore ?? null,
    stress: s.stressLevel != null ? Math.round(s.stressLevel * 33.3) : null, // scale 0-3 to 0-100
  }));

  const biometricTrend = [...biometrics14d].reverse().map((b, i) => ({
    day: i + 1,
    rhr: b.restingHr ?? null,
    samsungStress: b.samsungStressScore ?? null,
  }));

  const showBreathwork = stress >= 2.0;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[95vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle>Daily Analysis</SheetTitle>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-10 mt-4">
          {/* 2×2 score grid */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard
              label="Recovery"
              value={`${Math.round(rec)}%`}
              subLabel={recoveryLabel(rec)}
              color={recoveryColor(rec)}
              explanation="Based on your Samsung stress score (HRV-derived), resting heart rate, and sleep quality compared to your personal 28-day rolling baseline. Higher means your body has bounced back well."
            />
            <ScoreCard
              label="Strain"
              value={strain.toFixed(1)}
              subLabel={strainLabel(strain)}
              color={strainColor(strain)}
              explanation="Logarithmic load score from today's workouts and activities. Scale 0–21 — each additional point gets progressively harder to accumulate, mirroring your cardiovascular load."
            />
            <ScoreCard
              label="Body Stress"
              value={`${stress.toFixed(1)}/3`}
              subLabel={stressLevelLabel(stress)}
              color={stressLevelColor(stress)}
              explanation="Physiological stress level derived from your HRV-based Samsung stress score and resting heart rate deviation from your 14-day average. Elevated ≠ bad if it's from exercise, but chronic elevation signals overreach."
            />
            <ScoreCard
              label="Sleep"
              value={`${Math.round(sleep)}%`}
              subLabel={sleepPerformanceLabel(sleep)}
              color={sleep >= 70 ? "hsl(152 70% 50%)" : sleep >= 50 ? "hsl(38 95% 60%)" : "hsl(351 85% 60%)"}
              explanation="Composite of sleep duration vs your body's need (scales with yesterday's training load), sleep quality rating, and stage breakdown if recorded. Your sleep need increases on high-strain days."
            />
          </div>

          {/* What moved your score — Whoop-style factor breakdown */}
          {breakdown && breakdown.factors.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                What moved your recovery
              </p>
              <div className="rounded-xl bg-muted/30 border border-border/30 divide-y divide-border/30">
                {breakdown.factors.map((f) => (
                  <FactorRow key={f.key} factor={f} />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                Weighted like Whoop: sleep leads, then HRV (when available), resting HR, stress, and respiratory rate.
              </p>
            </div>
          )}

          {/* AI coaching insight */}
          {aiInsight && (
            <div className="rounded-xl bg-primary/8 border border-primary/20 p-4 space-y-4">
              <p className="font-display text-base font-bold text-foreground">
                {aiInsight.headline}
              </p>

              {[
                { label: "Recovery", text: aiInsight.recovery_summary },
                { label: "Training today", text: aiInsight.training_recommendation },
                { label: "Sleep", text: aiInsight.sleep_analysis },
                { label: "Week ahead", text: aiInsight.week_ahead },
              ].map(({ label, text }) => text && (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">{label}</p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{text}</p>
                </div>
              ))}

              <p className="text-[9px] text-muted-foreground">Powered by Claude AI · refreshes each morning</p>
            </div>
          )}

          {!aiInsight && (
            <div className="rounded-xl bg-muted/30 border border-border/30 p-4 text-center">
              <p className="text-xs text-muted-foreground">AI analysis generating…</p>
              <p className="text-[10px] text-muted-foreground mt-1">This appears automatically within a few seconds of saving your check-in.</p>
            </div>
          )}

          {/* Breathwork prompt — shown when stress ≥ 2.0 */}
          {showBreathwork && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-4"
            >
              <div className="flex items-start gap-3">
                <Wind className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Elevated stress detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your stress is {stress.toFixed(1)}/3. Try a 4-7-8 breathing cycle to activate your parasympathetic nervous system.
                  </p>
                  {!breathworkActive ? (
                    <button
                      onClick={() => setBreathworkActive(true)}
                      className="mt-3 px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-semibold"
                    >
                      Start breathwork (1 min)
                    </button>
                  ) : (
                    <div className="mt-3">
                      <p className="text-[11px] text-muted-foreground mb-2">
                        4 counts in · 7 hold · 8 out — repeat 4 times
                      </p>
                      <ExerciseTimer
                        targetSeconds={76}
                        onComplete={() => setBreathworkActive(false)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Recovery trend chart */}
          {trendData.length >= 3 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                14-Day Recovery Trend
              </p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="recovGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(152 70% 50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(152 70% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      formatter={(v: number) => [`${Math.round(v)}%`, "Recovery"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="recovery"
                      stroke="hsl(152 70% 50%)"
                      strokeWidth={2}
                      fill="url(#recovGrad)"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* RHR + Samsung stress trends */}
          {biometricTrend.filter(b => b.rhr !== null).length >= 3 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Resting HR Trend
              </p>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={biometricTrend}>
                    <defs>
                      <linearGradient id="rhrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(351 85% 60%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(351 85% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" hide />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v: number) => [`${v} bpm`, "Resting HR"]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rhr"
                      stroke="hsl(351 85% 60%)"
                      strokeWidth={2}
                      fill="url(#rhrGrad)"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
