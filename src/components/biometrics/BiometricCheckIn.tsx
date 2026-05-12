import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Activity, Wind, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  upsertDailyBiometrics,
  upsertDailyScore,
  updateDailyScoreAIInsight,
  upsertSleepLog,
  fetchDailyBiometrics,
  fetchDailyScores,
  fetchSleepLogs,
} from "@/lib/cloud-data";
import {
  computeAllScores,
  computeUserBaseline,
  type DailyBiometric,
  type SleepLogFull,
} from "@/lib/recovery-scores";
import { hapticSuccess } from "@/lib/haptics";
import type { AIInsight } from "@/lib/cloud-data";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface Props {
  open: boolean;
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onSaved?: () => void;
  prefill?: {
    samsungStressScore?: number;
    restingHr?: number;
    spo2Pct?: number;
    respiratoryRate?: number;
  };
}

function stressLabel(v: number): string {
  if (v < 25)  return "Low";
  if (v < 50)  return "Moderate";
  if (v < 75)  return "High";
  return "Very high";
}

function stressColor(v: number): string {
  if (v < 25)  return "text-emerald-400";
  if (v < 50)  return "text-amber-400";
  if (v < 75)  return "text-orange-400";
  return "text-rose-400";
}

export default function BiometricCheckIn({ open, date, onClose, onSaved, prefill }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [stress, setStress]     = useState(prefill?.samsungStressScore ?? 35);
  const [rhr, setRhr]           = useState(prefill?.restingHr ?? 60);
  const [spo2, setSpo2]         = useState(prefill?.spo2Pct ?? 97);
  const [respRate, setRespRate] = useState(prefill?.respiratoryRate ?? 15);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStages, setShowStages]     = useState(false);
  const [deepMin, setDeepMin]   = useState<string>("");
  const [remMin, setRemMin]     = useState<string>("");
  const [lightMin, setLightMin] = useState<string>("");
  const [awakeMin, setAwakeMin] = useState<string>("");
  const [saving, setSaving]     = useState(false);

  // Reset to prefill when opened
  useEffect(() => {
    if (open && prefill) {
      if (prefill.samsungStressScore != null) setStress(prefill.samsungStressScore);
      if (prefill.restingHr != null) setRhr(prefill.restingHr);
      if (prefill.spo2Pct != null) setSpo2(prefill.spo2Pct);
      if (prefill.respiratoryRate != null) setRespRate(prefill.respiratoryRate);
    }
  }, [open, prefill]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    try {
      // 1. Save biometrics
      await upsertDailyBiometrics({
        date,
        samsungStressScore: stress,
        restingHr: rhr,
        spo2Pct: spo2,
        respiratoryRate: respRate,
      });

      // 2. Save sleep stages if entered
      if (showStages && (deepMin || remMin || lightMin || awakeMin)) {
        const existingSleepLogs = await fetchSleepLogs(1);
        const todaySleep = existingSleepLogs.find(l => l.date === date);
        if (todaySleep) {
          await upsertSleepLog({
            date,
            hours: todaySleep.hours,
            quality: todaySleep.quality,
            deepSleepMin: deepMin ? parseInt(deepMin) : null,
            remSleepMin: remMin ? parseInt(remMin) : null,
            lightSleepMin: lightMin ? parseInt(lightMin) : null,
            awakeMin: awakeMin ? parseInt(awakeMin) : null,
          });
        }
      }

      // 3. Compute scores from history + new biometrics
      const [history, scores28d, sleepLogs] = await Promise.all([
        fetchDailyBiometrics(28),
        fetchDailyScores(2),
        fetchSleepLogs(2),
      ]);

      const biometricHistory: DailyBiometric[] = history.map(b => ({
        date: b.date,
        samsungStressScore: b.samsungStressScore,
        restingHr: b.restingHr,
        spo2Pct: b.spo2Pct,
        hrvMs: b.hrvMs,
        respiratoryRate: b.respiratoryRate,
      }));

      const baseline = computeUserBaseline(biometricHistory);

      const todayBiometric: DailyBiometric = {
        date,
        samsungStressScore: stress,
        restingHr: rhr,
        spo2Pct: spo2,
        hrvMs: null,
        respiratoryRate: respRate,
      };

      const todaySleepLog = sleepLogs.find(l => l.date === date);
      const sleepFull: SleepLogFull | null = todaySleepLog ? {
        date: todaySleepLog.date,
        hours: todaySleepLog.hours,
        quality: todaySleepLog.quality,
        deepSleepMin: showStages && deepMin ? parseInt(deepMin) : todaySleepLog.deepSleepMin,
        remSleepMin:  showStages && remMin  ? parseInt(remMin)  : todaySleepLog.remSleepMin,
        lightSleepMin: showStages && lightMin ? parseInt(lightMin) : todaySleepLog.lightSleepMin,
        awakeMin: showStages && awakeMin ? parseInt(awakeMin) : todaySleepLog.awakeMin,
      } : null;

      const prevScore = scores28d.find(s => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        return s.date === d.toISOString().split("T")[0];
      });
      const prevStrain = prevScore?.strainScore ?? 0;

      const computed = computeAllScores(
        todayBiometric,
        sleepFull,
        baseline,
        0, // workout calories computed separately when session ends
        null,
        0,
        prevStrain,
      );

      // 4. Save scores immediately (without AI yet)
      await upsertDailyScore({
        date,
        recoveryScore: Math.round(computed.recoveryScore * 10) / 10,
        strainScore: computed.strainScore,
        stressLevel: Math.round(computed.stressLevel * 10) / 10,
        sleepPerformance: Math.round(computed.sleepPerformance * 10) / 10,
      });

      // 5. Fire edge function async for AI insight (don't wait — scores show immediately)
      generateAIInsight(date, computed, biometricHistory, sleepFull, prevStrain, spo2, queryClient);

      hapticSuccess();
      toast.success("Morning check-in saved");
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyBiometrics(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyScores(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sleepLogs(user!.id) });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Check-in save error:", err);
      toast.error("Failed to save check-in");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>Morning Check-in</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-8 mt-4">
          {/* Samsung Health helper */}
          <button
            onClick={() => window.open("intent://com.sec.android.app.shealth/#Intent;scheme=shealth;package=com.sec.android.app.shealth;end", "_blank")}
            className="w-full flex items-center justify-between rounded-xl bg-muted/40 border border-border/40 px-4 py-3 text-left"
          >
            <div>
              <p className="text-xs font-semibold text-foreground">Open Samsung Health</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Stress → Heart rate → Blood oxygen
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          {/* Samsung Stress Score */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3 w-3" /> Stress Score
              </p>
              <p className={`font-display text-2xl font-bold ${stressColor(stress)}`}>
                {stress}
                <span className="text-sm text-muted-foreground font-normal ml-1">{stressLabel(stress)}</span>
              </p>
            </div>
            <Slider value={[stress]} onValueChange={(v) => setStress(v[0])} min={0} max={100} step={1} />
            <p className="text-[10px] text-muted-foreground mt-1">Samsung Health → Stress (yesterday's daily average)</p>
          </div>

          {/* Resting HR */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Heart className="h-3 w-3" /> Resting Heart Rate
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                {rhr}<span className="text-sm text-muted-foreground font-normal ml-1">bpm</span>
              </p>
            </div>
            <Slider value={[rhr]} onValueChange={(v) => setRhr(v[0])} min={35} max={110} step={1} />
            <p className="text-[10px] text-muted-foreground mt-1">Samsung Health → Heart rate → Resting heart rate</p>
          </div>

          {/* SpO2 */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">SpO2</p>
              <p className="font-display text-2xl font-bold text-foreground">
                {spo2.toFixed(1)}<span className="text-sm text-muted-foreground font-normal ml-1">%</span>
              </p>
            </div>
            <Slider value={[spo2]} onValueChange={(v) => setSpo2(v[0])} min={88} max={100} step={0.5} />
            <p className="text-[10px] text-muted-foreground mt-1">Samsung Health → Blood oxygen</p>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
          >
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showAdvanced ? "Hide" : "Show"} advanced metrics
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-6 overflow-hidden"
              >
                {/* Respiratory Rate */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Wind className="h-3 w-3" /> Respiratory Rate
                    </p>
                    <p className="font-display text-2xl font-bold text-foreground">
                      {respRate}<span className="text-sm text-muted-foreground font-normal ml-1">br/min</span>
                    </p>
                  </div>
                  <Slider value={[respRate]} onValueChange={(v) => setRespRate(v[0])} min={8} max={30} step={0.5} />
                  <p className="text-[10px] text-muted-foreground mt-1">Samsung Health → Sleep → Breathing rate during sleep</p>
                </div>

                {/* Sleep stages toggle */}
                <button
                  onClick={() => setShowStages(!showStages)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                >
                  {showStages ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showStages ? "Hide" : "Add"} sleep stage breakdown
                </button>

                <AnimatePresence>
                  {showStages && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[10px] text-muted-foreground mb-3">
                        Samsung Health → Sleep → Stage breakdown (minutes)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Deep", value: deepMin, set: setDeepMin, color: "text-indigo-400" },
                          { label: "REM",  value: remMin,  set: setRemMin,  color: "text-violet-400" },
                          { label: "Light", value: lightMin, set: setLightMin, color: "text-blue-400" },
                          { label: "Awake", value: awakeMin, set: setAwakeMin, color: "text-rose-400" },
                        ].map(({ label, value, set, color }) => (
                          <div key={label}>
                            <p className={`text-[10px] font-semibold uppercase tracking-widest ${color} mb-1`}>{label}</p>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="min"
                              value={value}
                              onChange={(e) => set(e.target.value)}
                              className="w-full h-10 rounded-lg bg-muted/50 border border-border/50 px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary/50"
                              style={{ fontSize: "16px" }}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 rounded-lg gradient-primary font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Analysing…" : "Save Check-in"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Fire-and-forget AI analysis. Saves result to daily_scores once returned.
async function generateAIInsight(
  date: string,
  computed: { recoveryScore: number; strainScore: number; stressLevel: number; sleepPerformance: number },
  biometricHistory: DailyBiometric[],
  sleepFull: SleepLogFull | null,
  prevStrain: number,
  spo2Pct: number,
  queryClient: QueryClient,
) {
  try {
    const stress7d = biometricHistory.slice(0, 7).map(b => b.samsungStressScore).reverse();
    const rhr7d    = biometricHistory.slice(0, 7).map(b => b.restingHr).reverse();

    const payload = {
      scores: {
        recovery: Math.round(computed.recoveryScore),
        strain: computed.strainScore,
        stress: computed.stressLevel,
        sleep: Math.round(computed.sleepPerformance),
      },
      trends: {
        stress_7d: stress7d,
        rhr_7d: rhr7d,
        recovery_7d: [],
      },
      context: {
        next_workout: null,
        sleep_hours: sleepFull?.hours ?? null,
        sleep_stages: sleepFull ? {
          deep:  sleepFull.deepSleepMin  ?? null,
          rem:   sleepFull.remSleepMin   ?? null,
          light: sleepFull.lightSleepMin ?? null,
          awake: sleepFull.awakeMin      ?? null,
        } : null,
        yesterday_strain: prevStrain,
        spo2: spo2Pct,
      },
    };

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-insight`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`biometric-insight edge function error ${res.status}:`, errText);
      return;
    }

    const insight: AIInsight = await res.json();

    // Use UPDATE (not upsert) so only ai_insight + ai_generated_at are touched —
    // a full upsert with undefined score fields would overwrite them with null.
    await updateDailyScoreAIInsight(date, insight, new Date().toISOString());

    queryClient.invalidateQueries({ queryKey: ["daily-scores"] });
  } catch (err) {
    console.error("AI insight generation failed:", err);
  }
}
