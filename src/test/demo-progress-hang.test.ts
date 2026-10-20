import { describe, it, expect } from "vitest";

// Repro: which Progress-page query never settles in demo mode?
describe("demo mode Progress queries", () => {
  it("fetchWorkoutHistory / fetchVolumeData / fetchPersonalRecords all settle", async () => {
    sessionStorage.setItem("ik-demo", "1");
    const { supabase } = await import("@/lib/demo-supabase");
    const { fetchWorkoutHistory, fetchVolumeData, fetchPersonalRecords } = await import("@/lib/data/workout-queries");

    const withTimeout = <T,>(p: Promise<T>, ms: number, tag: string) =>
      Promise.race([
        p.then(() => `${tag}: settled`, (e) => `${tag}: rejected ${String(e).slice(0, 80)}`),
        new Promise<string>((res) => setTimeout(() => res(`${tag}: TIMEOUT (never settled)`), ms)),
      ]);

    const results = await Promise.all([
      withTimeout(fetchWorkoutHistory(), 3000, "history"),
      withTimeout(fetchVolumeData(), 3000, "volume"),
      withTimeout(fetchPersonalRecords(), 3000, "prs"),
    ]);
    console.log("RESULTS:", results);
    expect(results.length).toBe(3);
  }, 15000);

  it("demo builder .range() exists", async () => {
    sessionStorage.setItem("ik-demo", "1");
    const { supabase } = await import("@/lib/demo-supabase");
    const b: any = supabase.from("workout_sets");
    console.log("has range:", typeof b.range, "has gt:", typeof b.gt, "has then:", typeof b.then);
  });
});
