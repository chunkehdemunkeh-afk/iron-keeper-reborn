import { supabase } from "@/integrations/supabase/client";
import { HYROX_BENCHMARKS, type HyroxBenchmarkDef } from "@/lib/hyrox-workouts";

export type HyroxBenchmarkPoint = {
  date: string;      // ISO
  /** Raw value stored in workout_sets.weight (seconds for time metric, kg for weight metric). */
  value: number;
  reps: number;
  isPr: boolean;
};

export type HyroxBenchmarkSeries = {
  def: HyroxBenchmarkDef;
  points: HyroxBenchmarkPoint[];
  /** Best-ever value: min for time, max for weight. */
  best: number | null;
  /** Latest recorded value. */
  latest: number | null;
  /** Improvement vs first record (positive = better). */
  delta: number | null;
};

/**
 * Fetch every Hyrox benchmark series in one round-trip.
 * Time-based benchmarks track lowest weight (== fastest seconds).
 * Weight-based benchmarks track highest weight.
 */
export async function fetchHyroxBenchmarks(): Promise<HyroxBenchmarkSeries[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const allIds = HYROX_BENCHMARKS.flatMap((b) => b.exerciseIds);
  if (allIds.length === 0) return [];

  // Page through — Supabase caps at 1000 rows.
  const PAGE = 1000;
  type Row = { exercise_id: string; weight: number | string; reps: number; created_at: string };
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight, reps, created_at")
      .eq("user_id", user.id)
      .in("exercise_id", allIds)
      .gt("weight", 0)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !page || page.length === 0) break;
    rows.push(...(page as Row[]));
    if (page.length < PAGE) break;
  }

  // Group by benchmark key
  const idToKey: Record<string, string> = {};
  HYROX_BENCHMARKS.forEach((b) => b.exerciseIds.forEach((id) => (idToKey[id] = b.key)));

  const grouped: Record<string, HyroxBenchmarkPoint[]> = {};
  for (const r of rows) {
    const key = idToKey[r.exercise_id];
    if (!key) continue;
    const v = Number(r.weight);
    if (!v || Number.isNaN(v)) continue;
    (grouped[key] ??= []).push({
      date: r.created_at,
      value: v,
      reps: r.reps,
      isPr: false, // filled below
    });
  }

  return HYROX_BENCHMARKS.map((def) => {
    const pts = (grouped[def.key] ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const lowerBetter = def.metric === "time";

    // Mark PRs as we walk forward
    let running: number | null = null;
    for (const p of pts) {
      const better =
        running === null ||
        (lowerBetter ? p.value < running : p.value > running);
      if (better) {
        running = p.value;
        p.isPr = true;
      }
    }

    const best = running;
    const latest = pts.length ? pts[pts.length - 1].value : null;
    const first = pts.length ? pts[0].value : null;
    const delta =
      first !== null && latest !== null
        ? lowerBetter
          ? first - latest        // seconds saved
          : latest - first        // kg gained
        : null;

    return { def, points: pts, best, latest, delta };
  });
}

/** Format seconds as m:ss for chart labels and PR display. */
export function formatSeconds(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Pace as m:ss per 500m (erg standard) or per km (running). */
export function formatPace(seconds: number, distanceM: number, per: "500m" | "1km"): string {
  const perMetres = per === "500m" ? 500 : 1000;
  const pace = (seconds / distanceM) * perMetres;
  return `${formatSeconds(pace)} /${per}`;
}
