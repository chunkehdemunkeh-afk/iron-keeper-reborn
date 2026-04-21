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
 * Anatomical body diagram inspired by reference muscle charts.
 * Coordinate space: 240 x 460. Centerline x=120.
 *
 * Anatomy notes:
 *  - V-taper: shoulders ~width 168px, waist ~84px
 *  - Pecs: clear cleavage gap, lower outline curves under
 *  - Abs: 3 pairs of segments visible (rectus abdominis blocks)
 *  - Lats: classic wing shape from armpit to obliques
 *  - Quads: teardrop with vastus medialis bulge near knee
 *  - Calves (back): diamond/heart-shaped gastrocnemius
 */

// Front silhouette — broader shoulders, V-taper torso, athletic legs.
const FRONT_SILHOUETTE =
  "M120,18 " +
  // head
  "C133,18 144,29 144,44 C144,55 140,63 134,68 " +
  // neck → trapezius slope to shoulder
  "C140,72 146,76 152,80 " +
  // delts cap
  "C168,84 184,94 192,112 " +
  // upper arm outer edge → elbow
  "C196,128 198,148 196,168 " +
  "C194,184 190,200 188,212 " +
  // forearm outer
  "C190,228 192,244 188,260 " +
  // wrist / hand
  "C184,264 178,264 174,260 " +
  "C170,244 168,228 166,212 " +
  // back up inside of arm into armpit / lat
  "C170,196 174,180 174,162 " +
  // side / oblique sweep down to hip
  "C176,182 178,202 178,222 " +
  "C178,236 174,250 170,262 " +
  // hip flare
  "C172,278 172,294 168,310 " +
  // outer thigh
  "C166,328 162,348 160,370 " +
  "C158,392 156,418 152,438 " +
  // foot region
  "C150,448 142,452 136,448 " +
  "C132,440 130,428 128,414 " +
  "C126,392 124,368 122,346 " +
  // crotch dip
  "C120,338 120,338 118,346 " +
  "C116,368 114,392 112,414 " +
  "C110,428 108,440 104,448 " +
  "C98,452 90,448 88,438 " +
  "C84,418 82,392 80,370 " +
  "C78,348 74,328 72,310 " +
  "C68,294 68,278 70,262 " +
  "C66,250 62,236 62,222 " +
  "C62,202 64,182 66,162 " +
  "C66,180 70,196 74,212 " +
  "C72,228 70,244 66,260 " +
  "C62,264 56,264 52,260 " +
  "C48,244 50,228 52,212 " +
  "C50,200 46,184 44,168 " +
  "C42,148 44,128 48,112 " +
  "C56,94 72,84 88,80 " +
  "C94,76 100,72 106,68 " +
  "C100,63 96,55 96,44 " +
  "C96,29 107,18 120,18 Z";

// Back silhouette — same outline (back uses different muscle layer).
const BACK_SILHOUETTE = FRONT_SILHOUETTE;

