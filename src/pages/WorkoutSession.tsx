import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { WORKOUTS, type CompletedWorkout, type Exercise } from "@/lib/workout-data";
import { getAllCustomWorkouts } from "@/pages/WorkoutBuilder";
import { saveWorkoutToCloud, fetchLastSessionData, fetchExerciseLastData, fetchExerciseLastDataLike } from "@/lib/cloud-data";
import { ArrowLeft, Check, Timer, ChevronDown, ChevronUp, Trophy, Play, RotateCcw, TrendingUp, TrendingDown, Shuffle, Star, MessageSquare, Plus, Flame, History, Search, Hand, Zap, Dumbbell, Target, HelpCircle, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { toast } from "sonner";
import RestTimer from "@/components/RestTimer";
import ExerciseTimer from "@/components/ExerciseTimer";
import ExerciseVideoSheet from "@/components/ExerciseVideoSheet";
import PRCelebration from "@/components/PRCelebration";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { EXERCISE_SUBSTITUTIONS } from "@/lib/exercise-substitutions";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { ACCESSORY_ROUTINES, ACCESSORY_SUBSTITUTIONS } from "@/lib/accessory-routines";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SwipeableSetRow from "@/components/workout/SwipeableSetRow";
import ExerciseDragItem from "@/components/workout/ExerciseDragItem";
import { warmupRamp, roundToPlate, formatWorkoutTime, attachmentKey, isCableAttachmentExercise } from "@/lib/workout-session-utils";
import { queryKeys } from "@/lib/query-keys";
import { getUserPreferences } from "@/lib/user-preferences";
import { getSplitById } from "@/lib/training-splits";
import { usePersonalRecords } from "@/hooks/queries/usePersonalRecords";
import { useStrengthProfile } from "@/hooks/queries/useStrengthProfile";
import { useAuth } from "@/hooks/useAuth";
import {
  epley1RM,
  getStrengthRating,
  inferLiftId,
  isBilateralDumbbell,
  type Tier,
} from "@/lib/strength-standards";
import { useProgressions, progressionMap } from "@/hooks/queries/useProgressions";
import ProgressionSuggestionBanner from "@/components/workout/ProgressionSuggestionBanner";
import { isSingleArmEligible, DEFAULT_SINGLE_ARM_IDS } from "@/lib/single-arm-variants";

type SetType = "working" | "warmup" | "1rm_test";
type SetLog = {
  reps: number;
  weight: number;
  completed: boolean;
  setType?: SetType;
  rir?: number;
  targetRir?: string;
  targetReps?: number;
  targetWeight?: number;
  isPr?: boolean;
  showRirPicker?: boolean;
};

// Lazily built on first use — iterating 3 data sources at import time is expensive.
type SwapExercise = { id: string; name: string; muscleGroup: string; equipment: string; description: string };
let _swapExercises: SwapExercise[] | null = null;
function getAllSwapExercises(): SwapExercise[] {
  if (_swapExercises) return _swapExercises;
  const seen = new Set<string>();
  const out: SwapExercise[] = [];
  for (const w of WORKOUTS) {
    for (const ex of w.exercises) {
      const key = ex.name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push({ id: ex.id, name: ex.name, muscleGroup: ex.targetMuscle, equipment: "", description: ex.notes || "" }); }
    }
  }
  for (const r of ACCESSORY_ROUTINES) {
    for (const ex of r.exercises) {
      const key = ex.name.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push({ id: ex.id, name: ex.name, muscleGroup: ex.targetMuscle, equipment: "", description: ex.notes || "" }); }
    }
  }
  for (const ex of EXERCISE_LIBRARY) {
    const key = ex.name.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push({ id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment, description: ex.description || "" }); }
  }
  return (_swapExercises = out);
}

const CABLE_ATTACHMENTS = ["No Attachment", "Handles", "V-Bar", "MAG Grip", "Straight Bar", "Rope", "Cuff", "Lat Bar"] as const;
type CableAttachment = typeof CABLE_ATTACHMENTS[number];

function accessoryIcon(id: string) {
  if (id === "acc-abs") return Flame;
  if (id === "acc-grip") return Hand;
  return Zap;
}

