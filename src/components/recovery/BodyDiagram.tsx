import { useId, useState } from "react";
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
  /** Externally-controlled muscle highlight (e.g. clicked from a list). */
  highlighted?: MuscleRegion | null;
}

/**
 * Anatomical body diagram. Coordinate space: 220 x 440.
 * The silhouette is a single smooth path; muscle regions are layered on top
 * with rounded, symmetrical shapes drawn with cubic Bezier curves for a
 * polished, illustrated look (rather than the previous angular quadratics).
 */

// Smooth front silhouette — head, neck, shoulders, torso, arms, legs.
const FRONT_SILHOUETTE =
  "M110,18 C122,18 132,28 132,42 C132,52 128,60 122,64 C128,66 134,70 138,76 " +
  "C146,78 160,82 168,94 C176,106 180,124 180,140 C180,156 178,172 174,184 " +
  "C172,190 168,192 164,190 C162,188 160,184 159,178 " +
  "C159,196 162,214 164,232 C166,254 162,278 160,300 C158,328 156,360 154,392 " +
  "C154,406 150,418 142,420 C134,420 130,410 128,398 C126,376 126,348 124,320 " +
  "C122,296 118,272 114,260 C112,256 108,256 106,260 C102,272 98,296 96,320 " +
  "C94,348 94,376 92,398 C90,410 86,420 78,420 C70,418 66,406 66,392 " +
  "C64,360 62,328 60,300 C58,278 54,254 56,232 C58,214 61,196 61,178 " +
  "C60,184 58,188 56,190 C52,192 48,190 46,184 C42,172 40,156 40,140 " +
  "C40,124 44,106 52,94 C60,82 74,78 82,76 C86,70 92,66 98,64 " +
  "C92,60 88,52 88,42 C88,28 98,18 110,18 Z";

const BACK_SILHOUETTE = FRONT_SILHOUETTE; // same outline; muscles differ

// FRONT muscle paths — symmetrical pairs use M…Z M…Z combined.
// Coordinate space: 220 x 440. Centerline x=110.
const FRONT_PATHS: Record<string, string> = {
  // Neck
  neck: "M100,64 C104,68 116,68 120,64 C122,70 122,74 120,78 C116,80 104,80 100,78 C98,74 98,70 100,64 Z",

  // Traps (front, small slope from neck to shoulder)
  traps: "M96,76 C90,80 82,84 78,90 C84,86 92,84 100,82 C100,78 98,76 96,76 Z " +
         "M124,76 C130,80 138,84 142,90 C136,86 128,84 120,82 C120,78 122,76 124,76 Z",

  // Front delts — rounded caps on shoulders
  front_delts: "M82,86 C72,90 64,98 62,110 C70,108 78,104 84,98 C86,94 86,90 82,86 Z " +
               "M138,86 C148,90 156,98 158,110 C150,108 142,104 136,98 C134,94 134,90 138,86 Z",

  // Side delts — outer cap (slim, tucked outside front delts)
  side_delts: "M62,108 C58,112 56,120 58,128 C62,126 66,122 68,116 C68,112 66,108 62,108 Z " +
              "M158,108 C162,112 164,120 162,128 C158,126 154,122 152,116 C152,112 154,108 158,108 Z",

  // Chest — two pec halves with cleavage gap
  chest: "M86,98 C92,94 100,92 108,94 C110,98 110,118 108,128 C100,134 90,134 82,128 " +
         "C78,118 80,106 86,98 Z " +
         "M134,98 C128,94 120,92 112,94 C110,98 110,118 112,128 C120,134 130,134 138,128 " +
         "C142,118 140,106 134,98 Z",

  // Biceps
  biceps: "M58,128 C54,134 52,148 56,160 C62,162 68,158 70,150 C70,140 66,130 60,128 Z " +
          "M162,128 C166,134 168,148 164,160 C158,162 152,158 150,150 C150,140 154,130 160,128 Z",

  // Forearms
  forearms: "M52,164 C48,178 46,196 50,212 C56,212 62,206 62,194 C62,182 58,170 54,164 Z " +
            "M168,164 C172,178 174,196 170,212 C164,212 158,206 158,194 C158,182 162,170 166,164 Z",

  // Abs — rectus abdominis with subtle 6-pack divisions implied via segments
  abs: "M96,134 C104,132 116,132 124,134 C126,146 126,158 124,170 " +
       "C116,172 104,172 96,170 C94,158 94,146 96,134 Z",

  // Obliques — flanking abs
  obliques: "M84,134 C90,138 94,150 94,168 C90,176 82,176 78,168 C76,154 78,142 84,134 Z " +
            "M136,134 C130,138 126,150 126,168 C130,176 138,176 142,168 C144,154 142,142 136,134 Z",

  // Quads — long teardrop shapes
  quads: "M76,200 C84,198 96,200 102,206 C104,224 102,250 96,278 C88,282 78,280 74,274 " +
         "C72,252 72,222 76,200 Z " +
         "M144,200 C136,198 124,200 118,206 C116,224 118,250 124,278 C132,282 142,280 146,274 " +
         "C148,252 148,222 144,200 Z",

  // Calves (front view shows tibialis area — keep as calves block, slimmer)
  calves: "M82,294 C90,294 96,298 98,306 C98,326 94,348 88,362 C82,362 76,358 74,348 " +
          "C72,332 76,308 82,294 Z " +
          "M138,294 C130,294 124,298 122,306 C122,326 126,348 132,362 C138,362 144,358 146,348 " +
          "C148,332 144,308 138,294 Z",
};

