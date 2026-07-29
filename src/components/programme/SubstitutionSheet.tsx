import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeftRight, Dumbbell } from "lucide-react";
import type { Exercise } from "@/lib/workout-data";
import { getSubstitutionsFor, type SwapOption } from "@/lib/programme-customizer";

type Props = {
  exercise: Exercise | null;
  onClose: () => void;
  onSwap: (option: SwapOption) => void;
};

export function SubstitutionSheet({ exercise, onClose, onSwap }: Props) {
  const options = exercise ? getSubstitutionsFor(exercise) : [];
  const sameEquip = options.filter((o) => o.sameEquipment);
  const otherEquip = options.filter((o) => !o.sameEquipment);

  return (
    <Sheet open={!!exercise} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-display">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Swap {exercise?.name}
          </SheetTitle>
        </SheetHeader>

        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No substitutions available for this exercise.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {sameEquip.length > 0 && (
              <Section title="Same equipment" items={sameEquip} onSwap={onSwap} />
            )}
            {otherEquip.length > 0 && (
              <Section title="Alternative equipment" items={otherEquip} onSwap={onSwap} />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, items, onSwap }: { title: string; items: SwapOption[]; onSwap: (o: SwapOption) => void }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{title}</h4>
      <div className="space-y-1.5">
        {items.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSwap(opt)}
            className="w-full flex items-center gap-3 rounded-xl bg-muted/40 hover:bg-muted/60 active:scale-[0.99] p-3 text-left transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{opt.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {opt.targetMuscle}{opt.equipment ? ` · ${opt.equipment}` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
