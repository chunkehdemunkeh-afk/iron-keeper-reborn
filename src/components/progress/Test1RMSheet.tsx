import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { WORKOUTS } from "@/lib/workout-data";
import { getAllCustomWorkouts } from "@/pages/WorkoutBuilder";
import { TIER_COLORS } from "@/lib/strength-standards";
import type { LiftDef } from "@/lib/strength-standards";

interface Props {
  lift: LiftDef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Quick-launch sheet to start a 1RM test for a specific lift. */
export default function Test1RMSheet({ lift, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [matchingWorkouts, setMatchingWorkouts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!lift) return;
    const all = [...WORKOUTS, ...getAllCustomWorkouts()];
    const matches: { id: string; name: string }[] = [];
    for (const w of all) {
      const hit = w.exercises.some((ex) => {
        const hay = `${ex.name} ${ex.id}`.toLowerCase();
        return lift.matchers.some((m) => hay.includes(m));
      });
      if (hit) matches.push({ id: w.id, name: w.name });
    }
    setMatchingWorkouts(matches.slice(0, 4));
  }, [lift]);

  if (!lift) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${TIER_COLORS.elite}22`, color: TIER_COLORS.elite }}
            >
              <Target className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>Test your 1RM</SheetTitle>
              <SheetDescription>
                Log a real 1-rep max for {lift.name}.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Open a workout that includes <span className="font-semibold text-foreground">{lift.name}</span>,
            tap the amber <span className="inline-flex items-center gap-1 font-mono">
              <Target className="h-3 w-3 inline" />1RM
            </span> button on that exercise to add a single test set, then load the bar and go for the lift.
          </p>

          {matchingWorkouts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Workouts with this lift
              </p>
              {matchingWorkouts.map((w) => (
                <Button
                  key={w.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/workout/${w.id}`);
                  }}
                >
                  <Target className="h-4 w-4 mr-2 text-amber-400" />
                  Open {w.name}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No workouts in your library currently contain {lift.name}. Add it to a custom workout first.
            </p>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