// FRONT muscle paths
const FRONT_PATHS: Record<string, string> = {
  // Decorative neck shading
  neck:
    "M108,68 C112,72 128,72 132,68 C134,74 134,78 132,82 C128,84 112,84 108,82 C106,78 106,74 108,68 Z",

  // Traps (front collar) — small slope from neck to shoulder
  traps:
    "M104,76 C96,80 86,84 80,90 C92,86 102,84 110,82 C112,78 110,76 104,76 Z " +
    "M136,76 C144,80 154,84 160,90 C148,86 138,84 130,82 C128,78 130,76 136,76 Z",

  // Front delts — round shoulder caps
  front_delts:
    "M88,84 C76,90 66,100 64,116 C74,114 84,108 92,100 C94,94 92,86 88,84 Z " +
    "M152,84 C164,90 174,100 176,116 C166,114 156,108 148,100 C146,94 148,86 152,84 Z",

  // Side delts — outer cap (slim, tucked outside front delts)
  side_delts:
    "M64,114 C58,120 56,132 60,142 C66,140 70,134 72,124 C72,118 70,112 64,114 Z " +
    "M176,114 C182,120 184,132 180,142 C174,140 170,134 168,124 C168,118 170,112 176,114 Z",

  // Pecs — pectoralis major, with cleavage gap and natural lower curve
  chest:
    "M94,98 C104,94 116,92 118,98 C118,118 116,134 110,140 C100,144 88,142 80,134 " +
    "C76,122 80,108 88,100 C90,98 92,98 94,98 Z " +
    "M146,98 C136,94 124,92 122,98 C122,118 124,134 130,140 C140,144 152,142 160,134 " +
    "C164,122 160,108 152,100 C150,98 148,98 146,98 Z",

  // Biceps — bulged upper arm front
  biceps:
    "M52,138 C46,148 44,168 50,182 C58,184 64,178 66,168 C66,154 60,140 54,138 Z " +
    "M188,138 C194,148 196,168 190,182 C182,184 176,178 174,168 C174,154 180,140 186,138 Z",

  // Forearms (brachioradialis + flexors, tapered to wrist)
  forearms:
    "M48,188 C44,206 44,228 48,248 C54,254 60,252 62,242 C62,222 58,202 52,188 Z " +
    "M192,188 C196,206 196,228 192,248 C186,254 180,252 178,242 C178,222 182,202 188,188 Z",

  // Abs — rectus abdominis with 6-pack segments (defined as 3 horizontal divots)
  abs:
    // Outer block
    "M104,144 C112,142 128,142 136,144 C138,160 138,178 136,196 C128,200 112,200 104,196 " +
    "C102,178 102,160 104,144 Z",

  // Obliques — flanks beside abs
  obliques:
    "M88,144 C96,152 100,170 100,196 C96,206 84,206 80,196 C76,180 80,160 88,144 Z " +
    "M152,144 C144,152 140,170 140,196 C144,206 156,206 160,196 C164,180 160,160 152,144 Z",

  // Quads — teardrop shape with vastus medialis (inner head bulge near knee)
  quads:
    "M76,222 C90,218 102,220 108,228 C110,250 108,278 102,310 " +
    "C96,316 86,316 80,310 C76,300 70,288 68,272 " +
    "C66,254 70,236 76,222 Z " +
    "M164,222 C150,218 138,220 132,228 C130,250 132,278 138,310 " +
    "C144,316 154,316 160,310 C164,300 170,288 172,272 " +
    "C174,254 170,236 164,222 Z",

  // Calves (front view = tibialis anterior region — slimmer than back calves)
  calves:
    "M82,326 C92,326 100,332 102,342 C102,362 98,386 92,402 " +
    "C84,402 78,398 76,388 C74,372 76,346 82,326 Z " +
    "M158,326 C148,326 140,332 138,342 C138,362 142,386 148,402 " +
    "C156,402 162,398 164,388 C166,372 164,346 158,326 Z",
};

