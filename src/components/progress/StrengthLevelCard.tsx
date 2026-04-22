import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Dumbbell, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchPersonalRecords, fetchStrengthProfile, bestOneRmForLift } from "@/lib/cloud-data";
import {
  RATED_LIFTS,
  TIERS,
  TIER_COLORS,
  TIER_LABELS,
  epley1RM,
  getStrengthRating,
  type LiftDef,
  type LiftId,
  type StrengthRating,
  type Tier,
} from "@/lib/strength-standards";
import StrengthBar from "./StrengthBar";
import StrengthLevelSheet from "./StrengthLevelSheet";
import Test1RMSheet from "./Test1RMSheet";

export default function StrengthLevelCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openLift, setOpenLift] = useState<LiftId | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["strength-profile", user?.id],
    queryFn: fetchStrengthProfile,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const { data: prs = {} } = useQuery({
    queryKey: ["personal-records", user?.id],
    queryFn: fetchPersonalRecords,
    enabled: !!user,
  });

  const ratings = useMemo(() => {
    if (!profile?.bodyweight || !profile?.sex) return [];
    // Best estimated 1RM per canonical lift (across matching exercise IDs / names)
    const bestPerLift: Record<LiftId, number> = {} as any;
    Object.entries(prs).forEach(([exId, pr]) => {
      const liftId = inferLiftId(exId, pr.name);
      if (!liftId) return;
      const oneRm = epley1RM(pr.weight, pr.reps);
      if (!bestPerLift[liftId] || oneRm > bestPerLift[liftId]) {
        bestPerLift[liftId] = oneRm;
      }
    });
    const out: { rating: StrengthRating; oneRm: number }[] = [];
    RATED_LIFTS.forEach((def) => {
      const oneRm = bestPerLift[def.id];
      if (!oneRm || oneRm <= 0) return;
      const rating = getStrengthRating(def.id, oneRm, {
        bodyweight: profile.bodyweight!,
        sex: profile.sex!,
        age: profile.age,
      });
      if (rating) out.push({ rating, oneRm });
    });
    return out;
  }, [prs, profile]);

  const overall: Tier | null = useMemo(
    () => overallTier(ratings.map((r) => r.rating)),
    [ratings],
  );

  const ratedMap = new Map(ratings.map((r) => [r.rating.liftId, r]));
  const activeRating = openLift
    ? ratedMap.get(openLift)?.rating ?? null
    : null;

  // Missing profile prompt
  if (!profile?.bodyweight || !profile?.sex) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4"
      >
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Strength Level
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Add your bodyweight and sex to see how you rank on the strength standards scale.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/body-measurements")}
            className="flex-1 text-xs font-semibold bg-primary/15 text-primary rounded-lg py-2 hover:bg-primary/25 transition-colors"
          >
            Log bodyweight
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex-1 text-xs font-semibold bg-muted text-foreground rounded-lg py-2 hover:bg-muted/70 transition-colors"
          >
            Set sex / age
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-xl p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Strength Level
          </h3>
          {overall && (
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: `${TIER_COLORS[overall]}22`, color: TIER_COLORS[overall] }}
            >
              {TIER_LABELS[overall]}
            </span>
          )}
        </div>

        {ratings.length === 0 ? (
          <div className="text-center py-6">
            <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Log a heavy set on bench, squat, deadlift, or any rated lift to see your level.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {RATED_LIFTS.map((def) => {
              const entry = ratedMap.get(def.id);
              const rating = entry?.rating ?? null;
              return (
                <button
                  key={def.id}
                  type="button"
                  disabled={!rating}
                  onClick={() => rating && setOpenLift(def.id)}
                  className={`w-full text-left p-2 -mx-2 rounded-lg transition-colors ${
                    rating ? "hover:bg-muted/40 active:bg-muted/60" : "opacity-40 cursor-default"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{def.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {rating ? (
                          <>
                            <span className="text-foreground font-semibold tabular-nums">
                              {rating.oneRm}kg
                            </span>
                            {" · "}
                            <span className="tabular-nums">{rating.ratio}× BW</span>
                          </>
                        ) : (
                          "Log a set to see your level"
                        )}
                      </p>
                    </div>
                    {rating && (
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: TIER_COLORS[rating.tier] }}
                        >
                          {TIER_LABELS[rating.tier]}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <StrengthBar tier={rating?.tier ?? null} />
                  {rating && rating.kgToNextTier !== null && rating.nextTier && (
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      {rating.kgToNextTier}kg to {TIER_LABELS[rating.nextTier]}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      <StrengthLevelSheet
        rating={activeRating}
        bodyweight={profile.bodyweight}
        open={!!openLift}
        onOpenChange={(o) => !o && setOpenLift(null)}
      />
    </>
  );
}

// Re-export for convenience (used by Recovery tab chips)
export { TIERS, TIER_COLORS, TIER_LABELS };
