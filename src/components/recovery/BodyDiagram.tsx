import { useState } from "react";
import { motion } from "framer-motion";
import type { MuscleRegion } from "@/lib/muscle-mapping";
import { MUSCLE_LABELS } from "@/lib/muscle-mapping";
import type { MuscleState } from "@/lib/recovery";
import { statusColor, statusLabel } from "@/lib/recovery";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface Props {
  states: Record<MuscleRegion, MuscleState>;
  view?: "front" | "back";
  interactive?: boolean;
  size?: "sm" | "lg";
}

// Simplified anatomical SVG paths (anterior + posterior). Coordinate space 200x340.
const FRONT_PATHS: Record<string, string> = {
  // Head (decorative, not a muscle)
  head: "M100,18 a18,20 0 1,0 0.1,0",
  // Chest (left + right combined)
  chest: "M68,72 Q100,68 132,72 Q138,90 130,108 Q115,116 100,116 Q85,116 70,108 Q62,90 68,72 Z",
  // Front delts
  front_delts: "M58,68 Q72,62 78,72 Q72,86 60,88 Q54,80 58,68 Z M142,68 Q128,62 122,72 Q128,86 140,88 Q146,80 142,68 Z",
  // Side delts
  side_delts: "M52,72 Q56,66 60,70 Q60,86 56,92 Q50,86 52,72 Z M148,72 Q144,66 140,70 Q140,86 144,92 Q150,86 148,72 Z",
  // Biceps
  biceps: "M48,94 Q56,92 58,108 Q56,124 48,126 Q42,116 48,94 Z M152,94 Q144,92 142,108 Q144,124 152,126 Q158,116 152,94 Z",
  // Forearms
  forearms: "M42,128 Q48,128 50,150 Q46,168 38,168 Q34,150 42,128 Z M158,128 Q152,128 150,150 Q154,168 162,168 Q166,150 158,128 Z",
  // Abs
  abs: "M84,118 Q100,116 116,118 Q118,140 116,162 Q100,166 84,162 Q82,140 84,118 Z",
  // Obliques
  obliques: "M70,118 Q78,124 82,140 Q78,160 68,166 Q60,150 70,118 Z M130,118 Q122,124 118,140 Q122,160 132,166 Q140,150 130,118 Z",
  // Quads
  quads: "M70,178 Q86,176 92,180 Q94,220 88,250 Q78,254 70,250 Q66,220 70,178 Z M108,180 Q114,176 130,178 Q134,220 130,250 Q122,254 112,250 Q106,220 108,180 Z",
  // Calves (front lower leg view — tibialis area, but show as calves block)
  calves: "M72,258 Q86,258 88,266 Q86,300 80,316 Q74,316 70,300 Q70,272 72,258 Z M112,258 Q126,258 128,266 Q130,272 130,300 Q126,316 120,316 Q114,300 112,266 Z",
};

const BACK_PATHS: Record<string, string> = {
  head: "M100,18 a18,20 0 1,0 0.1,0",
  // Traps
  traps: "M76,52 Q100,46 124,52 Q126,72 110,78 Q100,76 90,78 Q74,72 76,52 Z",
  // Rear delts
  rear_delts: "M58,68 Q72,62 78,74 Q72,88 60,90 Q54,80 58,68 Z M142,68 Q128,62 122,74 Q128,88 140,90 Q146,80 142,68 Z",
  // Lats
  lats: "M64,82 Q80,84 82,108 Q80,140 70,150 Q58,140 56,118 Q56,94 64,82 Z M136,82 Q120,84 118,108 Q120,140 130,150 Q142,140 144,118 Q144,94 136,82 Z",
  // Mid back
  mid_back: "M82,82 Q100,80 118,82 Q120,108 118,128 Q100,132 82,128 Q80,108 82,82 Z",
  // Lower back
  lower_back: "M80,132 Q100,134 120,132 Q122,150 116,166 Q100,170 84,166 Q78,150 80,132 Z",
  // Triceps
  triceps: "M48,94 Q56,92 58,108 Q56,124 48,126 Q42,116 48,94 Z M152,94 Q144,92 142,108 Q144,124 152,126 Q158,116 152,94 Z",
  // Forearms
  forearms: "M42,128 Q48,128 50,150 Q46,168 38,168 Q34,150 42,128 Z M158,128 Q152,128 150,150 Q154,168 162,168 Q166,150 158,128 Z",
  // Glutes
  glutes: "M72,170 Q88,168 100,170 Q112,168 128,170 Q132,194 118,202 Q100,206 82,202 Q68,194 72,170 Z",
  // Hamstrings
  hamstrings: "M70,206 Q86,208 92,212 Q94,238 88,256 Q78,258 70,256 Q66,236 70,206 Z M108,212 Q114,208 130,206 Q134,236 130,256 Q122,258 112,256 Q106,238 108,212 Z",
  // Calves
  calves: "M72,260 Q86,258 90,268 Q90,294 84,316 Q76,316 72,304 Q70,278 72,260 Z M110,268 Q114,258 128,260 Q130,278 128,304 Q124,316 116,316 Q110,294 110,268 Z",
};

