import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  TIERS,
  TIER_LABELS,
  TIER_COLORS,
  type StrengthRating,
} from "@/lib/strength-standards";

interface Props {
  rating: StrengthRating | null;
  bodyweight: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StrengthLevelSheet({ rating, bodyweight, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        {rating && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-xl">{rating.liftName}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                Your est. 1RM: <span className="text-foreground font-semibold">{rating.oneRm}kg</span>
                {bodyweight > 0 && (
                  <> · <span className="text-foreground font-semibold">{rating.ratio}× BW</span></>
                )}
              </p>
            </SheetHeader>

            <div className="mt-5 space-y-4">
              {/* Tier badges */}
              <div className="flex flex-wrap gap-1.5">
                {TIERS.map((t, i) => {
                  const active = t === rating.tier;
                  return (
                    <span
                      key={t}
                      className="px-2 py-1 rounded-md text-[11px] font-semibold transition-all"
                      style={{
                        background: active ? TIER_COLORS[t] : "hsl(220 14% 18%)",
                        color: active ? "white" : "hsl(220 10% 65%)",
                        boxShadow: active ? `0 0 0 1px ${TIER_COLORS[t]}` : "none",
                      }}
                    >
                      {TIER_LABELS[t]}
                      <span className="ml-1.5 opacity-70 tabular-nums">
                        {rating.thresholds[i]}kg
                      </span>
                    </span>
                  );
                })}
              </div>

              {/* Standards table */}
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                  Thresholds for your bodyweight ({bodyweight ? `${Math.round(bodyweight)}kg` : "n/a"})
                  {rating.kgToNextTier !== null && rating.nextTier && (
                    <>
                      {" · "}
                      <span className="text-foreground font-medium">
                        {rating.kgToNextTier}kg
                      </span>{" "}
                      to {TIER_LABELS[rating.nextTier]}
                    </>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/40">
                        {TIERS.map((t) => (
                          <th
                            key={t}
                            className="px-2 py-2 text-center font-semibold text-[10px] uppercase tracking-wider"
                            style={{ color: TIER_COLORS[t] }}
                          >
                            {TIER_LABELS[t]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {rating.thresholds.map((kg, i) => {
                          const isCurrent = i === rating.tierIndex;
                          return (
                            <td
                              key={i}
                              className="px-2 py-3 text-center tabular-nums font-display font-bold"
                              style={{
                                background: isCurrent ? `${TIER_COLORS[TIERS[i]]}22` : "transparent",
                                color: isCurrent ? TIER_COLORS[TIERS[i]] : "hsl(220 10% 75%)",
                              }}
                            >
                              {kg}
                              <span className="text-[9px] opacity-60 ml-0.5">kg</span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground space-y-1 px-1">
                <p>
                  <span className="font-semibold text-foreground">How this is calculated:</span>{" "}
                  Estimated 1RM via Epley formula (weight × (1 + reps/30)). Bodyweight from your
                  latest measurement (or TDEE setup). Targets are age-adjusted using a standard
                  masters coefficient.
                </p>
                <p>
                  Standards are reference values blended from Lon Kilgore and ExRx norms. They are
                  a guide, not a verdict.
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
