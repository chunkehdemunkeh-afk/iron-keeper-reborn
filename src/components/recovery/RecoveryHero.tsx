import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Plus, Edit2, Heart, Activity, Wind, Droplets } from "lucide-react";
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
import { useSleepLogs } from "@/hooks/queries/useSleepLogs";
import AnimatedNumber from "@/components/AnimatedNumber";
import BiometricCheckIn from "@/components/biometrics/BiometricCheckIn";
import RecoveryDetailSheet from "@/components/biometrics/RecoveryDetailSheet";

interface Props {
  date: string;
}

function Dial({
  label,
  value,
  suffix,
  pct,
  color,
  sub,
  size = "md",
}: {
  label: string;
  value: number;
  suffix?: string;
  pct: number;
  color: string;
  sub?: string;
  size?: "lg" | "md";
}) {
  const dim = size === "lg" ? 132 : 76;
  const r = size === "lg" ? 56 : 32;
  const stroke = size === "lg" ? 9 : 6;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col items-center">
      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
        {label}
      </p>
      <div className="relative">
        <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`} className="-rotate-90">
          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
          <circle
            cx={dim / 2}
            cy={dim / 2}
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
              className={`font-display font-bold leading-none tabular-nums ${size === "lg" ? "text-4xl" : "text-lg"}`}
            />
          </span>
          {suffix && (
            <span className={`text-muted-foreground leading-none mt-0.5 ${size === "lg" ? "text-xs" : "text-[9px]"}`}>
              {suffix}
            </span>
          )}
        </div>
      </div>
      {sub && (
        <p className="text-[10px] mt-1.5 font-semibold tracking-wide" style={{ color }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Heart;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex items-center gap-2 rounded-lg bg-card/40 hairline border px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        <p className="text-xs font-semibold text-foreground tabular-nums leading-tight">
          {value}
          {unit && <span className="text-muted-foreground font-normal text-[10px] ml-0.5">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

export default function RecoveryHero({ date }: Props) {
  const { user } = useAuth();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: score } = useTodayScore();
  const { data: biometrics = [] } = useDailyBiometrics(2);
  const { data: sleepLogs = [] } = useSleepLogs(2);

  const todayBiometric = biometrics.find((b) => b.date === date);
  const todaySleep = sleepLogs.find((l) => l.date === date);

  const hasData = score?.recoveryScore != null;
  const recovery = score?.recoveryScore ?? 0;
  const strain = score?.strainScore ?? 0;
  const stress = score?.stressLevel ?? 0;
  const sleep = score?.sleepPerformance ?? 0;

  const ringColor = hasData ? recoveryColor(recovery) : "hsl(var(--muted))";

  if (!user) return null;

  // Tinted hero gradient by recovery score
  const heroBg = hasData
    ? `radial-gradient(120% 80% at 100% 0%, ${ringColor}22, transparent 60%), hsl(var(--surface-2))`
    : undefined;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-card p-5"
        style={heroBg ? { background: heroBg } : undefined}
      >
        {hasData ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Today's Readiness
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </p>
              </div>
              <button
                onClick={() => setCheckInOpen(true)}
                className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 hairline border rounded-full px-2.5 py-1 active:scale-95 transition-transform"
                aria-label="Edit check-in"
              >
                <Edit2 className="h-3 w-3" /> Edit
              </button>
            </div>

            <button
              onClick={() => setDetailOpen(true)}
              className="w-full flex flex-col items-center active:opacity-90 transition-opacity"
            >
              <Dial
                label="Readiness"
                value={Math.round(recovery)}
                suffix="%"
                pct={recovery}
                color={ringColor}
                sub={recoveryLabel(recovery)}
                size="lg"
              />

              {score?.aiInsight?.headline && (
                <div className="mt-4 w-full flex items-start gap-2 rounded-xl bg-primary/8 hairline border px-3 py-2.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/90 italic leading-relaxed text-left">
                    {score.aiInsight.headline}
                  </p>
                </div>
              )}
            </button>

            {/* 3-up dial row */}
            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t hairline">
              <Dial
                label="Recovery"
                value={Math.round(recovery)}
                suffix="%"
                pct={recovery}
                color={ringColor}
              />
              <Dial
                label="Sleep"
                value={Math.round(sleep)}
                suffix="%"
                pct={sleep}
                color="hsl(217 91% 60%)"
                sub={sleep >= 85 ? "Optimal" : sleep >= 70 ? "Sufficient" : "Low"}
              />
              <Dial
                label="Strain"
                value={Number(strain.toFixed(1))}
                pct={(strain / 21) * 100}
                color="hsl(38 92% 55%)"
                sub={strainLabel(strain)}
              />
            </div>

            {/* Stress chip */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Stress</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className="h-2 w-2 rounded-full"
                    style={{
                      background:
                        n <= Math.round(Math.min(stress, 3)) ? stressLevelColor(stress) : "hsl(var(--muted))",
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">{stressLevelLabel(stress)}</span>
            </div>

            {/* Inline biometric strip */}
            {(todayBiometric?.restingHr || todayBiometric?.spo2Pct || todayBiometric?.respiratoryRate) && (
              <div className="mt-4 flex gap-2">
                {todayBiometric?.restingHr && (
                  <Metric icon={Heart} label="Rest HR" value={todayBiometric.restingHr} unit="bpm" />
                )}
                {todayBiometric?.spo2Pct && (
                  <Metric icon={Droplets} label="SpO₂" value={todayBiometric.spo2Pct} unit="%" />
                )}
                {todayBiometric?.respiratoryRate && (
                  <Metric icon={Wind} label="Resp" value={todayBiometric.respiratoryRate} unit="rpm" />
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-3">
            <div className="relative mb-3">
              <div className="h-24 w-24 rounded-full border-4 border-dashed border-muted/60 flex items-center justify-center">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <p className="font-display text-xl font-bold text-foreground mb-1">How are you feeling?</p>
            <p className="text-xs text-muted-foreground max-w-[260px] mb-4">
              Log your morning metrics to unlock today's recovery score, strain target, and AI insight.
            </p>
            <button
              onClick={() => setCheckInOpen(true)}
              className="flex items-center gap-2 rounded-full gradient-primary text-primary-foreground font-semibold text-sm px-5 py-2.5 active:scale-95 transition-transform glow-primary"
            >
              <Plus className="h-4 w-4" />
              Start morning check-in
            </button>
          </div>
        )}
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
                sleepHours: todaySleep?.hours,
                sleepQuality: todaySleep?.quality,
                sleepNotes: todaySleep?.notes ?? undefined,
                deepMin: todaySleep?.deepSleepMin,
                remMin: todaySleep?.remSleepMin,
                lightMin: todaySleep?.lightSleepMin,
                awakeMin: todaySleep?.awakeMin,
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
