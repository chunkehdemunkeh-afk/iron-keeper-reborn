import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchRecentSets, fetchSleepLogs } from "@/lib/cloud-data";
import { computeMuscleRecovery, statusColor } from "@/lib/recovery";
import { MUSCLE_REGIONS, MUSCLE_LABELS } from "@/lib/muscle-mapping";
import { getUserPreferences } from "@/lib/user-preferences";
import BodyDiagram from "./BodyDiagram";

export default function RecoveryCard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: sets = [] } = useQuery({
    queryKey: ["recent-sets", user?.id],
    queryFn: () => fetchRecentSets(7),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: sleepLogs = [] } = useQuery({
    queryKey: ["sleep-logs", user?.id],
    queryFn: () => fetchSleepLogs(14),
    enabled: !!user,
    staleTime: 60_000,
  });

  const splitId = user ? getUserPreferences(user.id)?.splitId : null;

  const states = useMemo(
    () => computeMuscleRecovery(sets, sleepLogs, splitId),
    [sets, sleepLogs, splitId],
  );

  const counts = useMemo(() => {
    let recovered = 0, workable = 0, fatigued = 0;
    for (const r of MUSCLE_REGIONS) {
      const s = states[r];
      if (s.status === "fatigued") fatigued++;
      else if (s.status === "workable") workable++;
      else if (s.status === "recovered") recovered++;
    }
    return { recovered, workable, fatigued };
  }, [states]);

  // Top 3 most-fatigued worked muscles (skip rested)
  const topFatigued = useMemo(() => {
    return MUSCLE_REGIONS
      .map((r) => states[r])
      .filter((s) => s.status !== "rested")
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [states]);

  return (
    <motion.button
      type="button"
      onClick={() => navigate("/progress?tab=recovery")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-xl p-4 w-full text-left active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3 w-3" /> Recovery
        </p>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <BodyDiagram states={states} view="front" interactive={false} size="sm" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusColor("recovered") }} />
            <span className="text-foreground font-semibold">{counts.recovered}</span>
            <span className="text-muted-foreground">recovered</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusColor("workable") }} />
            <span className="text-foreground font-semibold">{counts.workable}</span>
            <span className="text-muted-foreground">workable</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: statusColor("fatigued") }} />
            <span className="text-foreground font-semibold">{counts.fatigued}</span>
            <span className="text-muted-foreground">fatigued</span>
          </div>

          {topFatigued.length > 0 && topFatigued[0].status === "fatigued" && (
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/30 mt-2">
              Resting: {topFatigued.filter(s => s.status === "fatigued").map(s => MUSCLE_LABELS[s.region]).join(", ")}
            </p>
          )}
        </div>
      </div>
    </motion.button>
  );
}
