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

// Clean front silhouette: head, neck, attached arms with armpit notch,
// V-taper torso, separated legs. Single closed path (no self-intersections).
const FRONT_SILHOUETTE =
  "M120,22 " +
  // Head + jaw
  "C133,22 144,32 144,46 C144,57 139,65 133,69 " +
  // Right neck
  "C133,73 135,77 138,80 " +
  // Right trap → shoulder cap → outer arm
  "C150,82 164,86 178,98 " +
  "C188,108 194,124 196,144 " +
  "C198,164 200,186 202,208 " +
  "C204,228 204,248 200,266 " +
  "C196,276 192,278 188,276 " +
  // Right hand / wrist
  "C184,280 178,278 176,272 " +
  "C174,254 174,234 174,214 " +
  "C172,196 170,178 170,160 " +
  // Right armpit notch (curve back into torso)
  "C168,150 164,144 158,142 " +
  // Right side of torso (lat → waist)
  "C156,164 158,184 158,204 " +
  "C158,224 154,240 150,254 " +
  // Right hip flare → outer thigh → shin → foot
  "C156,266 160,282 162,300 " +
  "C164,326 162,354 158,382 " +
  "C156,408 152,432 150,446 " +
  "C148,454 142,456 138,452 " +
  "C136,446 134,432 133,418 " +
  // Right inner shin → thigh going UP
  "C130,394 128,368 126,344 " +
  "C124,322 122,308 120,302 " +
  // Crotch
  "C120,300 120,300 120,302 " +
  "C118,308 116,322 114,344 " +
  // Left inner thigh → shin going DOWN
  "C112,368 110,394 107,418 " +
  "C106,432 104,446 102,452 " +
  "C98,456 92,454 90,446 " +
  // Left outer shin → thigh
  "C88,432 84,408 82,382 " +
  "C78,354 76,326 78,300 " +
  // Left hip → waist
  "C80,282 84,266 90,254 " +
  "C86,240 82,224 82,204 " +
  "C82,184 84,164 82,142 " +
  // Left armpit notch
  "C76,144 72,150 70,160 " +
  "C70,178 68,196 66,214 " +
  "C66,234 66,254 64,272 " +
  // Left hand / wrist
  "C62,278 56,280 52,276 " +
  "C48,278 44,276 40,266 " +
  // Left outer arm → shoulder
  "C36,248 36,228 38,208 " +
  "C40,186 42,164 44,144 " +
  "C46,124 52,108 62,98 " +
  "C76,86 90,82 102,80 " +
  // Left neck
  "C105,77 107,73 107,69 " +
  "C101,65 96,57 96,46 C96,32 107,22 120,22 Z";

// Back silhouette — identical outline; muscle layer differs.
const BACK_SILHOUETTE = FRONT_SILHOUETTE;

// FRONT muscle paths
const FRONT_PATHS: Record<string, string> = {
  neck:
    "M110,66 C114,70 126,70 130,66 L130,82 C126,86 114,86 110,82 Z",

  traps:
    "M106,76 C96,80 84,84 74,94 C84,88 98,84 110,82 Z " +
    "M134,76 C144,80 156,84 166,94 C156,88 142,84 130,82 Z",

  front_delts:
    "M78,84 C62,88 52,104 54,124 C56,138 68,144 82,138 C92,126 92,108 86,96 C84,90 82,84 78,84 Z " +
    "M162,84 C178,88 188,104 186,124 C184,138 172,144 158,138 C148,126 148,108 154,96 C156,90 158,84 162,84 Z",

  side_delts:
    "M54,122 C48,134 50,150 62,156 C70,150 74,138 72,126 C70,118 60,114 54,122 Z " +
    "M186,122 C192,134 190,150 178,156 C170,150 166,138 168,126 C170,118 180,114 186,122 Z",

  chest:
    "M82,98 C96,90 116,92 118,108 C120,132 116,150 106,156 C90,158 76,148 72,134 C68,116 72,104 82,98 Z " +
    "M158,98 C144,90 124,92 122,108 C120,132 124,150 134,156 C150,158 164,148 168,134 C172,116 168,104 158,98 Z",

  biceps:
    "M54,138 C46,152 44,174 52,192 C62,196 70,190 72,176 C72,158 64,140 56,138 Z " +
    "M186,138 C194,152 196,174 188,192 C178,196 170,190 168,176 C168,158 176,140 184,138 Z",

  forearms:
    "M50,198 C44,220 44,244 50,264 C56,270 64,266 66,256 C64,234 58,214 52,198 Z " +
    "M190,198 C196,220 196,244 190,264 C184,270 176,266 174,256 C176,234 182,214 188,198 Z",

  abs:
    "M106,156 C116,154 124,154 134,156 L136,218 C128,222 112,222 104,218 Z",

  obliques:
    "M82,156 C96,160 104,178 104,212 C100,224 84,224 78,212 C72,192 74,170 82,156 Z " +
    "M158,156 C144,160 136,178 136,212 C140,224 156,224 162,212 C168,192 166,170 158,156 Z",

  quads:
    "M80,256 C94,248 112,252 118,266 C122,294 120,330 110,364 C100,370 86,366 78,354 C70,330 68,296 80,256 Z " +
    "M160,256 C146,248 128,252 122,266 C118,294 120,330 130,364 C140,370 154,366 162,354 C170,330 172,296 160,256 Z",

  calves:
    "M82,368 C96,364 106,372 106,390 C108,414 100,436 88,446 C80,444 72,434 72,416 C70,398 74,380 82,368 Z " +
    "M158,368 C144,364 134,372 134,390 C132,414 140,436 152,446 C160,444 168,434 168,416 C166,398 162,380 158,368 Z",
};

