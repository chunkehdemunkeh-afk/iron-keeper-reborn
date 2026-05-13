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

function DialRing({
  label,
  value,
  suffix,
  pct,
  color,
  sub,
  subMuted,
}: {
  label: string;
  value: number;
  suffix: string;
  pct: number;
  color: string;
  sub?: string;
  subMuted?: boolean;
}) {
  const size = 84;
  const r = 34;
  const stroke = 6;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c}`}
            strokeDashoffset={`${c * (1 - clamped / 100)}`}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ color }}>
            <AnimatedNumber
              value={value}
              className={`font-display font-bold leading-none ${primary ? "text-2xl" : "text-xl"}`}
            />
          </span>
          {suffix && <span className="text-[9px] text-muted-foreground leading-none mt-0.5">{suffix}</span>}
        </div>
      </div>
      {sub && (
        <p className="text-[9px] mt-1 font-semibold" style={{ color }}>
          {sub}
        </p>
      )}
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
  const todaySleep = sleepLogs.find((l) => l.date === date);
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
        className="hero-card p-5 w-full"
        style={
          hasData
            ? {
                background: `radial-gradient(120% 80% at 100% 0%, ${ringColor}22, transparent 60%), hsl(var(--surface-2))`,
              }
            : undefined
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Recovery
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/check-ins")}
              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            >
              History
            </button>
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
                className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 hairline border rounded-full px-2.5 py-1"
              >
                <Plus className="h-3 w-3" /> Check in
              </button>
            )}
          </div>
        </div>

        {/* Three-dial Whoop-style overview — only when checked in */}
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
                <div className="grid grid-cols-3 gap-2">
                  <DialRing
                    label="Recovery"
                    value={Math.round(recovery)}
                    suffix="%"
                    pct={recovery}
                    color={ringColor}
                    sub={recoveryLabel(recovery)}
                    primary
                  />
                  <DialRing
                    label="Sleep"
                    value={Math.round(sleep)}
                    suffix="%"
                    pct={sleep}
                    color="hsl(217 91% 60%)"
                    sub={sleep >= 85 ? "Optimal" : sleep >= 70 ? "Sufficient" : "Low"}
                  />
                  <DialRing
                    label="Strain"
                    value={Number(strain.toFixed(1))}
                    suffix=""
                    pct={(strain / 21) * 100}
                    color="hsl(38 92% 55%)"
                    sub={strainLabel(strain)}
                  />
                </div>

                {/* Stress chip */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Stress</span>
                  <StressDotsIndicator level={stress} />
                  <span className="text-[10px] text-muted-foreground">{stressLevelLabel(stress)}</span>
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
              </button>

              <div className="border-t border-border/40 my-3" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Muscle recovery — always shown */}
        <button
          type="button"
          onClick={() => navigate("/recovery")}
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

        {/* Open Recovery deep-link */}
        <button
          onClick={() => navigate("/recovery")}
          className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 hairline border py-2.5 text-xs font-semibold text-primary active:scale-[0.98] transition-transform"
        >
          Open Recovery
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </motion.div>

      <BiometricCheckIn
        open={checkInOpen}
        date={date}
        onClose={() => setCheckInOpen(false)}
        prefill={{
          samsungStressScore: todayBiometric?.samsungStressScore ?? undefined,
          restingHr: todayBiometric?.restingHr ?? undefined,
          spo2Pct: todayBiometric?.spo2Pct ?? undefined,
          respiratoryRate: todayBiometric?.respiratoryRate ?? undefined,
          sleepHours: todaySleep?.hours,
          sleepQuality: todaySleep?.quality,
          sleepNotes: todaySleep?.notes ?? undefined,
          deepMin: todaySleep?.deepSleepMin,
          remMin: todaySleep?.remSleepMin,
          lightMin: todaySleep?.lightSleepMin,
          awakeMin: todaySleep?.awakeMin,
        }}
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