export default function WorkoutSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workout = WORKOUTS.find((w) => w.id === id) || getAllCustomWorkouts().find((w) => w.id === id);

  const sessionTargetRir = user
    ? getSplitById(getUserPreferences(user.id)?.splitId ?? "")?.targetRir
    : undefined;

  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<string | null>(null);
  const [twoHandedExercises, setTwoHandedExercises] = useState<Set<string>>(new Set());
  const [heavyStackExercises, setHeavyStackExercises] = useState<Set<string>>(new Set());
  const [singleArmExercises, setSingleArmExercises] = useState<Set<string>>(() => new Set(DEFAULT_SINGLE_ARM_IDS));
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);
  const [setLogs, setSetLogs] = useState<Record<string, SetLog[]>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [lastExerciseNotes, setLastExerciseNotes] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [effortRating, setEffortRating] = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");
  const [maxHrInput, setMaxHrInput] = useState("");
  const [zoneInputs, setZoneInputs] = useState<[string, string, string, string, string]>(["", "", "", "", ""]);
  const [durationWatchInput, setDurationWatchInput] = useState("");
  const [caloriesWatchInput, setCaloriesWatchInput] = useState("");
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [swapExerciseId, setSwapExerciseId] = useState<string | null>(null);
  const [swapSearch, setSwapSearch] = useState("");
  const [exerciseOverrides, setExerciseOverrides] = useState<Record<string, { name: string; notes?: string; targetMuscle: string; trackWeight?: boolean; repLabel?: string; weightLabel?: string; substituteId?: string }>>({});
  // Substitutions used in the PREVIOUS session for this workout (for visual cue)
  const [lastSubstitutions, setLastSubstitutions] = useState<Record<string, { subName: string; subId: string }>>({}); 
  const [cableAttachments, setCableAttachments] = useState<Record<string, string>>({});
  // Get the effective exercise ID for data lookups (substitute ID if swapped, otherwise original)
  const getEffectiveExId = useCallback((originalId: string) => {
    const base = exerciseOverrides[originalId]?.substituteId || originalId;
    let effective = base;
    if (twoHandedExercises.has(originalId)) effective += "-2h";
    if (heavyStackExercises.has(originalId)) effective += "-heavy";
    if (singleArmExercises.has(originalId)) effective += "-sa";
    const att = cableAttachments[originalId];
    if (att) effective += `-${attachmentKey(att)}`;
    return effective;
  }, [exerciseOverrides, twoHandedExercises, heavyStackExercises, singleArmExercises, cableAttachments]);
  const [restTimerKey, setRestTimerKey] = useState(0);
  const [restDuration, setRestDuration] = useState(workout?.id === "power" ? 45 : 60);
  const [videoExercise, setVideoExercise] = useState<{ name: string; id: string } | null>(null);
  const [lastSessionData, setLastSessionData] = useState<Record<string, { reps: number; weight: number }[]>>({});
  const [weightUpSuggestions, setWeightUpSuggestions] = useState<Record<string, number[]>>({});
  const [weightDownSuggestions, setWeightDownSuggestions] = useState<Record<string, number[]>>({});
  const [addedAccessories, setAddedAccessories] = useState<string[]>([]);
  const [addedExercises, setAddedExercises] = useState<Exercise[]>([]);
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [addExerciseSearch, setAddExerciseSearch] = useState("");
  const [addExerciseMuscle, setAddExerciseMuscle] = useState<string | null>(null);
  const [bodyweightExercises, setBodyweightExercises] = useState<Set<string>>(new Set());
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [celebrationPR, setCelebrationPR] = useState<{ name: string; weight: number; reps: number; tierUp?: { tier: Tier; liftName: string } | null; isTrue1RM?: boolean } | null>(null);

  // Fetch historical PRs at session start for in-session comparison
  const { data: historicalPRs = {} } = usePersonalRecords({ staleTime: Infinity
  });
  const historicalPRsRef = useRef<Record<string, { weight: number; bestReps: number }>>({});
  useEffect(() => { historicalPRsRef.current = historicalPRs as any; }, [historicalPRs]);
  const sessionBestRef = useRef<Record<string, { weight: number; reps: number }>>({}); // best hit this session

  // Strength profile (for tier-crossing celebration)
  const { data: strengthProfile } = useStrengthProfile();
  const strengthProfileRef = useRef(strengthProfile);
  useEffect(() => { strengthProfileRef.current = strengthProfile; }, [strengthProfile]);

  // Auto-progression suggestions (double-progression model).
  const { data: progressionRows } = useProgressions();
  const progressionsByExId = useMemo(() => progressionMap(progressionRows), [progressionRows]);
  /** Apply an accepted progression suggestion to the current set logs. */
  const applyProgressionToSetLogs = useCallback((exId: string, weight: number, repsLow: number, repsHigh: number) => {
    setSetLogs(prev => {
      const cur = prev[exId];
      if (!cur) return prev;
      return {
        ...prev,
        [exId]: cur.map(s =>
          s.setType && s.setType !== "working"
            ? s
            : { ...s, targetWeight: weight, targetReps: repsLow }
        ),
      };
    });
    toast.success(`New target: ${weight}kg × ${repsLow}-${repsHigh}`);
  }, []);

  const autoSaveKey = workout ? `workout-autosave-${workout.id}` : null;

  // Auto-save session state to localStorage
  const saveSessionToStorage = useCallback(() => {
    if (!autoSaveKey || !started || finished || showFeedback) return;
    const cleanSetLogs = Object.fromEntries(
      Object.entries(setLogs).map(([exId, sets]) => [
        exId,
        sets.map(({ showRirPicker: _, ...rest }) => rest),
      ])
    );
    const sessionState = {
      setLogs: cleanSetLogs,
      exerciseNotes,
      exerciseOrder,
      exerciseOverrides,
      addedAccessories,
      addedExercises,
      bodyweightExercises: Array.from(bodyweightExercises),
      twoHandedExercises: Array.from(twoHandedExercises),
      heavyStackExercises: Array.from(heavyStackExercises),
      singleArmExercises: Array.from(singleArmExercises),
      cableAttachments,
      elapsed,
      startedAt: startedAtRef.current,
      expandedExercise,
      weightUpSuggestions,
      weightDownSuggestions,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(autoSaveKey, JSON.stringify(sessionState));
    } catch (e) {
      console.warn("Failed to auto-save workout:", e);
    }
  }, [autoSaveKey, started, finished, showFeedback, setLogs, exerciseNotes, exerciseOrder, exerciseOverrides, addedAccessories, addedExercises, bodyweightExercises, twoHandedExercises, heavyStackExercises, singleArmExercises, cableAttachments, elapsed, expandedExercise, weightUpSuggestions, weightDownSuggestions]);

  // Save on visibility change (user switching apps / leaving)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveSessionToStorage();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", saveSessionToStorage);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", saveSessionToStorage);
    };
  }, [saveSessionToStorage]);

  // Periodic auto-save every 30 seconds
  useEffect(() => {
    if (!started || finished || showFeedback) return;
    const interval = setInterval(saveSessionToStorage, 30000);
    return () => clearInterval(interval);
  }, [started, finished, showFeedback, saveSessionToStorage]);

  // Clear auto-save on finish
  const clearAutoSave = useCallback(() => {
    if (autoSaveKey) {
      localStorage.removeItem(autoSaveKey);
    }
  }, [autoSaveKey]);

  // Check for saved session on mount
  useEffect(() => {
    if (!autoSaveKey) return;
    try {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only offer resume if saved less than 4 hours ago
        if (parsed.savedAt && Date.now() - parsed.savedAt < 4 * 60 * 60 * 1000) {
          setShowResumePrompt(true);
        } else {
          localStorage.removeItem(autoSaveKey);
        }
      }
    } catch {
      localStorage.removeItem(autoSaveKey);
    }
  }, [autoSaveKey]);

  const resumeSavedSession = useCallback(() => {
    if (!autoSaveKey) return;
    try {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSetLogs(parsed.setLogs || {});
        setExerciseNotes(parsed.exerciseNotes || {});
        // Strip non-first superset exercise IDs that old auto-saves may have stored.
        const restoredAccessories: string[] = parsed.addedAccessories || [];
        const nonFirstSuperset = new Set(
          restoredAccessories.flatMap((accId: string) => {
            const r = ACCESSORY_ROUTINES.find(ar => ar.id === accId);
            return r ? r.exercises.slice(1).map(e => e.id) : [];
          })
        );
        setExerciseOrder((parsed.exerciseOrder || []).filter((id: string) => !nonFirstSuperset.has(id)));
        setExerciseOverrides(parsed.exerciseOverrides || {});
        setAddedAccessories(restoredAccessories);
        setAddedExercises(parsed.addedExercises || []);
        setBodyweightExercises(new Set(parsed.bodyweightExercises || []));
        setTwoHandedExercises(new Set(parsed.twoHandedExercises || []));
        setHeavyStackExercises(new Set(parsed.heavyStackExercises || []));
        setSingleArmExercises(
          new Set(parsed.singleArmExercises ?? Array.from(DEFAULT_SINGLE_ARM_IDS)),
        );
        setCableAttachments(parsed.cableAttachments || {});
        setElapsed(parsed.elapsed || 0);
        startedAtRef.current = parsed.startedAt || new Date().toISOString();
        setExpandedExercise(parsed.expandedExercise || null);
        setWeightUpSuggestions(parsed.weightUpSuggestions || {});
        setWeightDownSuggestions(parsed.weightDownSuggestions || {});
        setStarted(true);
        setShowResumePrompt(false);
        toast.success("Session resumed! 💪");
      }
    } catch {
      setShowResumePrompt(false);
    }
  }, [autoSaveKey]);

  const discardSavedSession = useCallback(() => {
    clearAutoSave();
    setShowResumePrompt(false);
  }, [clearAutoSave]);

  const getLastDataForExercise = useCallback((originalId: string) => {
    const effectiveId = getEffectiveExId(originalId);
    const exact = lastSessionData[effectiveId];
    if (exact?.length) return exact;

    // Only fall back across keys when the user has substituted this exercise.
    // Without a substitution we must NOT cross-match sibling variants (e.g.
    // `pl1` ↔ `pl1-heavy`, or different cable attachments) — each variant has
    // independent history and showing another variant's weights is misleading.
    const substituteId = exerciseOverrides[originalId]?.substituteId;
    if (!substituteId) return undefined;
    const fallback = Object.entries(lastSessionData).find(([key, sets]) =>
      sets.length > 0 && (key === substituteId || key.startsWith(`${substituteId}-`))
    );
    return fallback?.[1];
  }, [exerciseOverrides, getEffectiveExId, lastSessionData]);

  const applyHistoricalVariantSelections = useCallback((entries: { ex: Exercise; historicalId: string }[]) => {
    const heavyIds: string[] = [];
    const twoHandedIds: string[] = [];
    const attachments: Record<string, string> = {};

    entries.forEach(({ ex, historicalId }) => {
      if (!(historicalId === ex.id || historicalId.startsWith(`${ex.id}-`))) return;
      if (historicalId.includes("-heavy")) heavyIds.push(ex.id);
      if (historicalId.includes("-2h")) twoHandedIds.push(ex.id);
      if (isCableAttachmentExercise(ex.name)) {
        for (const att of CABLE_ATTACHMENTS) {
          const suffix = `-${attachmentKey(att)}`;
          if (historicalId.endsWith(suffix)) {
            attachments[ex.id] = att;
            break;
          }
        }
      }
    });

    if (heavyIds.length) {
      setHeavyStackExercises(prev => new Set([...prev, ...heavyIds]));
    }
    if (twoHandedIds.length) {
      setTwoHandedExercises(prev => new Set([...prev, ...twoHandedIds]));
    }
    if (Object.keys(attachments).length > 0) {
      setCableAttachments(prev => {
        const nonBlankPrev = Object.fromEntries(Object.entries(prev).filter(([, value]) => Boolean(value)));
        return { ...attachments, ...nonBlankPrev };
      });
    }
  }, []);

  // Load last session data, notes, and weight-up suggestions
  useEffect(() => {
    if (!workout) return;
    fetchLastSessionData(workout.id).then(async data => {
      // Pre-select attachment used last session for each cable exercise
      const preSelected: Record<string, string> = {};
      (workout.exercises || []).forEach(ex => {
        if (!isCableAttachmentExercise(ex.name)) return;
        const base = ex.id;
        for (const att of CABLE_ATTACHMENTS) {
          const suffix = `-${attachmentKey(att)}`;
          if (Object.keys(data).some(key => key.startsWith(base) && key.endsWith(suffix))) {
            preSelected[ex.id] = att;
            break;
          }
        }
      });

      // Gap-fill: any exercise in this workout that wasn't performed last session
      // (e.g. it was substituted) should still show its previous weights from
      // whenever it was last actually done. Look it up across all sessions.
      const sessionExercises = [
        ...(workout.exercises || []),
        ...addedAccessories.flatMap(accId => ACCESSORY_ROUTINES.find(r => r.id === accId)?.exercises || []),
        ...addedExercises,
      ];
      const historicalSelections: { ex: Exercise; historicalId: string }[] = sessionExercises.flatMap(ex => {
        if (!ex.id.startsWith("acc-")) return [];
        const historicalId = Object.keys(data).find(key => key === ex.id || key.startsWith(`${ex.id}-`));
        return historicalId ? [{ ex, historicalId }] : [];
      });
      const missing = sessionExercises.filter(ex => {
        // If we already have data for the base id or any suffixed variant, skip.
        return !Object.keys(data).some(key => key === ex.id || key.startsWith(`${ex.id}-`));
      });
      if (missing.length > 0) {
        const results = await Promise.all(
          missing.map(ex => fetchExerciseLastDataLike(ex.id).then(r => ({ ex, r })))
        );
        for (const { ex, r } of results) {
          if (!r || r.sets.length === 0) continue;
          data[r.exerciseId] = r.sets;
          historicalSelections.push({ ex, historicalId: r.exerciseId });
        }
      }

      setLastSessionData(data);
      if (Object.keys(preSelected).length > 0) {
        // Keep real user/resumed choices, but don't let blank autosave values
        // hide known historical attachment variants such as pu5-no-attachment.
        setCableAttachments(prev => {
          const nonBlankPrev = Object.fromEntries(Object.entries(prev).filter(([, value]) => Boolean(value)));
          return { ...preSelected, ...nonBlankPrev };
        });
      }
      applyHistoricalVariantSelections(historicalSelections);
    });
    try {
      const saved = localStorage.getItem(`exercise-notes-${workout.id}`);
      if (saved) setLastExerciseNotes(JSON.parse(saved));
    } catch {}
    try {
      const savedSubs = localStorage.getItem(`exercise-subs-${workout.id}`);
      if (savedSubs) setLastSubstitutions(JSON.parse(savedSubs));
    } catch {}
    try {
      const suggestions = localStorage.getItem(`weight-up-${workout.id}`);
      if (suggestions) setWeightUpSuggestions(JSON.parse(suggestions));
    } catch {}
    try {
      const downSuggestions = localStorage.getItem(`weight-down-${workout.id}`);
      if (downSuggestions) setWeightDownSuggestions(JSON.parse(downSuggestions));
    } catch {}
  }, [workout, addedAccessories, addedExercises, applyHistoricalVariantSelections]);

  // Compute all exercises including accessories
  const accessoryExercises = addedAccessories.flatMap(accId => {
    const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
    return routine ? routine.exercises : [];
  });
  const allExercises = workout ? [...workout.exercises, ...accessoryExercises, ...addedExercises] : [];

  // Build superset group map: exerciseId → { groupLabel, exerciseIds, isFirst, isLast }
  const supersetMap = useMemo(() => {
    const map: Record<string, { groupLabel: string; exerciseIds: string[]; isFirst: boolean; isLast: boolean }> = {};
    for (const accId of addedAccessories) {
      const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
      if (routine?.superset && routine.exercises.length > 1) {
        const ids = routine.exercises.map(e => e.id);
        ids.forEach((id, idx) => {
          map[id] = {
            groupLabel: `${routine.emoji} ${routine.name} — Superset`,
            exerciseIds: ids,
            isFirst: idx === 0,
            isLast: idx === ids.length - 1,
          };
        });
      }
    }
    return map;
  }, [addedAccessories]);

  useEffect(() => {
    if (!workout) return;
    const initial: Record<string, SetLog[]> = {};
    workout.exercises.forEach((ex) => {
      if (!setLogs[ex.id]) {
        const lastData = lastSessionData[ex.id] ?? [];
        const m = ex.reps.match(/(\d+)/);
        const parsedTargetReps = m ? parseInt(m[1], 10) : undefined;
        // Auto-progression: if there's a stored target for this exercise, prefer it.
        const prog = progressionsByExId[ex.id];
        const progTargetWeight = prog && prog.targetWeight > 0 ? prog.targetWeight : undefined;
        const progTargetReps = prog?.targetRepsLow || undefined;
        initial[ex.id] = Array.from({ length: ex.sets }, (_, si) => ({
          reps: 0,
          weight: 0,
          completed: false,
          targetReps: progTargetReps ?? parsedTargetReps,
          targetWeight:
            progTargetWeight ??
            lastData[si]?.weight ??
            lastData[0]?.weight ??
            undefined,
          targetRir: sessionTargetRir,
        }));
      }
    });
    if (Object.keys(initial).length > 0) {
      setSetLogs(prev => ({ ...prev, ...initial }));
    }
    if (exerciseOrder.length === 0) {
      setExpandedExercise(workout.exercises[0]?.id ?? null);
      setExerciseOrder(workout.exercises.map(ex => ex.id));
    }
  }, [workout, lastSessionData, progressionsByExId]);

  // Check if an exercise belongs to an accessory routine
  const getAccessoryForExercise = useCallback((exerciseId: string): string | null => {
    for (const accId of addedAccessories) {
      const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
      if (routine?.exercises.some(e => e.id === exerciseId)) return accId;
    }
    return null;
  }, [addedAccessories]);

  const removeExercise = useCallback((exerciseId: string) => {
    // Check if it's part of an accessory routine — remove the whole routine
    const accId = getAccessoryForExercise(exerciseId);
    if (accId) {
      const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
      if (routine) {
        const exIds = routine.exercises.map(e => e.id);
        setAddedAccessories(prev => prev.filter(id => id !== accId));
        setExerciseOrder(prev => prev.filter(id => !exIds.includes(id)));
        setSetLogs(prev => {
          const next = { ...prev };
          exIds.forEach(id => delete next[id]);
          return next;
        });
        hapticMedium();
        toast.success(`Removed ${routine.name} accessory`);
        return;
      }
    }
    // For regular exercises, remove just that one
    setAddedExercises(prev => prev.filter(e => e.id !== exerciseId));
    setExerciseOrder(prev => prev.filter(id => id !== exerciseId));
    setSetLogs(prev => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    if (expandedExercise === exerciseId) setExpandedExercise(null);
    hapticMedium();
    toast.success("Exercise removed");
  }, [getAccessoryForExercise, expandedExercise]);

  const addAccessory = useCallback((accId: string) => {
    const routine = ACCESSORY_ROUTINES.find(r => r.id === accId);
    if (!routine || addedAccessories.includes(accId)) return;
    setAddedAccessories(prev => [...prev, accId]);
    const newLogs: Record<string, SetLog[]> = {};
    routine.exercises.forEach(ex => {
      const lastData = getLastDataForExercise(ex.id);
      const m = ex.reps.match(/(\d+)/);
      const parsedTargetReps = m ? parseInt(m[1], 10) : undefined;
      newLogs[ex.id] = Array.from({ length: ex.sets }, (_, si) => ({
        reps: 0,
        weight: 0,
        completed: false,
        targetReps: parsedTargetReps,
        targetWeight: lastData[si]?.weight ?? lastData[0]?.weight ?? undefined,
        targetRir: sessionTargetRir,
      }));
    });
    setSetLogs(prev => ({ ...prev, ...newLogs }));
    // Only the first exercise represents the group in exerciseOrder; the rest are
    // tracked via setLogs and rendered inside the superset card.
    setExerciseOrder(prev => [...prev, routine.exercises[0].id]);
    Promise.all(
      routine.exercises.map(ex => fetchExerciseLastDataLike(ex.id).then(r => ({ ex, r })))
    ).then(results => {
      const found = results.filter(({ r }) => r?.sets.length) as { ex: Exercise; r: NonNullable<Awaited<ReturnType<typeof fetchExerciseLastDataLike>>> }[];
      if (found.length === 0) return;
      setLastSessionData(prev => {
        const next = { ...prev };
        found.forEach(({ r }) => { next[r.exerciseId] = r.sets; });
        return next;
      });
      applyHistoricalVariantSelections(found.map(({ ex, r }) => ({ ex, historicalId: r.exerciseId })));
    });
    hapticMedium();
    toast.success(`Added ${routine.name} accessory`);
  }, [addedAccessories, applyHistoricalVariantSelections, getLastDataForExercise, sessionTargetRir]);

  const addSingleExercise = useCallback((entry: { id: string; name: string; muscleGroup: string }) => {
    const alreadyExists = allExercises.some(e => e.id === entry.id);
    const newId = alreadyExists ? `${entry.id}-added-${Date.now()}` : entry.id;
    const ex: Exercise = { id: newId, name: entry.name, sets: 3, reps: "10", targetMuscle: entry.muscleGroup };
    setAddedExercises(prev => [...prev, ex]);
    setSetLogs(prev => ({ ...prev, [newId]: Array.from({ length: 3 }, () => ({ reps: 0, weight: 0, completed: false })) }));
    setExerciseOrder(prev => [...prev, newId]);
    fetchExerciseLastDataLike(entry.id).then(r => {
      if (!r || r.sets.length === 0) return;
      setLastSessionData(prev => ({ ...prev, [r.exerciseId]: r.sets }));
      applyHistoricalVariantSelections([{ ex, historicalId: r.exerciseId }]);
    });
    setAddExerciseOpen(false);
    setAddExerciseSearch("");
    hapticMedium();
    toast.success(`Added ${entry.name}`);
  }, [allExercises, applyHistoricalVariantSelections]);

  // Wall-clock derived elapsed — survives backgrounding, throttling, and route nav.
  // Counts the FULL gym session (working sets + rests + screen-off time).
  useEffect(() => {
    if (!started || finished) return;
    if (!startedAtRef.current) startedAtRef.current = new Date().toISOString();
    const tick = () => {
      const startMs = new Date(startedAtRef.current!).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    const onVisibility = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [started, finished]);

  const toggleSet = useCallback((exerciseId: string, setIdx: number) => {
    const currentSets = setLogs[exerciseId] || [];
    if (!currentSets[setIdx]) return;

    const wasCompleted = currentSets[setIdx].completed;

    // Block completing a cable attachment exercise without an attachment selected
    if (!wasCompleted) {
      const ex = allExercises.find(e => e.id === exerciseId);
      const exName = exerciseOverrides[exerciseId]?.name || ex?.name || "";
      if (isCableAttachmentExercise(exName) && !cableAttachments[exerciseId]) {
        toast.error("Select an attachment first");
        return;
      }
    }
    const newSets = currentSets.map((s, i) =>
      i === setIdx ? { ...s, completed: !wasCompleted } : s
    );

    // For warm-ups being completed, auto-fill weight + reps from the ramp.
    if (!wasCompleted && newSets[setIdx].setType === "warmup") {
      const warmupCount = newSets.filter((s) => s.setType === "warmup").length;
      let wuPos = 0;
      for (let i = 0; i < setIdx; i++) {
        if (newSets[i].setType === "warmup") wuPos++;
      }
      const firstWorking = newSets.find((s) => s.setType !== "warmup");
      const lastFirstWeight = getLastDataForExercise(exerciseId)?.[0]?.weight ?? 0;
      const workingWeight = firstWorking?.weight && firstWorking.weight > 0
        ? firstWorking.weight
        : lastFirstWeight;
      const exMeta = allExercises.find(e => e.id === exerciseId);
      const exNameForRamp = exerciseOverrides[exerciseId]?.name || exMeta?.name || "";
      const isDb = isBilateralDumbbell(getEffectiveExId(exerciseId), exNameForRamp);
      const ramp = warmupRamp(workingWeight, wuPos, warmupCount, isDb);
      newSets[setIdx] = { ...newSets[setIdx], weight: ramp.weight, reps: ramp.reps };
    }

    // Pure state update
    setSetLogs(prev => ({ ...prev, [exerciseId]: newSets }));

    // Show RIR picker for non-warmup sets that were just completed
    if (!wasCompleted && newSets[setIdx]?.setType !== "warmup") {
      setSetLogs(prev => {
        const s = prev[exerciseId] ? [...prev[exerciseId]] : [];
        if (!s[setIdx]) return prev;
        s[setIdx] = { ...s[setIdx], showRirPicker: true };
        return { ...prev, [exerciseId]: s };
      });
    }

    if (!wasCompleted) {
      hapticMedium();
      setRestTimerActive(true);
      setRestTimerKey(k => k + 1);

      const currentWeight = newSets[setIdx].weight;
      const currentReps = newSets[setIdx].reps;
      const currentSetType = newSets[setIdx].setType;
      const isOneRmTest = currentSetType === "1rm_test";
      const exercise = allExercises.find(e => e.id === exerciseId);
      const override = exerciseOverrides[exerciseId];
      const effectiveId = getEffectiveExId(exerciseId);
      const displayName = override?.name || exercise?.name || exerciseId;
      const isTimeBased = (override?.repLabel || exercise?.repLabel) === "Sec";
      const tracksWeight = (override?.trackWeight ?? exercise?.trackWeight) !== false;

      // Check for new personal record (weight PR OR rep PR) — keyed by effective (post-swap) ID.
      // Warm-up sets are excluded — they're light by design and shouldn't trigger PRs.
      if (!isTimeBased && currentReps > 0 && currentSetType !== "warmup") {
        const histWeight = historicalPRsRef.current[effectiveId]?.weight ?? 0;
        const histReps = historicalPRsRef.current[effectiveId]?.bestReps ?? 0;
        const sessBest = sessionBestRef.current[effectiveId] ?? { weight: 0, reps: 0 };

        const isWeightPR = tracksWeight && currentWeight > 0 && currentWeight > Math.max(histWeight, sessBest.weight);
        const isRepPR = currentReps > Math.max(histReps, sessBest.reps);

        if (isWeightPR || isRepPR || isOneRmTest) {
          sessionBestRef.current[effectiveId] = {
            weight: Math.max(sessBest.weight, currentWeight),
            reps: Math.max(sessBest.reps, currentReps),
          };

          // Tier-crossing detection (vs previous best on this canonical lift)
          let tierUp: { tier: Tier; liftName: string } | null = null;
          const profile = strengthProfileRef.current;
          if (profile?.bodyweight && profile?.sex) {
            const liftId = inferLiftId(effectiveId, displayName);
            if (liftId) {
              // Bilateral dumbbell exercises log per-dumbbell weight → double for total load
              const dbMult = isBilateralDumbbell(effectiveId, displayName) ? 2 : 1;
              const prevBest = Math.max(histWeight, sessBest.weight);
              const prevReps = histReps || sessBest.reps || 1;
              const prevOneRm = prevBest > 0 ? epley1RM(prevBest * dbMult, prevReps) : 0;
              // For 1RM tests, use the actual lifted weight (no Epley estimation needed)
              const newOneRm = isOneRmTest ? currentWeight * dbMult : epley1RM(currentWeight * dbMult, currentReps);
              const inputs = { bodyweight: profile.bodyweight, sex: profile.sex, age: profile.age };
              const prevRating = prevOneRm > 0 ? getStrengthRating(liftId, prevOneRm, inputs) : null;
              const newRating = getStrengthRating(liftId, newOneRm, inputs);
              if (newRating && (!prevRating || newRating.tierIndex > prevRating.tierIndex)) {
                tierUp = { tier: newRating.tier, liftName: newRating.liftName };
              }
            }
          }

          setCelebrationPR({ name: displayName, weight: currentWeight, reps: currentReps, tierUp, isTrue1RM: isOneRmTest });
          setSetLogs(prev => {
            const exSets = prev[exerciseId] ? [...prev[exerciseId]] : [];
            if (!exSets[setIdx]) return prev;
            exSets[setIdx] = { ...exSets[setIdx], isPr: true };
            return { ...prev, [exerciseId]: exSets };
          });
          void import("@/lib/gamification/notify").then(({ awardXpAndNotify }) =>
            awardXpAndNotify({ source: "personal_record", metadata: { exercise: effectiveId } })
          );
        }
      }

      // 1RM-test sets skip the working-set rep-range warnings (a max attempt
      // intentionally lives outside the normal 8-12/12-15 ranges). Warm-ups
      // also skip the warnings — they're light by design.
      if (!isOneRmTest && currentSetType !== "warmup") {
        // Determine rep thresholds based on exercise target range
        const isAccessoryRange = exercise?.reps?.includes("12-15");
        const upThreshold = isAccessoryRange ? 15 : 12;
        const downThreshold = isAccessoryRange ? 12 : 8;

        // Suggest weight increase if reps hit the top of the range
        if (newSets[setIdx].reps >= upThreshold) {
          const exName = exercise?.name || exerciseId;
          toast.info(`💪 ${exName} — Set ${setIdx + 1} hit ${newSets[setIdx].reps} reps! Consider adding weight next session.`);
          setWeightUpSuggestions(prev => {
            const existing = prev[exerciseId] || [];
            if (!existing.includes(setIdx)) return { ...prev, [exerciseId]: [...existing, setIdx] };
            return prev;
          });
        }

        // Suggest weight decrease if reps fell below the bottom of the range
        if (newSets[setIdx].reps > 0 && newSets[setIdx].reps < downThreshold) {
          const exName = exercise?.name || exerciseId;
          toast.warning(`⚠️ ${exName} — Set ${setIdx + 1} only ${newSets[setIdx].reps} reps. Consider lowering weight next session.`);
          setWeightDownSuggestions(prev => {
            const existing = prev[exerciseId] || [];
            if (!existing.includes(setIdx)) return { ...prev, [exerciseId]: [...existing, setIdx] };
            return prev;
          });
        }
      }

      // Adjust rest timer based on set type.
      if (currentSetType === "warmup") {
        setRestDuration(60);
      } else if (isOneRmTest) {
        // Longer default rest after a true 1RM attempt — these need real recovery.
        setRestDuration(300);
      }

      // Auto-expand next exercise if this was the last set
      const allSetsNowDone = newSets.every(s => s.completed);
      if (allSetsNowDone) {
        const currentOrderIdx = exerciseOrder.indexOf(exerciseId);
        if (currentOrderIdx >= 0 && currentOrderIdx < exerciseOrder.length - 1) {
          setExpandedExercise(exerciseOrder[currentOrderIdx + 1]);
        }
      }
    }
  }, [setLogs, exerciseOrder, allExercises, exerciseOverrides, getEffectiveExId, getLastDataForExercise, cableAttachments]);

  const updateSetField = useCallback(
    (exerciseId: string, setIdx: number, field: "reps" | "weight", value: number) => {
      setSetLogs((prev) => {
        const updated = { ...prev };
        const sets = [...updated[exerciseId]];
        sets[setIdx] = { ...sets[setIdx], [field]: value };
        updated[exerciseId] = sets;
        return updated;
      });
    }, []
  );

  const updateSetLogField = useCallback(
    (exerciseId: string, setIdx: number, patch: Partial<SetLog>) => {
      setSetLogs(prev => {
        const sets = prev[exerciseId] ? [...prev[exerciseId]] : [];
        if (!sets[setIdx]) return prev;
        sets[setIdx] = { ...sets[setIdx], ...patch };
        return { ...prev, [exerciseId]: sets };
      });
    }, []
  );

  const addSet = useCallback((exerciseId: string) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      sets.push({ reps: 0, weight: 0, completed: false });
      updated[exerciseId] = sets;
      return updated;
    });
    hapticMedium();
  }, []);

  /** Add a warm-up set. If no warm-ups exist yet, seeds 2 (50% × 5, 75% × 5).
   *  Subsequent presses add one more, capped at 3 total (40 / 60 / 80%). */
  const addWarmupSet = useCallback((exerciseId: string) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      const existingWarmups = sets.filter((s) => s.setType === "warmup").length;
      if (existingWarmups >= 3) return prev;
      const toAdd = existingWarmups === 0 ? 2 : 1;
      const firstWorkingIdx = sets.findIndex((s) => s.setType !== "warmup");
      const insertAt = firstWorkingIdx === -1 ? sets.length : firstWorkingIdx;
      const newWarmups: SetLog[] = Array.from({ length: toAdd }, () => ({
        reps: 0, weight: 0, completed: false, setType: "warmup",
      }));
      sets.splice(insertAt, 0, ...newWarmups);
      updated[exerciseId] = sets;
      return updated;
    });
    hapticMedium();
  }, []);

  /** Toggle a single set between working ↔ warmup. */
  const toggleWarmup = useCallback((exerciseId: string, setIdx: number) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      if (!sets[setIdx]) return prev;
      const current = sets[setIdx].setType;
      const next: SetType = current === "warmup" ? "working" : "warmup";
      sets[setIdx] = { ...sets[setIdx], setType: next };
      updated[exerciseId] = sets;
      return updated;
    });
    hapticMedium();
  }, []);

  /** Append a single dedicated 1RM-test set (1 rep, locked, amber styling). */
  const add1RMTestSet = useCallback((exerciseId: string) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      sets.push({ reps: 1, weight: 0, completed: false, setType: "1rm_test" });
      updated[exerciseId] = sets;
      return updated;
    });
    hapticMedium();
    toast.info("1RM test set added — go for the single 💪");
  }, []);

  const deleteSet = useCallback((exerciseId: string, setIdx: number) => {
    setSetLogs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      if (sets.length <= 1) return prev; // Don't delete the last set
      sets.splice(setIdx, 1);
      updated[exerciseId] = sets;
      return updated;
    });
    hapticMedium();
  }, []);

  const orderedExercises = workout
    ? exerciseOrder.map(id => allExercises.find(ex => ex.id === id)!).filter(Boolean)
    : [];

  const completedExercises = allExercises.filter((ex) => setLogs[ex.id]?.every((s) => s.completed)).length;
  const totalExercises = allExercises.length;

  const handleFinish = () => {
    if (!workout) return;
    const notesToSave = Object.fromEntries(
      Object.entries(exerciseNotes).filter(([_, v]) => v.trim())
    );
    // Always overwrite so stale notes from a previous session are cleared
    if (Object.keys(notesToSave).length > 0) {
      localStorage.setItem(`exercise-notes-${workout.id}`, JSON.stringify(notesToSave));
    } else {
      localStorage.removeItem(`exercise-notes-${workout.id}`);
    }
    // Save substitute map so next session can show a visual cue
    const subMap: Record<string, { subName: string; subId: string }> = {};
    Object.entries(exerciseOverrides).forEach(([origId, override]) => {
      if (override.substituteId) {
        subMap[origId] = { subName: override.name, subId: override.substituteId };
      }
    });
    if (Object.keys(subMap).length > 0) {
      localStorage.setItem(`exercise-subs-${workout.id}`, JSON.stringify(subMap));
    } else {
      localStorage.removeItem(`exercise-subs-${workout.id}`);
    }
    if (Object.keys(weightUpSuggestions).length > 0) {
      localStorage.setItem(`weight-up-${workout.id}`, JSON.stringify(weightUpSuggestions));
    } else {
      localStorage.removeItem(`weight-up-${workout.id}`);
    }
    if (Object.keys(weightDownSuggestions).length > 0) {
      localStorage.setItem(`weight-down-${workout.id}`, JSON.stringify(weightDownSuggestions));
    } else {
      localStorage.removeItem(`weight-down-${workout.id}`);
    }
    setShowFeedback(true);
  };

  const handleSubmitFeedback = () => {
    if (!workout) return;
    const hasCompletedAny = completedExercises > 0;
    
    const completed: CompletedWorkout = {
      id: crypto.randomUUID(),
      workoutId: workout.id,
      workoutName: workout.name,
      date: new Date().toISOString(),
      duration: elapsed > 0 ? Math.max(1, Math.ceil(elapsed / 60)) : 0,
      exercisesCompleted: completedExercises,
      totalExercises,
      sets: Object.entries(setLogs).flatMap(([exId, sets]) => {
        const ex = allExercises.find(e => e.id === exId);
        const override = exerciseOverrides[exId];
        const liveName = override?.name ?? ex?.name;
        const effectiveId = getEffectiveExId(exId);
        // When a substitution is active, capture the slot's identity (with its
        // non-substitution suffixes like attachment / heavy / 2h) so the next
        // session of this workout can restore the right "Last:" values for the
        // original exercise rather than the substitute.
        let slotId = exId;
        if (twoHandedExercises.has(exId)) slotId += "-2h";
        if (heavyStackExercises.has(exId)) slotId += "-heavy";
        if (singleArmExercises.has(exId)) slotId += "-sa";
        const att = cableAttachments[exId];
        if (att) slotId += `-${attachmentKey(att)}`;
        const originalExerciseId = override?.substituteId && slotId !== effectiveId ? slotId : undefined;
        return sets.filter((s) => s.completed).map((s) => ({
          exerciseId: effectiveId,
          originalExerciseId,
          exerciseName: liveName,
          reps: s.reps,
          weight: s.weight,
          setType: s.setType ?? "working",
          rir: s.rir ?? null,
          targetRir: s.targetRir ?? null,
          targetReps: s.targetReps ?? null,
          targetWeight: s.targetWeight ?? null,
          isPr: s.isPr ?? false,
        }));
      }),
      effortRating: effortRating > 0 ? effortRating : undefined,
      sessionNotes: sessionNotes.trim() || undefined,
      startedAt: startedAtRef.current ?? undefined,
      avgHr: null,
      maxHr: maxHrInput ? Math.round(Number(maxHrInput)) || null : null,
      hrZones: (() => {
        const z = zoneInputs.map(s => Math.max(0, Math.round(Number(s) || 0))) as [number, number, number, number, number];
        return z.some(v => v > 0) ? z : null;
      })(),
      durationWatch: durationWatchInput ? Math.max(1, Math.round(Number(durationWatchInput))) || null : null,
      caloriesWatch: caloriesWatchInput ? Math.max(0, Math.round(Number(caloriesWatchInput))) || null : null,
    };
    
    if (!hasCompletedAny) {
      if (!window.confirm("You haven't completed any exercises in this session. Finish anyway?")) {
        return;
      }
    }
    
    saveWorkoutToCloud(completed).then(() => {
      // Refresh only after the workout + sets + strain recompute have finished saving.
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyScores(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workoutHistory(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workoutVolume(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.personalRecords(user!.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.recentSets(user!.id) });
    });
    
    clearAutoSave();
    setFinished(true);
    hapticSuccess();
    toast.success("Workout saved! 💪");
  };

  const hasLastSession = Object.keys(lastSessionData).length > 0;

  if (!workout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Workout not found</p>
      </div>
    );
  }

  if (showFeedback && !finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="font-display text-2xl font-bold text-foreground">How was that session?</h1>
        <p className="text-muted-foreground mt-1 text-sm">Rate your effort and leave a note for your coach</p>

        {/* Effort Rating */}
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Effort Rating</p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setEffortRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    star <= effortRating
                      ? "text-primary fill-primary"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {effortRating > 0 && (
            <p className="text-xs text-muted-foreground">
              {effortRating === 1 && "Easy — barely broke a sweat"}
              {effortRating === 2 && "Light — comfortable effort"}
              {effortRating === 3 && "Moderate — good workout"}
              {effortRating === 4 && "Hard — really pushed it"}
              {effortRating === 5 && "Max effort — gave everything"}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="mt-6 w-full max-w-sm space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">Notes for Coach</p>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Any pain, fatigue, or feedback..."
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{sessionNotes.length}/500</p>
        </div>

        {/* From your watch — Galaxy Watch summary */}
        {(() => {
          const elapsedMin = startedAtRef.current
            ? Math.max(1, Math.ceil((Date.now() - new Date(startedAtRef.current).getTime()) / 60000))
            : null;
          const zoneTotal = zoneInputs.reduce((s, v) => s + (Math.max(0, Math.round(Number(v) || 0))), 0);
          const ZONE_META = [
            { label: "Z1", name: "Light" },
            { label: "Z2", name: "Fat-burn" },
            { label: "Z3", name: "Cardio" },
            { label: "Z4", name: "Hard" },
            { label: "Z5", name: "Max" },
          ];
          return (
            <div className="mt-6 w-full max-w-sm space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">
                From Your Watch <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">Duration (min)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={600}
                    value={durationWatchInput}
                    onChange={(e) => setDurationWatchInput(e.target.value)}
                    placeholder={elapsedMin ? String(elapsedMin) : "—"}
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Calories (kcal)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={3000}
                    value={caloriesWatchInput}
                    onChange={(e) => setCaloriesWatchInput(e.target.value)}
                    placeholder="—"
                    className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <p className="text-[10px] text-muted-foreground">Time in HR zones (min)</p>
                  {zoneTotal > 0 && (
                    <p className="text-[10px] text-muted-foreground tabular-nums">Total: {zoneTotal} min</p>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {ZONE_META.map((z, i) => (
                    <div key={z.label} className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-foreground">{z.label}</span>
                      <span className="text-[9px] text-muted-foreground/70 mb-1">{z.name}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={300}
                        value={zoneInputs[i]}
                        onChange={(e) => {
                          const next = [...zoneInputs] as [string, string, string, string, string];
                          next[i] = e.target.value;
                          setZoneInputs(next);
                        }}
                        placeholder="0"
                        className="w-full rounded-lg border border-border bg-card px-1 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground">Max HR reached (bpm)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={30}
                  max={240}
                  value={maxHrInput}
                  onChange={(e) => setMaxHrInput(e.target.value)}
                  placeholder="—"
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 tabular-nums"
                />
              </div>

              <p className="text-[10px] text-muted-foreground">Leave blank if you didn't wear a watch — strain falls back to the estimate.</p>
            </div>
          );
        })()}

        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSubmitFeedback}
            className="rounded-xl gradient-primary px-8 py-3 text-sm font-semibold text-primary-foreground glow-primary"
          >
            {effortRating > 0 || sessionNotes.trim() ? "Submit & Finish" : "Skip & Finish"}
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-foreground">Session Complete!</h1>
        <p className="text-muted-foreground mt-2">
          {completedExercises}/{totalExercises} exercises · {formatWorkoutTime(elapsed)}
        </p>
        <button onClick={() => navigate("/")} className="mt-8 rounded-xl gradient-primary px-8 py-3 text-sm font-semibold text-primary-foreground glow-primary">
          Back to Home
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-8 space-y-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className={`glass-card-elevated rounded-2xl p-6 bg-gradient-to-br ${workout.color}`}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 mb-3">
              <workout.icon className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold">{workout.name}</h1>
            <p className="text-muted-foreground mt-1">{workout.focus}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {workout.exercises.length} exercises · ~35 min
            </p>
            {hasLastSession && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
                <RotateCcw className="h-3 w-3" />
                <span>Weights auto-filled from last session</span>
              </div>
            )}
          </div>

          {/* Weight increase reminders from last session */}
          {Object.keys(weightUpSuggestions).length > 0 && (
            <div className="glass-card rounded-xl p-3 border border-primary/30 bg-primary/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Weight increase suggested</span>
              </div>
              {Object.entries(weightUpSuggestions).map(([exId, setIdxs]) => {
                const exName = workout.exercises.find(e => e.id === exId)?.name || exId;
                return (
                  <p key={exId} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{exName}</span> — Set{setIdxs.length > 1 ? "s" : ""} {setIdxs.map(s => s + 1).join(", ")} hit 12+ reps last time
                  </p>
                );
              })}
            </div>
          )}

          {/* Weight decrease reminders from last session */}
          {Object.keys(weightDownSuggestions).length > 0 && (
            <div className="glass-card rounded-xl p-3 border border-destructive/30 bg-destructive/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>Weight decrease suggested</span>
              </div>
              {Object.entries(weightDownSuggestions).map(([exId, setIdxs]) => {
                const exName = workout.exercises.find(e => e.id === exId)?.name || exId;
                return (
                  <p key={exId} className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{exName}</span> — Set{setIdxs.length > 1 ? "s" : ""} {setIdxs.map(s => s + 1).join(", ")} under 8 reps last time
                  </p>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {workout.exercises.map((ex, i) => (
              <div key={ex.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ex.sets} × {ex.reps}
                    {ex.notes && ` · ${ex.notes}`}
                  </p>
                  {getLastDataForExercise(ex.id) && (
                    <p className="text-[10px] text-success/80 mt-0.5">
                      Last: {getLastDataForExercise(ex.id)!.map(s => `${s.weight}kg×${s.reps}`).join(", ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setVideoExercise({ name: ex.name, id: ex.id })}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Play className="h-3 w-3" />
                </button>
                <span className="text-[10px] text-muted-foreground rounded-md bg-muted/50 px-2 py-0.5">
                  {ex.targetMuscle}
                </span>
              </div>
            ))}
          </div>

          {showResumePrompt && (
            <div className="glass-card rounded-xl p-4 border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <RotateCcw className="h-4 w-4" />
                <span>Unfinished session found</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You have a previous session in progress. Would you like to pick up where you left off?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={resumeSavedSession}
                  className="flex-1 rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground glow-primary active:scale-[0.98] transition-transform"
                >
                  Resume Session
                </button>
                <button
                  onClick={discardSavedSession}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground active:scale-[0.98] transition-transform"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => { discardSavedSession(); startedAtRef.current = new Date().toISOString(); setStarted(true); }}
            className="w-full rounded-xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary active:scale-[0.98] transition-transform"
          >
            {showResumePrompt ? "Start Fresh" : "Start Workout"}
          </button>
        </div>

        <ExerciseVideoSheet
          open={!!videoExercise}
          onOpenChange={(open) => !open && setVideoExercise(null)}
          exerciseName={videoExercise?.name || ""}
          exerciseId={videoExercise?.id || ""}
        />
      </div>
    );
  }

  // Active workout
  return (
    <div className="min-h-screen bg-background pb-40">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-4 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button onClick={() => { saveSessionToStorage(); navigate("/sessions"); }} className="text-muted-foreground p-2 -m-2 active:bg-muted/50 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { saveSessionToStorage(); navigate(`/history?workout=${workout?.id}`); }}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-card border border-border/50 rounded-full px-2.5 py-1.5 active:bg-muted/50 transition-colors"
            title="View past sessions"
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>
          <div className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 border border-border/50">
            <Timer className="h-3.5 w-3.5 text-primary" />
            <span className="font-display text-sm font-bold tabular-nums">{formatWorkoutTime(elapsed)}</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {completedExercises}/{totalExercises}
          </span>
          <select
            value={restDuration}
            onChange={(e) => setRestDuration(Number(e.target.value))}
            className="text-[10px] bg-card border border-border/50 rounded-full px-2 py-1 text-muted-foreground outline-none"
          >
            <option value={45}>45s</option>
            <option value={60}>60s</option>
            <option value={75}>75s</option>
            <option value={90}>90s</option>
            <option value={120}>2m</option>
            <option value={180}>3m</option>
          </select>
        </div>



        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full gradient-primary rounded-full"
            animate={{ width: `${(completedExercises / totalExercises) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Exercises */}
        <Reorder.Group axis="y" values={exerciseOrder} onReorder={setExerciseOrder} className="space-y-2">
          {orderedExercises.map((ex, i) => {
            const isExpanded = expandedExercise === ex.id;
            const allDone = setLogs[ex.id]?.every((s) => s.completed);
            const override = exerciseOverrides[ex.id];
            const displayName = override?.name || ex.name;
            const allSubs = { ...EXERCISE_SUBSTITUTIONS, ...ACCESSORY_SUBSTITUTIONS };
            const hasSubs = true; // library search available for all exercises
            const ssInfo = supersetMap[ex.id];

            const exerciseCard = (
              <ExerciseDragItem
                key={ex.id}
                exId={ex.id}
                isExpanded={isExpanded}
                allDone={allDone}
                index={i}
                name={displayName}
                sets={setLogs[ex.id]?.length || ex.sets}
                reps={ex.reps}
                onToggleExpand={() => setExpandedExercise(isExpanded ? null : ex.id)}
                onPlayVideo={() => setVideoExercise({ name: displayName, id: ex.id })}
                onSwap={() => setSwapExerciseId(ex.id)}
                hasSubs={hasSubs}
                lastSub={!override ? lastSubstitutions[ex.id] : undefined}
                onDelete={() => removeExercise(ex.id)}
              >

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 space-y-2">
                        {progressionsByExId[ex.id]?.pendingSuggestion && (
                          <ProgressionSuggestionBanner
                            progression={progressionsByExId[ex.id]}
                            onApplied={({ weight, repsLow, repsHigh }) =>
                              applyProgressionToSetLogs(ex.id, weight, repsLow, repsHigh)
                            }
                          />
                        )}
                        {(override?.notes || ex.notes) && (
                          <p className="text-[11px] text-primary/80 bg-primary/5 rounded-lg px-2 py-1.5">
                            {override?.notes || ex.notes}
                          </p>
                        )}
                        <textarea
                          placeholder={lastExerciseNotes[ex.id] || "Add notes for this exercise..."}
                          value={exerciseNotes[ex.id] || ""}
                          onChange={(e) => setExerciseNotes((prev) => ({ ...prev, [ex.id]: e.target.value }))}
                          rows={1}
                          className="w-full rounded-lg bg-muted/50 border border-border/50 px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40 resize-none"
                        />
                        {(() => {
                          const isBW = bodyweightExercises.has(ex.id);
                          const showWeight = !isBW && (override?.trackWeight ?? ex.trackWeight) !== false;
                          const repLabel = override?.repLabel || ex.repLabel || "Reps";
                          const weightLabel = override?.weightLabel || ex.weightLabel || "Kg";
                          const isTimeBased = repLabel === "Sec";
                          
                          const parseTargetSeconds = (reps: string) => {
                            const match = reps.match(/(\d+)/);
                            return match ? parseInt(match[1], 10) : 30;
                          };
                          const targetSec = isTimeBased ? parseTargetSeconds(ex.reps) : 0;

                          return (
                            <>
                              {!isTimeBased && (override?.trackWeight ?? ex.trackWeight) !== false && (
                                <>
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    {/* Bodyweight toggle */}
                                    <button
                                      onClick={() => setBodyweightExercises(prev => {
                                        const next = new Set(prev);
                                        if (next.has(ex.id)) next.delete(ex.id);
                                        else next.add(ex.id);
                                        return next;
                                      })}
                                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all select-none ${
                                        isBW
                                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                          : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
                                      }`}
                                    >
                                      <div className={`h-2 w-2 rounded-full transition-colors ${isBW ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                      Bodyweight
                                    </button>
                                    {/* 2 Handed toggle */}
                                    {ex.id === "acc-grip1" && (
                                      <button
                                        onClick={() => setTwoHandedExercises(prev => {
                                          const next = new Set(prev);
                                          if (next.has(ex.id)) next.delete(ex.id);
                                          else next.add(ex.id);
                                          return next;
                                        })}
                                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all select-none ${
                                          twoHandedExercises.has(ex.id)
                                            ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
                                        }`}
                                      >
                                        <div className={`h-2 w-2 rounded-full transition-colors ${twoHandedExercises.has(ex.id) ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                        2 Handed
                                      </button>
                                    )}
                                    {/* Machine Row variant pill — "Machine Row" (standard) vs "Low Row", tracked separately */}
                                    {ex.id === "pl1" && !exerciseOverrides[ex.id] && (
                                      <div className="flex items-center rounded-full bg-muted/50 p-0.5 select-none">
                                        <button
                                          onClick={() => heavyStackExercises.has(ex.id) && setHeavyStackExercises(prev => {
                                            const next = new Set(prev); next.delete(ex.id); return next;
                                          })}
                                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${!heavyStackExercises.has(ex.id) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                                        >
                                          Machine Row
                                        </button>
                                        <button
                                          onClick={() => !heavyStackExercises.has(ex.id) && setHeavyStackExercises(prev => {
                                            const next = new Set(prev); next.add(ex.id); return next;
                                          })}
                                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${heavyStackExercises.has(ex.id) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                                        >
                                          Low Row
                                        </button>
                                      </div>
                                    )}
                                    {/* Light/Heavy toggle — standalone cable exercises only (no benches, lat pulldowns, seated rows, machines) */}
                                    {(() => {
                                      const dn = displayName.toLowerCase();
                                      const isCableType = ["cable", "pushdown", "push down", "face pull", "facepull", "pallof", "crossover", "straight-arm", "rope"].some(kw => dn.includes(kw));
                                      const isBenchOrMachine = ["lat pull", "pulldown", "pull down", "seated row", "machine row", "machine fly", "pec deck", "t-bar", "t bar", "leg"].some(kw => dn.includes(kw));
                                      return isCableType && !isBenchOrMachine;
                                    })() && (
                                      <div className="flex items-center gap-1">
                                        <div className="flex items-center rounded-full bg-muted/50 p-0.5 select-none">
                                          <button
                                            onClick={() => heavyStackExercises.has(ex.id) && setHeavyStackExercises(prev => {
                                              const next = new Set(prev);
                                              next.delete(ex.id);
                                              return next;
                                            })}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                                              !heavyStackExercises.has(ex.id)
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground"
                                            }`}
                                          >
                                            Light
                                          </button>
                                          <button
                                            onClick={() => !heavyStackExercises.has(ex.id) && setHeavyStackExercises(prev => {
                                              const next = new Set(prev);
                                              next.add(ex.id);
                                              return next;
                                            })}
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                                              heavyStackExercises.has(ex.id)
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground"
                                            }`}
                                          >
                                            Heavy
                                          </button>
                                        </div>
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button
                                              type="button"
                                              aria-label="What does Light vs Heavy mean?"
                                              className="text-muted-foreground/60 hover:text-foreground transition-colors"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <HelpCircle className="h-3.5 w-3.5" />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent side="top" align="end" className="w-64 text-xs leading-relaxed">
                                            <p className="font-semibold text-foreground mb-1">Light vs Heavy stack</p>
                                            <p className="text-muted-foreground">
                                              Cable machines use different pulley ratios. <span className="text-foreground font-medium">Heavy</span> stacks have a 1:1 pulley (often where the cables sit far apart) so the plate weight matches what you feel. <span className="text-foreground font-medium">Light</span> stacks use a 2:1 pulley — the actual load is roughly half the stack number.
                                            </p>
                                            <p className="text-muted-foreground mt-2">Tip: cables far apart = usually heavy. Cables close together = usually light.</p>
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                    )}
                                    {isCableAttachmentExercise(displayName) && (
                                      <select
                                        value={cableAttachments[ex.id] || ""}
                                        onChange={(e) => setCableAttachments(prev => ({
                                          ...prev,
                                          [ex.id]: e.target.value,
                                        }))}
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium bg-muted/50 border-0 outline-none cursor-pointer transition-all ${
                                          cableAttachments[ex.id]
                                            ? "text-primary ring-1 ring-primary/30 bg-primary/15"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        <option value="">Attachment</option>
                                        {CABLE_ATTACHMENTS.map(att => (
                                          <option key={att} value={att}>{att}</option>
                                        ))}
                                      </select>
                                    )}
                                    {isSingleArmEligible(ex.id, displayName) && (
                                      <div className="flex items-center rounded-full bg-muted/50 p-0.5 select-none">
                                        <button
                                          onClick={() => {
                                            if (singleArmExercises.has(ex.id)) {
                                              hapticMedium();
                                              setSingleArmExercises(prev => {
                                                const next = new Set(prev); next.delete(ex.id); return next;
                                              });
                                            }
                                          }}
                                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${!singleArmExercises.has(ex.id) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                                        >
                                          2 Arm
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (!singleArmExercises.has(ex.id)) {
                                              hapticMedium();
                                              setSingleArmExercises(prev => {
                                                const next = new Set(prev); next.add(ex.id); return next;
                                              });
                                            }
                                          }}
                                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${singleArmExercises.has(ex.id) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                                        >
                                          1 Arm
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                              <div className={`grid ${isTimeBased ? "grid-cols-[28px_1fr_36px]" : showWeight ? "grid-cols-[28px_1fr_1fr_36px]" : "grid-cols-[28px_1fr_36px]"} gap-x-1.5 items-center text-[10px] text-muted-foreground font-medium uppercase tracking-wider`}>
                                <span className="text-center">Set</span>
                                {!isTimeBased && showWeight && (
                                  <span className="text-center leading-tight">
                                    {weightLabel}
                                    {singleArmExercises.has(ex.id) ? (
                                      <span className="block text-[8px] normal-case tracking-normal text-muted-foreground/60">per arm</span>
                                    ) : isBilateralDumbbell(ex.id, override?.name || ex.name || "") && (
                                      <span className="block text-[8px] normal-case tracking-normal text-muted-foreground/60">per dumbbell</span>
                                    )}
                                  </span>
                                )}
                                <span className="text-center">{isTimeBased ? "Timer" : repLabel}</span>
                                <span className="text-center">✓</span>
                              </div>
                              {(() => {
                                const setsArr = setLogs[ex.id] || [];
                                const warmupCount = setsArr.filter((s) => s.setType === "warmup").length;
                                // Working weight = first working set's entered weight, else last session's first set
                                const firstWorking = setsArr.find((s) => s.setType !== "warmup");
                                const lastExerciseData = getLastDataForExercise(ex.id);
                                const lastFirstWeight = lastExerciseData?.[0]?.weight ?? 0;
                                const workingWeight = firstWorking?.weight && firstWorking.weight > 0
                                  ? firstWorking.weight
                                  : lastFirstWeight;
                                let warmupIdxCounter = 0;
                                const exNameForRamp = override?.name || ex.name || "";
                                const isDb = isBilateralDumbbell(getEffectiveExId(ex.id), exNameForRamp);
                                return setsArr.map((set, si) => {
                                  const is1RM = set.setType === "1rm_test";
                                  const isWarmup = set.setType === "warmup";
                                  const wuIdx = isWarmup ? warmupIdxCounter++ : -1;
                                  const wuRamp = isWarmup ? warmupRamp(workingWeight, wuIdx, warmupCount, isDb) : null;
                                  return (
                                <React.Fragment key={si}>
                                <SwipeableSetRow
                                  onDelete={() => deleteSet(ex.id, si)}
                                >
                                  <div className={`grid ${isTimeBased ? "grid-cols-[28px_1fr_36px]" : showWeight ? "grid-cols-[28px_1fr_1fr_36px]" : "grid-cols-[28px_1fr_36px]"} gap-x-1.5 items-center bg-background ${is1RM ? "rounded-lg ring-1 ring-amber-400/50 bg-amber-400/5 px-1 py-0.5" : isWarmup ? "rounded-lg bg-orange-400/5 px-1 py-0.5" : ""}`}>
                                    <span className={`text-xs font-bold text-center ${set.completed ? "text-success" : is1RM ? "text-amber-400" : isWarmup ? "text-orange-400/80" : "text-muted-foreground"}`}>
                                      {is1RM ? <Target className="h-3 w-3 inline" /> : isWarmup ? <Flame className="h-3 w-3 inline" /> : si + 1}
                                    </span>
                                    {isTimeBased ? (
                                      <ExerciseTimer
                                        targetSeconds={targetSec}
                                        onComplete={(secs) => {
                                          updateSetField(ex.id, si, "reps", secs);
                                          toggleSet(ex.id, si);
                                        }}
                                      />
                                    ) : isWarmup ? (
                                      <>
                                        {showWeight && (
                                          <div className={`h-9 w-full rounded-lg px-2 text-xs flex items-center justify-center font-bold ${set.completed ? "bg-success/15 border border-success/40 text-success" : "bg-orange-400/10 border border-orange-400/30 text-orange-400/90"}`}>
                                            {wuRamp!.weight > 0 ? `${wuRamp!.weight} kg` : "—"}
                                          </div>
                                        )}
                                        <div className={`h-9 w-full rounded-lg px-2 text-xs flex items-center justify-center font-semibold ${set.completed ? "bg-success/15 border border-success/40 text-success" : "bg-orange-400/10 border border-orange-400/30 text-orange-400/90"}`}>
                                          {wuRamp!.reps} reps
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        {showWeight && (
                                          <input type="number" inputMode="decimal" placeholder={is1RM ? "1RM" : (lastExerciseData?.[si]?.weight?.toString() || "0")} value={set.weight || ""} onChange={(e) => updateSetField(ex.id, si, "weight", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : is1RM ? "bg-amber-400/10 border border-amber-400/40 text-amber-400 font-semibold placeholder:text-amber-400/50" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                        )}
                                        {is1RM ? (
                                          <div className={`h-9 w-full rounded-lg px-2 text-sm text-center font-bold flex items-center justify-center ${set.completed ? "bg-success/15 border border-success/40 text-success" : "bg-amber-400/10 border border-amber-400/40 text-amber-400"}`}>
                                            1
                                          </div>
                                        ) : (
                                          <input type="number" inputMode="numeric" placeholder={lastExerciseData?.[si]?.reps?.toString() || "0"} value={set.reps || ""} onChange={(e) => updateSetField(ex.id, si, "reps", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                        )}
                                      </>
                                    )}
                                    <button onClick={() => toggleSet(ex.id, si)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${set.completed ? "bg-success text-success-foreground glow-success" : is1RM ? "bg-amber-400/20 text-amber-400 border border-amber-400/40" : isWarmup ? "bg-orange-400/15 text-orange-400 border border-orange-400/30" : "bg-muted/50 text-muted-foreground border border-border/50"}`}>
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </SwipeableSetRow>
                                {set.showRirPicker && (
                                  <div className="flex flex-col gap-1 px-1 pb-1 -mt-0.5">
                                    {set.targetRir && (
                                      <span className="text-[10px] text-muted-foreground">
                                        Target RIR: <span className="font-semibold text-primary">{set.targetRir}</span>
                                      </span>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-muted-foreground mr-1">RIR</span>
                                      {([0, 1, 2, 3] as const).map(n => {
                                        const label = n === 3 ? "3+" : String(n);
                                        const targetMin = set.targetRir ? parseInt(set.targetRir[0], 10) : null;
                                        const targetMax = set.targetRir ? parseInt(set.targetRir[set.targetRir.length - 1], 10) : null;
                                        const isTarget = targetMin !== null && targetMax !== null && n >= targetMin && n <= targetMax;
                                        return (
                                          <button
                                            key={n}
                                            onClick={() => updateSetLogField(ex.id, si, { rir: n, showRirPicker: false })}
                                            className={`flex-1 rounded-md py-1.5 text-[11px] font-bold transition-all active:scale-95 ${isTarget ? "bg-primary/20 text-primary ring-1 ring-primary/40" : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
                                          >
                                            {label}
                                          </button>
                                        );
                                      })}
                                      <button
                                        onClick={() => updateSetLogField(ex.id, si, { showRirPicker: false })}
                                        className="flex-shrink-0 rounded-md px-2 py-1.5 text-[10px] text-muted-foreground/60 bg-muted/30 hover:bg-muted/60 active:scale-95 transition-all"
                                      >
                                        skip
                                      </button>
                                    </div>
                                  </div>
                                )}
                                </React.Fragment>
                              );});})()}
                              {/* Add Set + Warm-up + 1RM Test buttons */}
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  onClick={() => addSet(ex.id)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Set
                                </button>
                                {!isTimeBased && (
                                  <button
                                    onClick={() => addWarmupSet(ex.id)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-dashed border-muted-foreground/40 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
                                    title="Add a warm-up set (excluded from PRs and burn calc)"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Warm-up
                                  </button>
                                )}
                                {!isTimeBased && showWeight && (
                                  <button
                                    onClick={() => add1RMTestSet(ex.id)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-dashed border-amber-400/40 text-xs text-amber-400 hover:bg-amber-400/10 transition-colors"
                                    title="Add a single 1-rep max test set"
                                  >
                                    <Target className="h-3 w-3" />
                                    1RM
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </ExerciseDragItem>
            );

            // Skip non-first superset members (rendered inside the group wrapper)
            if (ssInfo && !ssInfo.isFirst) return null;

            // Wrap superset groups with a visual indicator
            if (ssInfo?.isFirst) {
              const groupExIds = ssInfo.exerciseIds;
              const groupExercises = groupExIds.map(id => {
                const gEx = allExercises.find(e => e.id === id);
                const gOverride = exerciseOverrides[id];
                return gEx ? { ex: gEx, override: gOverride, displayName: gOverride?.name || gEx.name, exId: id } : null;
              }).filter(Boolean) as { ex: typeof allExercises[0]; override: typeof exerciseOverrides[string]; displayName: string; exId: string }[];

              const maxSets = Math.max(...groupExIds.map(id => setLogs[id]?.length || 0));
              const allGroupDone = groupExIds.every(id => setLogs[id]?.every(s => s.completed));
              const groupLastDataById = Object.fromEntries(groupExIds.map(id => [id, getLastDataForExercise(id)]));
              const isSSExpanded = expandedExercise === `ss-${ex.id}`;

              return (
                <Reorder.Item key={`ss-${ex.id}`} value={ex.id} dragListener={false} className="relative">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 rounded-full bg-accent/60 px-2.5 py-0.5">
                      <span className="text-[10px]">🔄</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground">Superset</span>
                    </div>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  {/* Superset header card */}
                  <div
                    className={`glass-card rounded-xl overflow-hidden transition-all border ${allGroupDone ? "border-success/40 bg-success/5" : "border-border/50"}`}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={() => setExpandedExercise(isSSExpanded ? null : `ss-${ex.id}`)}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${allGroupDone ? "bg-success/20 text-success" : "bg-primary/10 text-primary"}`}>
                        {allGroupDone ? <Check className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold truncate ${allGroupDone ? "text-success" : "text-foreground"}`}>
                            {groupExercises.map(g => g.displayName).join(" / ")}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{maxSets} rounds</span>
                      </div>
                      <button
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={e => { e.stopPropagation(); removeExercise(ex.id); }}
                        aria-label="Remove superset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="text-muted-foreground">
                        {isSSExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isSSExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-3">
                            {/* Notes & BW toggles per exercise */}
                            {groupExercises.map(({ ex: gEx, override: gOverride, displayName, exId: gExId }) => (
                              <div key={gExId} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-foreground">{displayName}</span>
                                  {(() => {
                                    const canTrackWeight = (gOverride?.trackWeight ?? gEx.trackWeight) !== false;
                                    const repLabel = gOverride?.repLabel || gEx.repLabel || "Reps";
                                    const isTimeBased = repLabel === "Sec";
                                    if (!isTimeBased && canTrackWeight) {
                                      const dn = (gOverride?.name || gEx.name).toLowerCase();
                                      // Bodyweight toggle — only for exercises that aren't cable-based (e.g. leg raises, not cable crunches)
                                      const isCableType = ["cable", "pushdown", "push down", "face pull", "facepull", "pallof", "crossover", "straight-arm", "rope"].some(kw => dn.includes(kw));
                                      // Light/Heavy toggle — standalone cable exercises only
                                      const isBenchOrMachine = ["lat pull", "pulldown", "pull down", "seated row", "machine row", "machine fly", "pec deck", "t-bar", "t bar", "leg"].some(kw => dn.includes(kw));
                                      const showLightHeavy = isCableType && !isBenchOrMachine;
                                      const showBW = !isCableType;

                                      const hasAnyToggle = showBW || showLightHeavy || gExId === "acc-grip1";
                                      if (!hasAnyToggle) return null;

                                      return (
                                        <div className="flex items-center gap-2 ml-auto">
                                          {showBW && (
                                            <button
                                              onClick={() => setBodyweightExercises(prev => {
                                                const next = new Set(prev);
                                                if (next.has(gExId)) next.delete(gExId);
                                                else next.add(gExId);
                                                return next;
                                              })}
                                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all select-none ${
                                                bodyweightExercises.has(gExId)
                                                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                                  : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
                                              }`}
                                            >
                                              <div className={`h-1.5 w-1.5 rounded-full transition-colors ${bodyweightExercises.has(gExId) ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                              BW
                                            </button>
                                          )}
                                          {showLightHeavy && (
                                            <div className="flex items-center rounded-full bg-muted/50 p-0.5 select-none">
                                              <button
                                                onClick={() => heavyStackExercises.has(gExId) && setHeavyStackExercises(prev => {
                                                  const next = new Set(prev);
                                                  next.delete(gExId);
                                                  return next;
                                                })}
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                                                  !heavyStackExercises.has(gExId)
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground"
                                                }`}
                                              >
                                                Light
                                              </button>
                                              <button
                                                onClick={() => !heavyStackExercises.has(gExId) && setHeavyStackExercises(prev => {
                                                  const next = new Set(prev);
                                                  next.add(gExId);
                                                  return next;
                                                })}
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                                                  heavyStackExercises.has(gExId)
                                                    ? "bg-background text-foreground shadow-sm"
                                                    : "text-muted-foreground"
                                                }`}
                                              >
                                                Heavy
                                              </button>
                                            </div>
                                          )}
                                          {gExId === "acc-grip1" && (
                                            <button
                                              onClick={() => setTwoHandedExercises(prev => {
                                                const next = new Set(prev);
                                                if (next.has(gExId)) next.delete(gExId);
                                                else next.add(gExId);
                                                return next;
                                              })}
                                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all select-none ${
                                                twoHandedExercises.has(gExId)
                                                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                                  : "bg-muted/50 text-muted-foreground hover:bg-muted/80"
                                              }`}
                                            >
                                              <div className={`h-1.5 w-1.5 rounded-full transition-colors ${twoHandedExercises.has(gExId) ? "bg-primary" : "bg-muted-foreground/30"}`} />
                                              2H
                                            </button>
                                          )}
                                          {isCableAttachmentExercise(displayName) && (
                                            <select
                                              value={cableAttachments[gExId] || ""}
                                              onChange={(e) => setCableAttachments(prev => ({
                                                ...prev,
                                                [gExId]: e.target.value,
                                              }))}
                                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/50 border-0 outline-none cursor-pointer transition-all ${
                                                cableAttachments[gExId]
                                                  ? "text-primary ring-1 ring-primary/30 bg-primary/15"
                                                  : "text-muted-foreground"
                                              }`}
                                            >
                                              <option value="">Attachment</option>
                                              {CABLE_ATTACHMENTS.map(att => (
                                                <option key={att} value={att}>{att}</option>
                                              ))}
                                            </select>
                                          )}
                                          {isSingleArmEligible(gExId, displayName) && (
                                            <div className="flex items-center rounded-full bg-muted/50 p-0.5 select-none">
                                              <button
                                                onClick={() => singleArmExercises.has(gExId) && setSingleArmExercises(prev => {
                                                  const next = new Set(prev); next.delete(gExId); return next;
                                                })}
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${!singleArmExercises.has(gExId) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                                              >
                                                2 Arm
                                              </button>
                                              <button
                                                onClick={() => !singleArmExercises.has(gExId) && setSingleArmExercises(prev => {
                                                  const next = new Set(prev); next.add(gExId); return next;
                                                })}
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${singleArmExercises.has(gExId) ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                                              >
                                                1 Arm
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                {(gOverride?.notes || gEx.notes) && (
                                  <p className="text-[11px] text-primary/80 bg-primary/5 rounded-lg px-2 py-1">{gOverride?.notes || gEx.notes}</p>
                                )}
                              </div>
                            ))}

                            {/* Interleaved rounds */}
                            {Array.from({ length: maxSets }, (_, si) => (
                              <div key={si} className="space-y-1.5">
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Round {si + 1}</span>
                                  <div className="flex-1 h-px bg-border/30" />
                                </div>
                                {groupExercises.map(({ ex: gEx, override: gOverride, displayName, exId: gExId }) => {
                                  const set = setLogs[gExId]?.[si];
                                  if (!set) return null;
                                  const isBW = bodyweightExercises.has(gExId);
                                  const showWeight = !isBW && (gOverride?.trackWeight ?? gEx.trackWeight) !== false;
                                  const repLabel = gOverride?.repLabel || gEx.repLabel || "Reps";
                                  const weightLabel = gOverride?.weightLabel || gEx.weightLabel || "Kg";
                                  const isTimeBased = repLabel === "Sec";
                                  const parseTargetSeconds = (reps: string) => {
                                    const match = reps.match(/(\d+)/);
                                    return match ? parseInt(match[1], 10) : 30;
                                  };
                                  const targetSec = isTimeBased ? parseTargetSeconds(gEx.reps) : 0;

                                  return (
                                    <div key={gExId} className="space-y-0.5">
                                      <span className="text-[10px] text-muted-foreground font-medium truncate block">{displayName}</span>
                                      <SwipeableSetRow onDelete={() => deleteSet(gExId, si)}>
                                        <div className={`grid ${isTimeBased ? "grid-cols-[1fr_36px]" : showWeight ? "grid-cols-[1fr_1fr_36px]" : "grid-cols-[1fr_36px]"} gap-x-1.5 items-center bg-background`}>
                                          {isTimeBased ? (
                                            <ExerciseTimer targetSeconds={targetSec} onComplete={(secs) => { updateSetField(gExId, si, "reps", secs); toggleSet(gExId, si); }} />
                                          ) : (
                                            <>
                                              {showWeight && (
                                                <input type="number" inputMode="decimal" placeholder={groupLastDataById[gExId]?.[si]?.weight?.toString() || weightLabel} value={set.weight || ""} onChange={(e) => updateSetField(gExId, si, "weight", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                              )}
                                              <input type="number" inputMode="numeric" placeholder={groupLastDataById[gExId]?.[si]?.reps?.toString() || repLabel} value={set.reps || ""} onChange={(e) => updateSetField(gExId, si, "reps", Number(e.target.value))} className={`h-9 w-full rounded-lg px-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${set.completed ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20" : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"}`} />
                                            </>
                                          )}
                                          <button onClick={() => toggleSet(gExId, si)} className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${set.completed ? "bg-success text-success-foreground glow-success" : "bg-muted/50 text-muted-foreground border border-border/50"}`}>
                                            <Check className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </SwipeableSetRow>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}

                            {/* Add Round button */}
                            <button
                              onClick={() => groupExIds.forEach(id => addSet(id))}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors mt-1"
                            >
                              <Plus className="h-3 w-3" />
                              Add Round
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reorder.Item>
              );
            }

            return exerciseCard;
          })}
        </Reorder.Group>

        {/* Add Accessory Work + Add Exercise */}
        <div className="space-y-2 mt-4">
          {ACCESSORY_ROUTINES.filter(r => !addedAccessories.includes(r.id)).length > 0 && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Accessory Work</p>
              <div className="flex flex-wrap gap-2">
                {ACCESSORY_ROUTINES.filter(r => !addedAccessories.includes(r.id)).map(routine => {
                  const Icon = accessoryIcon(routine.id);
                  return (
                    <button
                      key={routine.id}
                      onClick={() => addAccessory(routine.id)}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{routine.name}</span>
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setAddExerciseOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-card/50 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Dumbbell className="h-3.5 w-3.5" />
              <span>Add Exercise</span>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <RestTimer key={restTimerKey} isActive={restTimerActive} initialSeconds={restDuration} onClose={() => setRestTimerActive(false)} onTimerEnd={() => toast("Rest complete! Time for the next set 💪")} />

      <ExerciseVideoSheet
        open={!!videoExercise}
        onOpenChange={(open) => !open && setVideoExercise(null)}
        exerciseName={videoExercise?.name || ""}
        exerciseId={videoExercise?.id || ""}
      />

      {/* Swap Exercise Sheet */}
      <Sheet open={!!swapExerciseId} onOpenChange={(open) => { if (!open) { setSwapExerciseId(null); setSwapSearch(""); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border/50 max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="font-display text-lg text-foreground flex items-center gap-2">
              <Shuffle className="h-4 w-4 text-primary" />
              Swap Exercise
            </SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-2 overflow-y-auto max-h-[65vh] pb-6">
            {swapExerciseId && (
              <>
                {/* Restore original */}
                {exerciseOverrides[swapExerciseId] && (() => {
                  const origEx = allExercises.find(e => e.id === swapExerciseId);
                  return origEx ? (
                    <button
                      onClick={() => {
                        setExerciseOverrides(prev => { const next = { ...prev }; delete next[swapExerciseId]; return next; });
                        setSwapExerciseId(null);
                        setSwapSearch("");
                        hapticMedium();
                        toast.success(`Restored ${origEx.name}`);
                      }}
                      className="w-full text-left rounded-xl bg-secondary/50 p-3 hover:bg-secondary/70 transition-colors border border-border/30"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{origEx.name}</p>
                        <span className="ml-auto text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">Original</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{origEx.targetMuscle}</p>
                    </button>
                  ) : null;
                })()}

                {/* Curated substitutes */}
                {([...(EXERCISE_SUBSTITUTIONS[swapExerciseId] || []), ...(ACCESSORY_SUBSTITUTIONS[swapExerciseId] || [])]).length > 0 && (
                  <>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide pt-1">Suggested</p>
                    {([...(EXERCISE_SUBSTITUTIONS[swapExerciseId] || []), ...(ACCESSORY_SUBSTITUTIONS[swapExerciseId] || [])]).map((sub) => {
                      const isActive = exerciseOverrides[swapExerciseId]?.substituteId === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={async () => {
                            setExerciseOverrides(prev => ({
                              ...prev,
                              [swapExerciseId]: { name: sub.name, notes: sub.notes, targetMuscle: sub.targetMuscle, trackWeight: sub.trackWeight, repLabel: sub.repLabel, weightLabel: sub.weightLabel, substituteId: sub.id },
                            }));
                            // Compute the effective ID for the swapped-in exercise using the original slot's modifiers
                            let effId = sub.id;
                            if (twoHandedExercises.has(swapExerciseId)) effId += "-2h";
                            if (heavyStackExercises.has(swapExerciseId)) effId += "-heavy";
                            if (singleArmExercises.has(swapExerciseId)) effId += "-sa";
                            const att = cableAttachments[swapExerciseId];
                            if (att) effId += `-${attachmentKey(att)}`;
                            const idsToFetch = Array.from(new Set([sub.id, effId]));
                            await Promise.all(idsToFetch.map(async (id) => {
                              if (lastSessionData[id]) return;
                              const subData = await fetchExerciseLastData(id);
                              if (subData.length > 0) setLastSessionData(prev => ({ ...prev, [id]: subData }));
                            }));
                            setSwapExerciseId(null);
                            setSwapSearch("");
                            hapticMedium();
                            toast.success(`Swapped to ${sub.name}`);
                          }}
                          disabled={isActive}
                          className={`w-full text-left rounded-xl p-3 transition-colors border ${isActive ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border/30 hover:bg-secondary/70"}`}
                        >
                          <p className="text-sm font-medium text-foreground">{sub.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{sub.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{sub.targetMuscle}</span>
                            {sub.notes && <span className="text-[10px] text-primary/70 truncate">{sub.notes}</span>}
                          </div>
                          {isActive && <span className="text-[10px] text-primary font-medium mt-1 block">Currently selected</span>}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Library search */}
                <div className="pt-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Search Library</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      value={swapSearch}
                      onChange={(e) => setSwapSearch(e.target.value)}
                      placeholder="Search 700+ exercises..."
                      className="w-full h-9 rounded-xl bg-muted/50 border border-border/50 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  {swapSearch.length > 1 && (() => {
                    const libResults = getAllSwapExercises()
                      .filter(ex => ex.name.toLowerCase().includes(swapSearch.toLowerCase()))
                      .slice(0, 10);
                    return libResults.length > 0 ? (
                      <div className="space-y-1.5">
                        {libResults.map((ex) => {
                          const isActive = exerciseOverrides[swapExerciseId]?.substituteId === ex.id;
                          return (
                            <button
                              key={ex.id}
                              onClick={async () => {
                                setExerciseOverrides(prev => ({
                                  ...prev,
                                  [swapExerciseId]: { name: ex.name, targetMuscle: ex.muscleGroup, substituteId: ex.id },
                                }));
                                let effId = ex.id;
                                if (twoHandedExercises.has(swapExerciseId)) effId += "-2h";
                                if (heavyStackExercises.has(swapExerciseId)) effId += "-heavy";
                                if (singleArmExercises.has(swapExerciseId)) effId += "-sa";
                                const att = cableAttachments[swapExerciseId];
                                if (att) effId += `-${attachmentKey(att)}`;
                                const idsToFetch = Array.from(new Set([ex.id, effId]));
                                await Promise.all(idsToFetch.map(async (id) => {
                                  if (lastSessionData[id]) return;
                                  const subData = await fetchExerciseLastData(id);
                                  if (subData.length > 0) setLastSessionData(prev => ({ ...prev, [id]: subData }));
                                }));
                                setSwapExerciseId(null);
                                setSwapSearch("");
                                hapticMedium();
                                toast.success(`Swapped to ${ex.name}`);
                              }}
                              disabled={isActive}
                              className={`w-full text-left rounded-xl p-3 transition-colors border ${isActive ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border/30 hover:bg-secondary/70"}`}
                            >
                              <p className="text-sm font-medium text-foreground">{ex.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ex.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{ex.muscleGroup}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{ex.equipment}</span>
                              </div>
                              {isActive && <span className="text-[10px] text-primary font-medium mt-1 block">Currently selected</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No exercises found</p>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Exercise Sheet */}
      <Sheet open={addExerciseOpen} onOpenChange={(open) => { if (!open) { setAddExerciseOpen(false); setAddExerciseSearch(""); setAddExerciseMuscle(null); } }}>
        <SheetContent side="bottom" className="rounded-t-2xl bg-card border-border/50 max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="font-display text-lg text-foreground flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              Add Exercise
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 mt-4 h-[calc(80vh-80px)]">
            {/* Search */}
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={addExerciseSearch}
                onChange={(e) => { setAddExerciseSearch(e.target.value); if (e.target.value) setAddExerciseMuscle(null); }}
                placeholder="Search 800+ exercises..."
                autoFocus
                className="w-full h-10 rounded-xl bg-muted/50 border border-border/50 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            {/* Muscle group pills */}
            {!addExerciseSearch && (
              <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-hide">
                {["Chest","Back","Shoulders","Biceps","Triceps","Quads","Hamstrings","Glutes","Calves","Abs","Forearms","Cardio"].map(group => (
                  <button
                    key={group}
                    onClick={() => setAddExerciseMuscle(prev => prev === group ? null : group)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${addExerciseMuscle === group ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"}`}
                  >
                    {group}
                  </button>
                ))}
              </div>
            )}
            {/* Results */}
            <div className="overflow-y-auto space-y-1.5 pb-6">
              {(() => {
                const hasSearch = addExerciseSearch.length > 1;
                const hasMuscle = !!addExerciseMuscle;
                if (!hasSearch && !hasMuscle) {
                  return <p className="text-xs text-muted-foreground text-center py-4">Search or pick a muscle group above</p>;
                }
                const results = getAllSwapExercises()
                  .filter(ex => {
                    const matchesSearch = !hasSearch || ex.name.toLowerCase().includes(addExerciseSearch.toLowerCase());
                    const matchesMuscle = !hasMuscle || ex.muscleGroup.toLowerCase().includes(addExerciseMuscle!.toLowerCase());
                    return matchesSearch && matchesMuscle;
                  })
                  .slice(0, 20);
                return results.length > 0 ? results.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => addSingleExercise(ex)}
                    className="w-full text-left rounded-xl p-3 bg-secondary/50 border border-border/30 hover:bg-secondary/70 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{ex.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{ex.muscleGroup}</span>
                      {ex.equipment && <span className="text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">{ex.equipment}</span>}
                    </div>
                  </button>
                )) : <p className="text-xs text-muted-foreground text-center py-4">No exercises found</p>;
              })()}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="mx-auto max-w-lg md:max-w-2xl">
          <button onClick={handleFinish} className="w-full rounded-xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary active:scale-[0.98] transition-transform">
            Finish Workout ({completedExercises}/{totalExercises})
          </button>
        </div>
      </div>

      <PRCelebration pr={celebrationPR} onDismiss={() => setCelebrationPR(null)} />
    </div>
  );
}