// BACK muscle paths
const BACK_PATHS: Record<string, string> = {
  neck:
    "M110,66 C114,70 126,70 130,66 L130,82 C126,86 114,86 110,82 Z",

  traps:
    "M120,76 C138,76 160,84 170,100 " +
    "C162,114 144,120 120,120 C96,120 78,114 70,100 " +
    "C80,84 102,76 120,76 Z",

  rear_delts:
    "M60,94 C50,106 50,126 64,138 C76,134 84,120 82,106 C80,96 68,88 60,94 Z " +
    "M180,94 C190,106 190,126 176,138 C164,134 156,120 158,106 C160,96 172,88 180,94 Z",

  lats:
    "M82,116 C70,130 62,156 62,182 C64,210 80,228 98,232 " +
    "C114,228 118,206 116,180 C114,152 100,132 88,118 Z " +
    "M158,116 C170,130 178,156 178,182 C176,210 160,228 142,232 " +
    "C126,228 122,206 124,180 C126,152 140,132 152,118 Z",

  mid_back:
    "M108,120 C116,118 124,118 132,120 C136,148 136,172 132,188 " +
    "C124,192 116,192 108,188 C104,172 104,148 108,120 Z",

  lower_back:
    "M108,190 C116,188 124,188 132,190 C136,208 136,232 130,246 " +
    "C124,250 116,250 110,246 C104,232 104,208 108,190 Z",

  triceps:
    "M52,132 C44,148 42,172 50,192 C62,198 72,190 74,174 C74,154 64,134 56,132 Z " +
    "M188,132 C196,148 198,172 190,192 C178,198 168,190 166,174 C166,154 176,134 184,132 Z",

  forearms:
    "M50,198 C44,220 44,244 50,264 C56,270 64,266 66,256 C64,234 58,214 52,198 Z " +
    "M190,198 C196,220 196,244 190,264 C184,270 176,266 174,256 C176,234 182,214 188,198 Z",

  glutes:
    "M96,246 C112,240 120,248 120,264 C118,288 106,304 90,308 " +
    "C76,304 68,286 70,266 C72,250 82,244 96,246 Z " +
    "M144,246 C128,240 120,248 120,264 C122,288 134,304 150,308 " +
    "C164,304 172,286 170,266 C168,250 158,244 144,246 Z",

  hamstrings:
    "M80,308 C94,302 112,306 118,320 C122,348 118,380 108,400 " +
    "C96,404 82,400 76,388 C68,362 68,328 80,308 Z " +
    "M160,308 C146,302 128,306 122,320 C118,348 122,380 132,400 " +
    "C144,404 158,400 164,388 C172,362 172,328 160,308 Z",

  calves:
    "M84,402 C98,398 110,406 112,424 C114,444 104,456 92,456 " +
    "C82,454 74,442 74,424 C74,408 78,406 84,402 Z " +
    "M156,402 C142,398 130,406 128,424 C126,444 136,456 148,456 " +
    "C158,454 166,442 166,424 C166,408 162,406 156,402 Z",
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
              <line x1="120" y1="158" x2="120" y2="218" />
              {/* Three horizontal divisions */}
              <line x1="107" y1="170" x2="133" y2="170" />
              <line x1="107" y1="184" x2="133" y2="184" />
              <line x1="107" y1="198" x2="133" y2="198" />
              {/* Pec separation */}
              <line x1="120" y1="100" x2="120" y2="154" />
            </g>
          )}

          {/* Back: spine line for definition */}
          {view === "back" && !hasHighlight && (
            <line
              x1="120"
              y1="120"
              x2="120"
              y2="246"
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
