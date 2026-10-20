import { describe, it, expect } from "vitest";

/**
 * Demo-mode query builder must support every builder method the Progress page
 * queries use. A missing method throws during chain construction, so the
 * personal-records query fails and Progress never leaves its loading state.
 */
describe("demo supabase builder", () => {
  it("supports gt, lt, contains and range used by app queries", async () => {
    sessionStorage.setItem("ik-demo", "1");
    const { supabase } = await import("@/lib/demo-supabase");
    const b: any = supabase.from("workout_sets");
    expect(typeof b.range).toBe("function");
    expect(typeof b.gt).toBe("function");
    expect(typeof b.lt).toBe("function");
    expect(typeof b.contains).toBe("function");
  });

  it("range pages results (0..999 inclusive window)", async () => {
    sessionStorage.setItem("ik-demo", "1");
    const { supabase } = await import("@/lib/demo-supabase");
    const { data, error } = await supabase
      .from("workout_sets")
      .select("id")
      .range(0, 999);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("Progress-page queries (history, volume, PRs) all settle in demo mode", async () => {
    sessionStorage.setItem("ik-demo", "1");
    const { supabase } = await import("@/lib/demo-supabase");
    const { fetchWorkoutHistory, fetchVolumeData, fetchPersonalRecords } =
      await import("@/lib/data/workout-queries");

    const withTimeout = <T,>(p: Promise<T>, tag: string) =>
      Promise.race([
        p.then(() => `${tag}: settled`, (e) => `${tag}: rejected ${String(e).slice(0, 80)}`),
        new Promise<string>((res) => setTimeout(() => res(`${tag}: never settled`), 3000)),
      ]);

    const results = await Promise.all([
      withTimeout(fetchWorkoutHistory(), "history"),
      withTimeout(fetchVolumeData(), "volume"),
      withTimeout(fetchPersonalRecords(), "prs"),
    ]);
    for (const r of results) expect(r).toMatch(/settled$/);
    expect(results).not.toContain("prs: never settled");
  }, 15000);
});