const BACK_PATHS: Record<string, string> = {
  neck: "M100,64 C104,68 116,68 120,64 C122,70 122,74 120,78 C116,80 104,80 100,78 C98,74 98,70 100,64 Z",

  // Traps (back, large kite shape from neck down between shoulder blades)
  traps: "M110,72 C124,72 138,80 144,90 C140,96 130,100 110,100 C90,100 80,96 76,90 " +
         "C82,80 96,72 110,72 Z",

  // Rear delts — rounded caps on back of shoulders
  rear_delts: "M82,90 C72,94 64,102 62,114 C70,112 78,108 84,102 C86,98 86,92 82,90 Z " +
              "M138,90 C148,94 156,102 158,114 C150,112 142,108 136,102 C134,98 134,92 138,90 Z",

  // Lats — wing shape under armpits, tapering to waist
  lats: "M76,100 C70,106 64,118 62,134 C62,154 70,170 80,176 C90,178 92,166 92,148 " +
        "C92,128 88,110 82,102 C80,100 78,100 76,100 Z " +
        "M144,100 C150,106 156,118 158,134 C158,154 150,170 140,176 C130,178 128,166 128,148 " +
        "C128,128 132,110 138,102 C140,100 142,100 144,100 Z",

  // Mid back (rhomboids/spinal erectors area between traps and lower back)
  mid_back: "M94,102 C104,100 116,100 126,102 C128,118 128,134 126,150 " +
            "C116,152 104,152 94,150 C92,134 92,118 94,102 Z",

  // Lower back / spinal erectors
  lower_back: "M96,154 C104,152 116,152 124,154 C126,166 126,180 124,192 " +
              "C116,194 104,194 96,192 C94,180 94,166 96,154 Z",

  // Triceps (back of arms — fuller than biceps)
  triceps: "M56,128 C52,134 50,150 54,164 C62,166 70,160 72,150 C72,138 66,128 60,128 Z " +
           "M164,128 C168,134 170,150 166,164 C158,166 150,160 148,150 C148,138 154,128 160,128 Z",

  // Forearms
  forearms: "M52,168 C48,182 46,200 50,216 C56,216 62,210 62,198 C62,186 58,174 54,168 Z " +
            "M168,168 C172,182 174,200 170,216 C164,216 158,210 158,198 C158,186 162,174 166,168 Z",

  // Glutes — two rounded cheeks
  glutes: "M88,196 C100,194 108,196 110,202 C108,218 102,228 92,232 C82,230 76,222 76,210 " +
          "C76,202 82,198 88,196 Z " +
          "M132,196 C120,194 112,196 110,202 C112,218 118,228 128,232 C138,230 144,222 144,210 " +
          "C144,202 138,198 132,196 Z",

  // Hamstrings
  hamstrings: "M78,236 C88,234 98,238 102,246 C104,264 100,284 94,300 C86,302 78,298 76,290 " +
              "C72,272 72,250 78,236 Z " +
              "M142,236 C132,234 122,238 118,246 C116,264 120,284 126,300 C134,302 142,298 144,290 " +
              "C148,272 148,250 142,236 Z",

  // Calves
  calves: "M80,304 C90,302 98,306 100,314 C100,334 96,356 90,370 C82,370 76,366 74,356 " +
          "C72,340 76,318 80,304 Z " +
          "M140,304 C130,302 122,306 120,314 C120,334 124,356 130,370 C138,370 144,366 146,356 " +
          "C148,340 144,318 140,304 Z",
};

