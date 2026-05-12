import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronRight, Edit2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  recoveryColor,
  recoveryLabel,
  stressLevelLabel,
  stressLevelColor,
  strainLabel,
} from "@/lib/recovery-scores";
import { computeMuscleRecovery, statusColor } from "@/lib/recovery";
import { MUSCLE_REGIONS, MUSCLE_LABELS } from "@/lib/muscle-mapping";
import { getUserPreferences } from "@/lib/user-preferences";
import { useRecoverySettings } from "@/hooks/useRecoverySettings";
import { useTodayScore } from "@/hooks/queries/useDailyScores";
import { useDailyBiometrics } from "@/hooks/queries/useDailyBiometrics";
import { useRecentSets } from "@/hooks/queries/useRecentSets";
import { useSleepLogs } from "@/hooks/queries/useSleepLogs";
import BodyDiagram from "@/components/recovery/BodyDiagram";
import AnimatedNumber from "@/components/AnimatedNumber";
import BiometricCheckIn from "@/components/biometrics/BiometricCheckIn";
import RecoveryDetailSheet from "@/components/biometrics/RecoveryDetailSheet";

interface Props {
  date: string;
}

function StressDotsIndicator({ level }: { level: number }) {
  const filled = Math.round(Math.min(level, 3));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className="h-2 w-2 rounded-full transition-colors"
          style={{ background: n <= filled ? stressLevelColor(level) : "hsl(var(--muted))" }}
        />
      ))}
    </div>
  );
}

export default function HomeCombinedRecoveryCard({ date }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: score } = useTodayScore();
  const { data: biometrics = [] } = useDailyBiometrics(2);
  const { data: sets = [] } = useRecentSets();
  const { data: sleepLogs = [] } = useSleepLogs();

  const splitId = user ? getUserPreferences(user.id)?.splitId : null;
  const settings = useRecoverySettings(user?.id);

  const states = useMemo(
    () => computeMuscleRecovery(sets, sleepLogs, splitId, new Date(), settings),
    [sets, sleepLogs, splitId, settings],
  );

  const counts = useMemo(() => {
    let recovered = 0, workable = 0, fatigued = 0;
    for (const r of MUSCLE_REGIONS) {
      const s = states[r];
      if (s.status === "fatigued") fatigued++;
      else if (s.status === "workable") workable++;
      else recovered++;
    }
    return { recovered, workable, fatigued };
  }, [states]);

  const topFatigued = useMemo(
    () =>
      MUSCLE_REGIONS.map((r) => states[r])
        .filter((s) => s.status === "fatigued")
        .sort((a, b) => a.score - b.score)
        .slice(0, 3),
    [states],
  );

  const todayBiometric = biometrics.find((b) => b.date === date);
  const hasData = score?.recoveryScore != null;

  const recovery = score?.recoveryScore ?? 0;
  const strain   = score?.strainScore   ?? 0;
  const stress   = score?.stressLevel   ?? 0;
  const sleep    = score?.sleepPerformance ?? 0;
  const ringColor = hasData ? recoveryColor(recovery) : "hsl(var(--muted))";

  if (!user) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card rounded-xl p-4 w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Recovery
          </p>
          <div className="flex items-center gap-2">
            {hasData ? (
              <button
                onClick={() => setCheckInOpen(true)}
                className="text-primary"
                aria-label="Edit check-in"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setCheckInOpen(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1"
              >
                <Plus className="h-3 w-3" /> Check in
              </button>
            )}
            <button onClick={() => navigate("/progress?tab=recovery")} aria-label="View full recovery">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Biometric scores — only when checked in */}
        <AnimatePresence initial={false}>
          {hasData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <button
                onClick={() => setDetailOpen(true)}
                className="w-full text-left active:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-5">
                  {/* Recovery ring */}
                  <div className="relative flex-shrink-0">
                    <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                      <circle cx="36" cy="36" r="30" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                      <circle
                        cx="36" cy="36" r="30"
                        fill="none"
                        stroke={ringColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 30}`}
                        strokeDashoffset={`${2 * Math.PI * 30 * (1 - recovery / 100)}`}
                        style={{ transition: "stroke-dashoffset 0.8s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span style={{ color: ringColor }}>
                        <AnimatedNumber
                          value={Math.round(recovery)}
                          className="font-display text-lg font-bold leading-none"
                        />
                      </span>
                      <span className="text-[9px] text-muted-foreground">%</span>
                    </div>
                  </div>

                  {/* Strain / Stress / Sleep */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Strain</p>
                      <p className="text-xs font-semibold text-foreground">
                        {strain.toFixed(1)}{" "}
                        <span className="text-muted-foreground font-normal text-[10px]">{strainLabel(strain)}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Stress</p>
                      <div className="flex items-center gap-1.5">
                        <StressDotsIndicator level={stress} />
                        <p className="text-[10px] text-muted-foreground">{stressLevelLabel(stress)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Sleep</p>
                      <p className="text-xs font-semibold text-foreground">{Math.round(sleep)}%</p>
                    </div>
                  </div>
                </div>

                {/* AI headline */}
                {score?.aiInsight?.headline && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      "{score.aiInsight.headline}"
                    </p>
                    <p className="text-[10px] text-primary mt-1">Full analysis →</p>
                  </div>
                )}

                <div className="mt-2.5">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={{ color: ringColor, background: `${ringColor}20` }}
                  >
                    {recoveryLabel(recovery)}
                  </span>
                </div>
              </button>

              <div className="border-t border-border/40 my-3" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Muscle recovery — always shown */}
        <button
          type="button"
          onClick={() => navigate("/progress?tab=recovery")}
          className="w-full text-left active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <BodyDiagram states={states} view="front" interactive={false} size="sm" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusColor("recovered") }} />
                <AnimatedNumber value={counts.recovered} className="text-foreground font-semibold tabular-nums" />
                <span className="text-muted-foreground">recovered</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusColor("workable") }} />
                <AnimatedNumber value={counts.workable} className="text-foreground font-semibold tabular-nums" />
                <span className="text-muted-foreground">workable</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusColor("fatigued") }} />
                <AnimatedNumber value={counts.fatigued} className="text-foreground font-semibold tabular-nums" />
                <span className="text-muted-foreground">fatigued</span>
              </div>

              <AnimatePresence mode="wait">
                {topFatigued.length > 0 && (
                  <motion.p
                    key={topFatigued.map((s) => s.region).join(",")}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="text-[10px] text-muted-foreground pt-1 border-t border-border/30 mt-2"
                  >
                    Resting: {topFatigued.map((s) => MUSCLE_LABELS[s.region]).join(", ")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {!hasData && (
            <p className="text-xs text-primary mt-3 font-medium">
              Log Samsung Health metrics for your recovery score →
            </p>
          )}
        </button>
      </motion.div>

      <BiometricCheckIn
        open={checkInOpen}
        date={date}
        onClose={() => setCheckInOpen(false)}
        prefill={
          todayBiometric
            ? {
                samsungStressScore: todayBiometric.samsungStressScore ?? undefined,
                restingHr: todayBiometric.restingHr ?? undefined,
                spo2Pct: todayBiometric.spo2Pct ?? undefined,
                respiratoryRate: todayBiometric.respiratoryRate ?? undefined,
              }
            : undefined
        }
      />

      <RecoveryDetailSheet
        open={detailOpen}
        score={score ?? null}
        onClose={() => setDetailOpen(false)}
        onEdit={() => {
          setDetailOpen(false);
          setCheckInOpen(true);
        }}
      />
    </>
  );
}
