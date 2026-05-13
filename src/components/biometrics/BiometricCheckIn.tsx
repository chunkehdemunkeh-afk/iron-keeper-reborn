import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Activity, Wind, Moon, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import {
  computeAllScores,
  computeUserBaseline,
  type DailyBiometric,
  type SleepLogFull,
} from "@/lib/recovery-scores";
import { hapticSuccess } from "@/lib/haptics";
import type { AIInsight } from "@/lib/cloud-data";

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
    sleepHours?: number;
    sleepQuality?: number;
    sleepNotes?: string;
    deepMin?: number | null;
    remMin?: number | null;
    lightMin?: number | null;
    awakeMin?: number | null;
  };
}

function minutesInput(value?: number | null): string {
  return value != null ? String(value) : "";
}

function parseStageMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function hasStageBreakdown(values: Array<number | null | undefined>): boolean {
  return values.some((value) => value != null);
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

  const prefillSamsungStressScore = prefill?.samsungStressScore;
  const prefillRestingHr = prefill?.restingHr;
  const prefillSpo2Pct = prefill?.spo2Pct;
  const prefillRespiratoryRate = prefill?.respiratoryRate;
  const prefillSleepHours = prefill?.sleepHours;
  const prefillSleepQuality = prefill?.sleepQuality;
  const prefillSleepNotes = prefill?.sleepNotes;
  const prefillDeepMin = prefill?.deepMin;
  const prefillRemMin = prefill?.remMin;
  const prefillLightMin = prefill?.lightMin;
  const prefillAwakeMin = prefill?.awakeMin;

  const [stress, setStress]     = useState(prefillSamsungStressScore ?? 35);
  const [rhr, setRhr]           = useState(prefillRestingHr ?? 60);
  const [spo2, setSpo2]         = useState(prefillSpo2Pct ?? 97);
  const [respRate, setRespRate] = useState(prefillRespiratoryRate ?? 15);
  const [sleepHours, setSleepHours] = useState(prefillSleepHours ?? 7.5);
  const [sleepQuality, setSleepQuality] = useState(prefillSleepQuality ?? 3);
  const [sleepNotes, setSleepNotes] = useState(prefillSleepNotes ?? "");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showStages, setShowStages]     = useState(false);
  const [deepMin, setDeepMin]   = useState<string>(minutesInput(prefillDeepMin));
  const [remMin, setRemMin]     = useState<string>(minutesInput(prefillRemMin));
  const [lightMin, setLightMin] = useState<string>(minutesInput(prefillLightMin));
  const [awakeMin, setAwakeMin] = useState<string>(minutesInput(prefillAwakeMin));
  const [saving, setSaving]     = useState(false);

  // Re-hydrate from prefill whenever the sheet opens
  useEffect(() => {
    if (!open) return;
    if (prefill?.samsungStressScore != null) setStress(prefill.samsungStressScore);
    if (prefill?.restingHr != null) setRhr(prefill.restingHr);
    if (prefill?.spo2Pct != null) setSpo2(prefill.spo2Pct);
    if (prefill?.respiratoryRate != null) setRespRate(prefill.respiratoryRate);
    if (prefill?.sleepHours != null) setSleepHours(prefill.sleepHours);
    if (prefill?.sleepQuality != null) setSleepQuality(prefill.sleepQuality);
    if (prefill?.sleepNotes != null) setSleepNotes(prefill.sleepNotes);
    setDeepMin(prefill?.deepMin != null ? String(prefill.deepMin) : "");
    setRemMin(prefill?.remMin != null ? String(prefill.remMin) : "");
    setLightMin(prefill?.lightMin != null ? String(prefill.lightMin) : "");
    setAwakeMin(prefill?.awakeMin != null ? String(prefill.awakeMin) : "");
    // Auto-expand advanced + stages if any prefilled stage data exists
    const hasStages = prefill?.deepMin != null || prefill?.remMin != null || prefill?.lightMin != null || prefill?.awakeMin != null;
    if (hasStages) {
      setShowAdvanced(true);
      setShowStages(true);
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

      // 2. Always upsert sleep log (fixes sleep score = 0 bug)
      const deepVal  = deepMin  ? parseInt(deepMin)  : null;
      const remVal   = remMin   ? parseInt(remMin)   : null;
      const lightVal = lightMin ? parseInt(lightMin) : null;
      const awakeVal = awakeMin ? parseInt(awakeMin) : null;
      await upsertSleepLog({
        date,
        hours: sleepHours,
        quality: sleepQuality,
        notes: sleepNotes.trim() || undefined,
        deepSleepMin:  deepVal,
        remSleepMin:   remVal,
        lightSleepMin: lightVal,
        awakeMin:      awakeVal,
      });

      // 3. Compute scores from history + new biometrics
      const [history, scores28d] = await Promise.all([
        fetchDailyBiometrics(28),
        fetchDailyScores(2),
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

      const sleepFull: SleepLogFull = {
        date,
        hours: sleepHours,
        quality: sleepQuality,
        deepSleepMin:  deepVal,
        remSleepMin:   remVal,
        lightSleepMin: lightVal,
        awakeMin:      awakeVal,
      };

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
                Sleep → Stress → Heart rate → Blood oxygen
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>

          {/* ─── Sleep ─── */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Moon className="h-3 w-3" /> Last Night's Sleep
            </p>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground">Hours</p>
                <p className="font-display text-2xl font-bold text-foreground">
                  {sleepHours.toFixed(1)}<span className="text-sm text-muted-foreground font-normal ml-1">h</span>
                </p>
              </div>
              <Slider value={[sleepHours]} onValueChange={(v) => setSleepHours(v[0])} min={4} max={10} step={0.5} />
            </div>

            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-2">Quality</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSleepQuality(n)}
                    className={`h-11 rounded-lg font-bold text-sm transition-colors ${
                      sleepQuality === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                1 = Restless · 5 = Deep & refreshed
              </p>
            </div>

            <textarea
              value={sleepNotes}
              onChange={(e) => setSleepNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full h-14 rounded-lg bg-muted/50 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              style={{ fontSize: "16px" }}
            />
          </div>

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

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      console.warn("biometric-insight: no session token, skipping AI insight");
      return;
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biometric-insight`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
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

    await updateDailyScoreAIInsight(date, insight, new Date().toISOString());

    queryClient.invalidateQueries({ queryKey: ["daily-scores"] });
  } catch (err) {
    console.error("AI insight generation failed:", err);
  }
}
