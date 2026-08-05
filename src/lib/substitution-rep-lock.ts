/**
 * Rep-range locking for substituted exercises.
 *
 * A substitute must be performed with the SAME rep range as the slot it
 * replaces (e.g. 5-10 on the Upper/Lower split). The only exceptions are ab
 * and grip work, where the substitute's own metric (seconds held, reps, etc.)
 * is what matters.
 */

type SlotLike = {
  id: string;
  name?: string;
  targetMuscle?: string;
  reps?: string;
  repLabel?: string;
};

type SubLike = {
  id: string;
  name: string;
  notes?: string;
  targetMuscle?: string;
  trackWeight?: boolean;
  repLabel?: string;
  weightLabel?: string;
};

const FLEX_PATTERNS = [
  "ab", "abs", "core", "oblique", "plank", "crunch",
  "grip", "forearm", "wrist", "hang", "carry", "farmer",
];

/** Abs / grip work keeps its own rep or time prescription. */
export function isRepFlexibleSlot(slot?: SlotLike | null): boolean {
  if (!slot) return false;
  const hay = `${slot.id} ${slot.name ?? ""} ${slot.targetMuscle ?? ""}`.toLowerCase();
  return FLEX_PATTERNS.some(p => new RegExp(`\\b${p}`).test(hay));
}

/** Remove rep-count hints from substitute notes so they don't contradict the slot's range. */
function stripRepHints(notes?: string): string | undefined {
  if (!notes) return notes;
  const cleaned = notes
    .replace(/\b\d+\s*(?:-\s*\d+)?\s*(?:hard\s+)?reps?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/(^[\s,—-]+)|([\s,—-]+$)/g, "")
    .trim();
  return cleaned.length ? cleaned : undefined;
}

/**
 * Build the exercise override for a substitution, keeping the original slot's
 * rep range/metric unless the slot is ab or grip work.
 */
export function buildSubstitutionOverride(slot: SlotLike | undefined, sub: SubLike) {
  const flexible = isRepFlexibleSlot(slot);
  if (flexible) {
    return {
      name: sub.name,
      notes: sub.notes,
      targetMuscle: sub.targetMuscle ?? slot?.targetMuscle ?? "",
      trackWeight: sub.trackWeight,
      repLabel: sub.repLabel,
      weightLabel: sub.weightLabel,
      substituteId: sub.id,
    };
  }

  const baseNotes = stripRepHints(sub.notes);
  const repRange = slot?.reps;
  const notes = repRange
    ? [baseNotes, `Keep ${repRange} reps`].filter(Boolean).join(" — ")
    : baseNotes;

  return {
    name: sub.name,
    notes,
    targetMuscle: sub.targetMuscle ?? slot?.targetMuscle ?? "",
    trackWeight: sub.trackWeight,
    // Lock the metric to the slot's own rep label (defaults to plain reps)
    repLabel: slot?.repLabel ?? "Reps",
    weightLabel: sub.weightLabel,
    substituteId: sub.id,
  };
}
