import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ProgressPhoto } from "@/lib/cloud-data";
import { ArrowLeftRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  photos: ProgressPhoto[];
  weights: Record<string, number>;
}

export default function PhotoCompareSheet({ open, onClose, photos, weights }: Props) {
  const sorted = [...photos].sort((a, b) => a.date.localeCompare(b.date));
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || sorted.length === 0) return;
    setLeftId(sorted[0].id);
    setRightId(sorted[sorted.length - 1].id);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = sorted.find((p) => p.id === leftId) || null;
  const right = sorted.find((p) => p.id === rightId) || null;

  const leftWeight = left ? weights[left.date] : undefined;
  const rightWeight = right ? weights[right.date] : undefined;
  const delta =
    leftWeight != null && rightWeight != null
      ? Number((rightWeight - leftWeight).toFixed(1))
      : null;

  const weeksApart =
    left && right
      ? Math.abs(
          Math.round(
            (new Date(right.date).getTime() - new Date(left.date).getTime()) /
              (1000 * 60 * 60 * 24 * 7),
          ),
        )
      : 0;

  function swap() {
    setLeftId(rightId);
    setRightId(leftId);
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-0 rounded-t-2xl">
        <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3">
          <SheetTitle className="font-display text-lg">Compare photos</SheetTitle>
        </SheetHeader>
        <div className="px-4 py-4 space-y-4">
          {sorted.length < 2 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">
                You need at least 2 photos to compare.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <PhotoColumn
                  label="Before"
                  photo={left}
                  weight={leftWeight}
                  options={sorted}
                  selectedId={leftId}
                  onChange={setLeftId}
                />
                <PhotoColumn
                  label="After"
                  photo={right}
                  weight={rightWeight}
                  options={sorted}
                  selectedId={rightId}
                  onChange={setRightId}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={swap}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1.5"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" /> Swap
                </button>
                {delta != null && (
                  <p className="text-sm font-semibold text-foreground">
                    {delta > 0 ? "+" : ""}
                    {delta} kg
                    {weeksApart > 0 && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">
                        over {weeksApart} {weeksApart === 1 ? "week" : "weeks"}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PhotoColumn({
  label,
  photo,
  weight,
  options,
  selectedId,
  onChange,
}: {
  label: string;
  photo: ProgressPhoto | null;
  weight?: number;
  options: ProgressPhoto[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {photo?.signedUrl ? (
        <img src={photo.signedUrl} alt={label} className="w-full aspect-[3/4] object-cover rounded-xl" />
      ) : (
        <div className="w-full aspect-[3/4] bg-muted/40 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
          —
        </div>
      )}
      <select
        value={selectedId || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-card/60 border border-border/40 rounded-lg px-2 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
      >
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {new Date(p.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
          </option>
        ))}
      </select>
      {weight != null && (
        <p className="text-[11px] text-center text-muted-foreground">{weight} kg</p>
      )}
    </div>
  );
}
