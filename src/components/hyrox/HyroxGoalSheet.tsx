import { useEffect, useState } from "react";
import { Target, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { hapticMedium } from "@/lib/haptics";
import {
  clearGoal,
  parseTimeInput,
  setGoal,
  suggestTarget,
} from "@/lib/hyrox-goals";
import { formatSeconds, type HyroxBenchmarkSeries } from "@/lib/data/hyrox-benchmark-queries";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  series: HyroxBenchmarkSeries | null;
  currentGoal: number | null;
  onChanged: () => void;
};

export function HyroxGoalSheet({ open, onOpenChange, userId, series, currentGoal, onChanged }: Props) {
  const isTime = series?.def.metric === "time";
  const best = series?.best ?? null;

  const initialValue = (() => {
    if (currentGoal !== null) {
      return isTime ? formatSeconds(currentGoal) : String(currentGoal);
    }
    const suggested = suggestTarget(best, !!isTime);
    if (suggested === null) return "";
    return isTime ? formatSeconds(suggested) : String(suggested);
  })();

  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series?.def.key, currentGoal, open]);

  if (!series) return null;
  const { def } = series;

  function save() {
    if (!series) return;
    const parsed = isTime ? parseTimeInput(value) : parseFloat(value);
    if (parsed === null || isNaN(parsed) || parsed <= 0) {
      toast.error(isTime ? "Enter a time like 4:30" : "Enter a weight in kg");
      return;
    }
    if (isTime && best !== null && parsed >= best) {
      toast.error("Target must be faster than your current best");
      return;
    }
    if (!isTime && best !== null && parsed <= best) {
      toast.error("Target must be heavier than your current best");
      return;
    }
    setGoal(userId, def.key, parsed);
    hapticMedium();
    toast.success("Goal set — you'll get an alert when you hit it");
    onChanged();
    onOpenChange(false);
  }

  function remove() {
    if (!series) return;
    clearGoal(userId, def.key);
    hapticMedium();
    toast("Goal cleared");
    onChanged();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <Target className="h-4 w-4 text-orange-500" />
            Set goal · {def.label}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            {best === null
              ? "No baseline yet — log a session first for a suggested target."
              : (
                <>
                  Current best:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {isTime ? formatSeconds(best) : `${best} kg`}
                  </span>
                </>
              )}
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Target {isTime ? "(m:ss)" : "(kg)"}
            </label>
            <Input
              autoFocus
              inputMode={isTime ? "text" : "decimal"}
              placeholder={isTime ? "4:30" : "80"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1.5 font-display text-lg tabular-nums"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {isTime
                ? "Aim for a time faster than your best. You'll get an alert the moment you hit it."
                : "Aim for a load heavier than your best."}
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={save}>
              Save goal
            </Button>
            {currentGoal !== null && (
              <Button variant="ghost" size="icon" onClick={remove} aria-label="Clear goal">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