/** Returns which view ("front" or "back") best displays a given muscle region. */
export function viewForMuscle(region: MuscleRegion): "front" | "back" {
  if (FRONT_PATHS[region]) return "front";
  if (BACK_PATHS[region]) return "back";
  return "front";
}

export default function BodyDiagram({
  states,
  view = "front",
  interactive = true,
  size = "lg",
  highlighted = null,
}: Props) {
  const [selected, setSelected] = useState<MuscleRegion | null>(null);
  const gradId = useId();
  const glowId = useId();
  const shadeId = useId();
  const pulseId = useId();

  const paths = view === "front" ? FRONT_PATHS : BACK_PATHS;
  const silhouette = view === "front" ? FRONT_SILHOUETTE : BACK_SILHOUETTE;
  const dim = size === "lg" ? "w-full max-w-[280px]" : "w-full max-w-[120px]";

  const hasHighlight = !!highlighted && !!paths[highlighted];

  const renderRegion = (region: MuscleRegion, d: string) => {
    const state = states[region];
    if (!state) return null;
    const fill = statusColor(state.status);
    const isHighlighted = highlighted === region;
    const dimmed = hasHighlight && !isHighlighted;
    return (
      <motion.path
        key={region}
        d={d}
        fill={fill}
        stroke={isHighlighted ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)"}
        strokeWidth={isHighlighted ? 1.4 : 0.6}
        strokeLinejoin="round"
        initial={false}
        animate={{ fill, opacity: dimmed ? 0.32 : 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        onClick={interactive ? () => setSelected(region) : undefined}
        style={{
          cursor: interactive ? "pointer" : "default",
          filter: isHighlighted
            ? `drop-shadow(0 0 6px ${fill}) drop-shadow(0 0 12px ${fill})`
            : undefined,
        }}
        whileTap={interactive ? { scale: 0.97 } : undefined}
      />
    );
  };

  return (
    <>
      <div className={`mx-auto ${dim}`}>
        <svg
          viewBox="0 0 220 440"
          className="w-full h-auto"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))" }}
        >
          <defs>
            {/* Body base gradient — subtle vertical light */}
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(220 16% 22%)" />
              <stop offset="55%" stopColor="hsl(220 18% 15%)" />
              <stop offset="100%" stopColor="hsl(220 20% 10%)" />
            </linearGradient>
            {/* Inner shading on muscles (multiply-style depth) */}
            <radialGradient id={shadeId} cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
            </radialGradient>
            {/* Soft edge glow for the whole silhouette */}
            <filter id={glowId} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>

          {/* Silhouette base */}
          <path
            d={silhouette}
            fill={`url(#${gradId})`}
            stroke="hsl(220 14% 28%)"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />

          {/* Subtle inner highlight along the centerline for depth */}
          <path
            d={silhouette}
            fill="none"
            stroke="hsl(220 18% 30%)"
            strokeWidth={0.6}
            strokeLinejoin="round"
            opacity={0.6}
          />

          {/* Muscle regions */}
          <g>
            {Object.entries(paths).map(([region, d]) => {
              if (region === "neck") {
                // Neck is decorative (not a tracked region) — render flat shading
                return (
                  <path
                    key="neck"
                    d={d}
                    fill="hsl(220 16% 18%)"
                    stroke="hsl(220 14% 26%)"
                    strokeWidth={0.6}
                  />
                );
              }
              return renderRegion(region as MuscleRegion, d);
            })}
          </g>

          {/* Overlay highlight pass — subtle radial light on torso for dimension */}
          <ellipse
            cx="110"
            cy="160"
            rx="70"
            ry="120"
            fill={`url(#${shadeId})`}
            pointerEvents="none"
            opacity={0.55}
          />
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
