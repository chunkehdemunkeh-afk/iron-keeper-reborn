import { useState } from "react";
import { motion } from "framer-motion";
import { Activity, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  recoveryColor,
  recoveryLabel,
  stressLevelLabel,
  stressLevelColor,
  strainLabel,
} from "@/lib/recovery-scores";
import { useTodayScore } from "@/hooks/queries/useDailyScores";
import { useDailyBiometrics } from "@/hooks/queries/useDailyBiometrics";
import AnimatedNumber from "@/components/AnimatedNumber";
import BiometricCheckIn from "./BiometricCheckIn";
import RecoveryDetailSheet from "./RecoveryDetailSheet";

interface Props {
  date: string; // YYYY-MM-DD
}

function StressDotsIndicator({ level }: { level: number }) {
  const filled = Math.round(Math.min(level, 3));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map(n => (
        <span
          key={n}
          className="h-2 w-2 rounded-full transition-colors"
          style={{ background: n <= filled ? stressLevelColor(level) : "hsl(var(--muted))" }}
        />
      ))}
    </div>
  );
}

export default function RecoveryDashboard({ date }: Props) {
  const { user } = useAuth();
  const [checkInOpen, setCheckInOpen]     = useState(false);
  const [detailOpen, setDetailOpen]       = useState(false);

  const { data: score } = useTodayScore();
  const { data: biometrics = [] } = useDailyBiometrics(2);

  const todayBiometric = biometrics.find(b => b.date === date);

  const hasData = score?.recoveryScore != null;
  const recovery = score?.recoveryScore ?? 0;
  const strain   = score?.strainScore   ?? 0;
  const stress   = score?.stressLevel   ?? 0;
  const sleep    = score?.sleepPerformance ?? 0;

  const ringColor   = hasData ? recoveryColor(recovery) : "hsl(var(--muted))";
  const ringPercent = hasData ? recovery : 0;

  if (!user) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="glass-card rounded-xl p-4 w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Recovery
          </p>
          {!hasData && (
            <button
              onClick={() => setCheckInOpen(true)}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1"
            >
              <Plus className="h-3 w-3" /> Check in
            </button>
          )}
        </div>

        {hasData ? (
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
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - ringPercent / 100)}`}
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

              {/* Side metrics */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Strain</p>
                  <p className="text-xs font-semibold text-foreground">
                    {strain.toFixed(1)} <span className="text-muted-foreground font-normal text-[10px]">{strainLabel(strain)}</span>
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

            {/* Recovery label badge */}
            <div className="mt-2.5">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ color: ringColor, background: `${ringColor}20` }}
              >
                {recoveryLabel(recovery)}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => setCheckInOpen(true)}
            className="w-full text-left active:opacity-80 transition-opacity py-2"
          >
            <p className="text-xs text-muted-foreground">
              Log your morning metrics from Samsung Health to get your recovery score.
            </p>
            <p className="text-xs text-primary mt-1.5 font-medium">Start morning check-in →</p>
          </button>
        )}
      </motion.div>

      <BiometricCheckIn
        open={checkInOpen}
        date={date}
        onClose={() => setCheckInOpen(false)}
        prefill={todayBiometric ? {
          samsungStressScore: todayBiometric.samsungStressScore ?? undefined,
          restingHr: todayBiometric.restingHr ?? undefined,
          spo2Pct: todayBiometric.spo2Pct ?? undefined,
          respiratoryRate: todayBiometric.respiratoryRate ?? undefined,
        } : undefined}
      />

      <RecoveryDetailSheet
        open={detailOpen}
        score={score ?? null}
        onClose={() => setDetailOpen(false)}
        onEdit={() => { setDetailOpen(false); setCheckInOpen(true); }}
      />
    </>
  );
}