// BACK muscle paths
const BACK_PATHS: Record<string, string> = {
  neck:
    "M108,68 C112,72 128,72 132,68 C134,74 134,78 132,82 C128,84 112,84 108,82 C106,78 106,74 108,68 Z",

  // Traps — large kite from neck to mid-back between shoulder blades
  traps:
    "M120,74 C136,74 152,82 160,94 " +
    "C156,102 144,108 120,110 C96,108 84,102 80,94 " +
    "C88,82 104,74 120,74 Z",

  // Rear delts — round caps on back of shoulders
  rear_delts:
    "M88,90 C76,94 66,104 64,118 C74,116 84,110 92,104 C94,98 92,90 88,90 Z " +
    "M152,90 C164,94 174,104 176,118 C166,116 156,110 148,104 C146,98 148,90 152,90 Z",

  // Lats — classic wing shape from armpit, sweeping to oblique
  lats:
    "M82,108 C74,118 66,134 64,154 C66,176 76,194 90,200 " +
    "C100,200 104,188 104,170 C104,148 98,128 90,114 " +
    "C88,110 84,108 82,108 Z " +
    "M158,108 C166,118 174,134 176,154 C174,176 164,194 150,200 " +
    "C140,200 136,188 136,170 C136,148 142,128 150,114 " +
    "C152,110 156,108 158,108 Z",

  // Mid back (rhomboids / between shoulder blades)
  mid_back:
    "M104,114 C112,112 128,112 136,114 C140,134 140,154 136,172 " +
    "C128,176 112,176 104,172 C100,154 100,134 104,114 Z",

  // Lower back (erector spinae lumbar)
  lower_back:
    "M106,176 C112,174 128,174 134,176 C138,190 138,208 134,222 " +
    "C128,226 112,226 106,222 C102,208 102,190 106,176 Z",

  // Triceps (back of arms — fuller than biceps)
  triceps:
    "M50,138 C44,150 42,170 48,184 C58,186 66,180 68,168 C68,154 62,138 54,138 Z " +
    "M190,138 C196,150 198,170 192,184 C182,186 174,180 172,168 C172,154 178,138 186,138 Z",

  // Forearms
  forearms:
    "M48,188 C44,206 44,228 48,248 C54,254 60,252 62,242 C62,222 58,202 52,188 Z " +
    "M192,188 C196,206 196,228 192,248 C186,254 180,252 178,242 C178,222 182,202 188,188 Z",

  // Glutes — two rounded cheeks
  glutes:
    "M98,228 C112,224 120,228 120,236 C118,256 110,268 96,272 " +
    "C84,270 78,260 78,246 C78,236 86,230 98,228 Z " +
    "M142,228 C128,224 120,228 120,236 C122,256 130,268 144,272 " +
    "C156,270 162,260 162,246 C162,236 154,230 142,228 Z",

  // Hamstrings — long muscles down back of thigh, slight inner/outer split
  hamstrings:
    "M80,278 C92,274 104,278 108,288 C110,310 106,332 100,352 " +
    "C92,356 82,352 78,344 C72,324 72,298 80,278 Z " +
    "M160,278 C148,274 136,278 132,288 C130,310 134,332 140,352 " +
    "C148,356 158,352 162,344 C168,324 168,298 160,278 Z",

  // Calves — gastrocnemius diamond/heart shape
  calves:
    "M84,358 C94,356 102,360 104,372 " +
    "C106,388 100,408 92,420 " +
    "C84,418 78,412 76,400 C74,386 78,370 84,358 Z " +
    "M156,358 C146,356 138,360 136,372 " +
    "C134,388 140,408 148,420 " +
    "C156,418 162,412 164,400 C166,386 162,370 156,358 Z",
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
  const shadeId = useId();

  const paths = view === "front" ? FRONT_PATHS : BACK_PATHS;
  const silhouette = view === "front" ? FRONT_SILHOUETTE : BACK_SILHOUETTE;
  const dim = size === "lg" ? "w-full max-w-[300px]" : "w-full max-w-[130px]";

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
        stroke={isHighlighted ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.4)"}
        strokeWidth={isHighlighted ? 1.6 : 0.7}
        strokeLinejoin="round"
        initial={false}
        animate={{ fill, opacity: dimmed ? 0.3 : 1 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        onClick={interactive ? () => setSelected(region) : undefined}
        style={{
          cursor: interactive ? "pointer" : "default",
          filter: isHighlighted
            ? `drop-shadow(0 0 6px ${fill}) drop-shadow(0 0 14px ${fill})`
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
          viewBox="0 0 240 460"
          className="w-full h-auto"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.35))" }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(220 16% 24%)" />
              <stop offset="55%" stopColor="hsl(220 18% 16%)" />
              <stop offset="100%" stopColor="hsl(220 20% 11%)" />
            </linearGradient>
            <radialGradient id={shadeId} cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
            </radialGradient>
          </defs>

          {/* Silhouette base */}
          <path
            d={silhouette}
            fill={`url(#${gradId})`}
            stroke="hsl(220 14% 30%)"
            strokeWidth={1.4}
            strokeLinejoin="round"
          />

          {/* Subtle inner contour highlight */}
          <path
            d={silhouette}
            fill="none"
            stroke="hsl(220 18% 32%)"
            strokeWidth={0.6}
            strokeLinejoin="round"
            opacity={0.55}
          />

          {/* Muscle regions */}
          <g>
            {Object.entries(paths).map(([region, d]) => {
              if (region === "neck") {
                return (
                  <path
                    key="neck"
                    d={d}
                    fill="hsl(220 16% 18%)"
                    stroke="hsl(220 14% 28%)"
                    strokeWidth={0.6}
                  />
                );
              }
              return renderRegion(region as MuscleRegion, d);
            })}
          </g>

          {/* Ab segment dividers (subtle lines for the 6-pack illusion) — front view only */}
          {view === "front" && !hasHighlight && (
            <g
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.8}
              strokeLinecap="round"
              fill="none"
              pointerEvents="none"
            >
              {/* Linea alba (vertical centerline) */}
              <line x1="120" y1="146" x2="120" y2="196" />
              {/* Three horizontal divisions */}
              <line x1="106" y1="160" x2="134" y2="160" />
              <line x1="106" y1="174" x2="134" y2="174" />
              <line x1="106" y1="188" x2="134" y2="188" />
              {/* Pec separation */}
              <line x1="120" y1="100" x2="120" y2="138" />
            </g>
          )}

          {/* Back: spine line for definition */}
          {view === "back" && !hasHighlight && (
            <line
              x1="120"
              y1="112"
              x2="120"
              y2="222"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.8}
              strokeLinecap="round"
              pointerEvents="none"
            />
          )}

          {/* Overlay highlight pass — soft radial light on torso for dimension */}
          <ellipse
            cx="120"
            cy="170"
            rx="78"
            ry="130"
            fill={`url(#${shadeId})`}
            pointerEvents="none"
            opacity={0.5}
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
