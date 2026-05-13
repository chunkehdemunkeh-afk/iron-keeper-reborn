import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Heart, Activity, Moon, Droplet, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDailyBiometrics } from "@/hooks/queries/useDailyBiometrics";
import { useDailyScores } from "@/hooks/queries/useDailyScores";
import { useSleepLogs } from "@/hooks/queries/useSleepLogs";
import BiometricCheckIn from "@/components/biometrics/BiometricCheckIn";
import { recoveryColor, recoveryLabel } from "@/lib/recovery-scores";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

const RANGE_DAYS = 90;

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default function CheckInHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: biometrics = [], isLoading: bLoad } = useDailyBiometrics(RANGE_DAYS, { range: `${RANGE_DAYS}d` });
  const { data: scores = [], isLoading: sLoad } = useDailyScores(RANGE_DAYS, { range: `${RANGE_DAYS}d` });
  const { data: sleepLogs = [], isLoading: slLoad } = useSleepLogs(RANGE_DAYS);

  const [editDate, setEditDate] = useState<string | null>(null);

  const rows = useMemo(() => {
    const map = new Map<string, {
      date: string;
      biometric?: typeof biometrics[number];
      score?: typeof scores[number];
      sleep?: typeof sleepLogs[number];
    }>();
    for (const b of biometrics) {
      if (b.samsungStressScore == null && b.restingHr == null && b.spo2Pct == null && b.respiratoryRate == null) continue;
      map.set(b.date, { ...(map.get(b.date) ?? { date: b.date }), date: b.date, biometric: b });
    }
    for (const s of scores) {
      if (!map.has(s.date)) continue; // only show days the user actually checked in
      map.set(s.date, { ...map.get(s.date)!, score: s });
    }
    for (const sl of sleepLogs) {
      if (!map.has(sl.date)) continue;
      map.set(sl.date, { ...map.get(sl.date)!, sleep: sl });
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [biometrics, scores, sleepLogs]);

  const editRow = editDate ? rows.find(r => r.date === editDate) : null;
  const loading = bLoad || sLoad || slLoad;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-10 w-10 -ml-2 rounded-full flex items-center justify-center active:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl font-bold"
            >
              Morning Check-ins
            </motion.h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Last {RANGE_DAYS} days · tap to edit
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><LoadingState label="Loading check-ins" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No check-ins yet"
            description="Your saved morning check-ins will appear here."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const recovery = r.score?.recoveryScore;
              const ringColor = recovery != null ? recoveryColor(recovery) : "hsl(var(--muted-foreground))";
              return (
                <motion.button
                  key={r.date}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setEditDate(r.date)}
                  className="w-full text-left rounded-2xl bg-card hairline border p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    {/* Recovery dot */}
                    <div
                      className="flex-shrink-0 h-12 w-12 rounded-full flex flex-col items-center justify-center"
                      style={{ background: `${ringColor}22`, border: `2px solid ${ringColor}` }}
                    >
                      {recovery != null ? (
                        <>
                          <span className="font-display text-base font-bold leading-none" style={{ color: ringColor }}>
                            {Math.round(recovery)}
                          </span>
                          <span className="text-[8px] text-muted-foreground leading-none mt-0.5">REC</span>
                        </>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">—</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold text-sm text-foreground">{formatDate(r.date)}</p>
                        {recovery != null && (
                          <p className="text-[10px] font-semibold" style={{ color: ringColor }}>
                            {recoveryLabel(recovery)}
                          </p>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {r.sleep?.hours != null && (
                          <span className="flex items-center gap-1">
                            <Moon className="h-3 w-3" />
                            {r.sleep.hours.toFixed(1)}h
                          </span>
                        )}
                        {r.biometric?.restingHr != null && (
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {r.biometric.restingHr} bpm
                          </span>
                        )}
                        {r.biometric?.samsungStressScore != null && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {r.biometric.samsungStressScore}
                          </span>
                        )}
                        {r.biometric?.spo2Pct != null && (
                          <span className="flex items-center gap-1">
                            <Droplet className="h-3 w-3" />
                            {r.biometric.spo2Pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>

                    <Edit2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {editRow && (
        <BiometricCheckIn
          open={!!editDate}
          date={editRow.date}
          onClose={() => setEditDate(null)}
          prefill={{
            samsungStressScore: editRow.biometric?.samsungStressScore ?? undefined,
            restingHr: editRow.biometric?.restingHr ?? undefined,
            spo2Pct: editRow.biometric?.spo2Pct ?? undefined,
            respiratoryRate: editRow.biometric?.respiratoryRate ?? undefined,
            sleepHours: editRow.sleep?.hours,
            sleepQuality: editRow.sleep?.quality,
            sleepNotes: editRow.sleep?.notes ?? undefined,
            deepMin: editRow.sleep?.deepSleepMin,
            remMin: editRow.sleep?.remSleepMin,
            lightMin: editRow.sleep?.lightSleepMin,
            awakeMin: editRow.sleep?.awakeMin,
          }}
        />
      )}
    </div>
  );
}
