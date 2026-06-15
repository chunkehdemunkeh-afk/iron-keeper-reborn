import { useState } from "react";
import { motion } from "framer-motion";
import { Settings2, Sliders, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { hapticSuccess } from "@/lib/haptics";
import { toast } from "sonner";
import {
  getRecoverySettings,
  saveRecoverySettings,
  type RecoveryModel,
} from "@/lib/recovery-settings";
import { isDeloadEnabled, setDeloadEnabled } from "@/lib/data/deload-queries";

const MODEL_OPTIONS: {
  value: RecoveryModel;
  label: string;
  description: string;
}[] = [
  {
    value: "strict",
    label: "Strict",
    description: "Conservative — assume muscles take ~25% longer to recover.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Default — research-backed recovery windows per muscle group.",
  },
  {
    value: "flexible",
    label: "Flexible",
    description: "Aggressive — assume muscles bounce back ~20% faster.",
  },
];

export default function RecoverySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const initial = user ? getRecoverySettings(user.id) : getRecoverySettings(null);
  const [model, setModel] = useState<RecoveryModel>(initial.model);
  const [sleepWeight, setSleepWeight] = useState<number>(initial.sleepWeight);
  const [deloadOn, setDeloadOn] = useState<boolean>(user ? isDeloadEnabled(user.id) : true);

  function handleOpenChange(next: boolean) {
    if (next && user) {
      // Refresh from storage when re-opening
      const fresh = getRecoverySettings(user.id);
      setModel(fresh.model);
      setSleepWeight(fresh.sleepWeight);
      setDeloadOn(isDeloadEnabled(user.id));
    }
    setOpen(next);
  }

  function handleSave() {
    if (!user) return;
    saveRecoverySettings(user.id, { model, sleepWeight });
    setDeloadEnabled(user.id, deloadOn);
    hapticSuccess();
    toast.success("Recovery settings saved");
    // Invalidate any query that depends on settings (recompute happens client-side
    // but invalidating ensures all subscribers re-render).
    queryClient.invalidateQueries({ queryKey: queryKeys.recentSets(user.id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.sleepLogs(user.id) });
    setOpen(false);
  }

  const sleepLabel =
    sleepWeight === 0
      ? "Off"
      : sleepWeight < 1
        ? "Low"
        : sleepWeight === 1
          ? "Default"
          : sleepWeight < 1.75
            ? "High"
            : "Maximum";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-full px-2.5 py-1 hover:bg-primary/20 transition-colors"
          aria-label="Recovery settings"
        >
          <Settings2 className="h-3 w-3" />
          Settings
        </motion.button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            Recovery Settings
          </SheetTitle>
          <SheetDescription>
            Tune how the app estimates your readiness.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {/* Recovery model */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Recovery model
            </p>
            <div className="space-y-2">
              {MODEL_OPTIONS.map((opt) => {
                const selected = opt.value === model;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setModel(opt.value)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                      selected
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/40 bg-card/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          selected ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {opt.label}
                      </span>
                      {selected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleep impact */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Sleep impact
              </p>
              <span className="text-xs font-medium text-primary">
                {sleepLabel} · ×{sleepWeight.toFixed(2)}
              </span>
            </div>
            <Slider
              value={[sleepWeight]}
              onValueChange={(v) => setSleepWeight(v[0] ?? 1)}
              min={0}
              max={2}
              step={0.25}
              aria-label="Sleep impact weight"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Off</span>
              <span>Default</span>
              <span>Maximum</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Controls how much last night's sleep speeds up or slows down recovery.
              Off ignores sleep entirely; Maximum doubles the bonus or penalty.
            </p>
          </div>

          {/* Deload recommendations */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Deload recommendations
            </p>
            <button
              type="button"
              onClick={() => setDeloadOn(v => !v)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors flex items-center justify-between ${
                deloadOn ? "border-primary/60 bg-primary/10" : "border-border/40 bg-card/40"
              }`}
            >
              <div className="min-w-0 pr-3">
                <p className="text-sm font-semibold text-foreground">
                  Auto-suggest deload weeks
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Watches your logged sessions, recovery and tonnage. A deload week
                  is only generated if you accept the suggestion.
                </p>
              </div>
              <span
                className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 relative ${
                  deloadOn ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    deloadOn ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>


          <button
            onClick={handleSave}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            Save changes
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