export default function BodyDiagram({ states, view = "front", interactive = true, size = "lg" }: Props) {
  const [selected, setSelected] = useState<MuscleRegion | null>(null);

  const paths = view === "front" ? FRONT_PATHS : BACK_PATHS;
  const dim = size === "lg" ? "w-full max-w-[260px]" : "w-full max-w-[140px]";

  const renderRegion = (region: MuscleRegion, d: string) => {
    const state = states[region];
    const fill = statusColor(state.status);
    return (
      <motion.path
        key={region}
        d={d}
        fill={fill}
        stroke="hsl(220 14% 14%)"
        strokeWidth={1}
        initial={false}
        animate={{ fill }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        onClick={interactive ? () => setSelected(region) : undefined}
        style={{ cursor: interactive ? "pointer" : "default" }}
        whileTap={interactive ? { scale: 0.98 } : undefined}
      />
    );
  };

  return (
    <>
      <div className={`mx-auto ${dim}`}>
        <svg viewBox="0 0 200 340" className="w-full h-auto" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}>
          {/* Body silhouette base */}
          <path
            d="M100,18 a18,20 0 1,0 0.1,0 M70,52 Q100,44 130,52 Q140,72 138,92 Q160,96 166,128 Q168,150 158,168 Q150,170 144,166 Q140,148 138,128 Q138,160 134,200 Q138,250 130,280 Q128,310 126,326 Q120,330 112,328 Q108,300 108,260 Q104,224 100,224 Q96,224 92,260 Q92,300 88,328 Q80,330 74,326 Q72,310 70,280 Q62,250 66,200 Q62,160 62,128 Q60,148 56,166 Q50,170 42,168 Q32,150 34,128 Q40,96 62,92 Q60,72 70,52 Z"
            fill="hsl(220 16% 14%)"
            stroke="hsl(220 14% 22%)"
            strokeWidth={1.5}
          />
          {/* Decorative head */}
          <path d={paths.head} fill="hsl(220 16% 18%)" stroke="hsl(220 14% 22%)" strokeWidth={1.2} />
          {/* Muscle regions */}
          {Object.entries(paths).map(([region, d]) => {
            if (region === "head") return null;
            return renderRegion(region as MuscleRegion, d);
          })}
        </svg>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: statusColor(states[selected].status) }}
                  />
                  {MUSCLE_LABELS[selected]}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3 pb-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="text-base font-bold" style={{ color: statusColor(states[selected].status) }}>
                      {statusLabel(states[selected].status)}
                    </p>
                  </div>
                  <div className="glass-card rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recovery</p>
                    <p className="text-base font-bold text-foreground">
                      {Math.round(states[selected].score * 100)}%
                    </p>
                  </div>
                </div>
                {states[selected].lastWorkedAt ? (
                  <div className="glass-card rounded-lg p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Last Worked</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(states[selected].lastWorkedAt!).toLocaleDateString("en-GB", {
                        weekday: "long", day: "numeric", month: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Volume: {Math.round(states[selected].lastVolume)} kg
                      {states[selected].hoursUntilReady > 0 && (
                        <> · Ready in ~{Math.round(states[selected].hoursUntilReady)}h</>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No recent training logged for this muscle.
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
