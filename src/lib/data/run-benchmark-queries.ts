import { supabase } from "@/integrations/supabase/client";
import { RUN_BENCHMARKS, type RunBenchmarkDef, predictHalfSeconds } from "@/lib/run-workouts";

export type RunBenchmarkPoint = {
  date: string;   // ISO
  /** Elapsed seconds (stored in workout_sets.weight). */
  value: number;
  /** Distance in metres (stored in reps). */
  metres: number;
  isPr: boolean;
};

export type RunBenchmarkSeries = {
  def: RunBenchmarkDef;
  points: RunBenchmarkPoint[];
  /** Fastest ever, in seconds. */
  best: number | null;
  latest: number | null;
  /** Seconds saved since the first record (positive = faster). */
  delta: number | null;
};

/** Fetch every run benchmark series in one round-trip. Lower seconds is better. */
export async function fetchRunBenchmarks(): Promise<RunBenchmarkSeries[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const allIds = RUN_BENCHMARKS.flatMap((b) => b.exerciseIds);
  if (allIds.length === 0) return [];

  const orFilter = allIds
    .flatMap((id) => [`exercise_id.eq.${id}`, `exercise_id.like.${id}-r%`])
    .join(",");

  const PAGE = 1000;
  type Row = { exercise_id: string; weight: number | string; reps: number; created_at: string };
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight, reps, created_at")
      .eq("user_id", user.id)
      .or(orFilter)
      .gt("weight", 0)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !page || page.length === 0) break;
    rows.push(...(page as Row[]));
    if (page.length < PAGE) break;
  }

  const baseIdToKey: Array<{ base: string; key: string }> = [];
  RUN_BENCHMARKS.forEach((b) => b.exerciseIds.forEach((id) => baseIdToKey.push({ base: id, key: b.key })));
  baseIdToKey.sort((a, b) => b.base.length - a.base.length);
  function keyFor(exerciseId: string): string | null {
    for (const { base, key } of baseIdToKey) {
      if (exerciseId === base || exerciseId.startsWith(`${base}-r`)) return key;
    }
    return null;
  }

  const grouped: Record<string, RunBenchmarkPoint[]> = {};
  for (const r of rows) {
    const key = keyFor(r.exercise_id);
    if (!key) continue;
    const v = Number(r.weight);
    if (!v || Number.isNaN(v)) continue;
    (grouped[key] ??= []).push({ date: r.created_at, value: v, metres: r.reps, isPr: false });
  }

  return RUN_BENCHMARKS.map((def) => {
    const pts = (grouped[def.key] ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    let running: number | null = null;
    for (const p of pts) {
      if (running === null || p.value < running) {
        running = p.value;
        p.isPr = true;
      }
    }
    const best = running;
    const latest = pts.length ? pts[pts.length - 1].value : null;
    const first = pts.length ? pts[0].value : null;
    const delta = first !== null && latest !== null ? first - latest : null;
    return { def, points: pts, best, latest, delta };
  });
}

/** Pace in seconds per km. */
export function paceSecPerKm(seconds: number, distanceM: number): number {
  return (seconds / distanceM) * 1000;
}

/**
 * Projected half marathon finish from the best available benchmark.
 * Prefers the longest reliable effort (an actual half > long run > tempo > rep).
 */
export function projectHalfTime(series: RunBenchmarkSeries[]): { seconds: number; from: string } | null {
  const order = ["half", "long-18k", "long-15k", "long-10k", "tempo-5k", "race-3k", "tempo-3k", "run-1k", "run-800", "run-400"];
  for (const key of order) {
    const s = series.find((x) => x.def.key === key);
    if (s?.best) {
      const seconds = key === "half" ? s.best : predictHalfSeconds(s.best, s.def.distance);
      return { seconds, from: s.def.label };
    }
  }
  return null;
}
