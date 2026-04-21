import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Play, Dumbbell, Edit2, X } from "lucide-react";
import { motion, Reorder, useMotionValue, animate, useDragControls } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { toast } from "sonner";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { WORKOUTS, type Exercise, type WorkoutDay } from "@/lib/workout-data";
import { ACCESSORY_ROUTINES } from "@/lib/accessory-routines";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS_ALL } from "@/lib/exercise-library";
import HelpButton from "@/components/demo/HelpButton";

const MUSCLE_GROUPS = MUSCLE_GROUPS_ALL.filter((g) => g !== "All");

const COLORS = [
  "from-amber-500/20 to-orange-500/10",
  "from-cyan-500/20 to-blue-500/10",
  "from-emerald-500/20 to-teal-500/10",
  "from-purple-500/20 to-fuchsia-500/10",
  "from-rose-500/20 to-pink-500/10",
  "from-lime-500/20 to-green-500/10",
];

const EMOJIS = ["🧤", "⚡", "🏃", "🦵", "💪", "🎯", "🛡️", "🔥"];

const STORAGE_KEY = "ironkeeper_custom_workouts";

// ── Combined searchable exercise pool ─────────────────────────────────────────
// Includes all pre-built workout exercises + the imported library, deduplicated by name.
type SearchEntry = { name: string; muscleGroup: string; equipment?: string };

const _seenNames = new Set<string>();
const ALL_EXERCISES: SearchEntry[] = [];

for (const w of WORKOUTS) {
  for (const ex of w.exercises) {
    const key = ex.name.toLowerCase();
    if (!_seenNames.has(key)) {
      _seenNames.add(key);
      ALL_EXERCISES.push({ name: ex.name, muscleGroup: ex.targetMuscle });
    }
  }
}
for (const r of ACCESSORY_ROUTINES) {
  for (const ex of r.exercises) {
    const key = ex.name.toLowerCase();
    if (!_seenNames.has(key)) {
      _seenNames.add(key);
      ALL_EXERCISES.push({ name: ex.name, muscleGroup: ex.targetMuscle });
    }
  }
}
for (const ex of EXERCISE_LIBRARY) {
  const key = ex.name.toLowerCase();
  if (!_seenNames.has(key)) {
    _seenNames.add(key);
    ALL_EXERCISES.push({ name: ex.name, muscleGroup: ex.muscleGroup, equipment: ex.equipment });
  }
}

// ── localStorage helpers ───────────────────────────────────────────────────────
function getCustomWorkouts(): WorkoutDay[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCustomWorkouts(workouts: WorkoutDay[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
}

export function getAllCustomWorkouts(): WorkoutDay[] {
  return getCustomWorkouts().map((w) => ({ ...w, icon: Dumbbell }));
}

// ── Exercise name input with unified search typeahead ─────────────────────────
function ExerciseNameInput({
  value,
  onChange,
  onSelectFromLibrary,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelectFromLibrary: (name: string, muscleGroup: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.length > 1
    ? ALL_EXERCISES.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 7)
    : [];

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => { if (query.length > 1) setOpen(true); }}
        placeholder="Search or type exercise name..."
        className="w-full h-8 rounded-lg bg-muted/50 border border-border/50 px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl bg-card border border-border/50 shadow-xl overflow-hidden">
          {results.map((ex, i) => (
            <button
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                setQuery(ex.name);
                onSelectFromLibrary(ex.name, ex.muscleGroup);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 hover:bg-secondary/50 transition-colors border-b border-border/20 last:border-0"
            >
              <p className="text-sm font-medium text-foreground">{ex.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {ex.muscleGroup}{ex.equipment ? ` · ${ex.equipment}` : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Swipeable exercise row ─────────────────────────────────────────────────────
function SwipeToDeleteRow({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const x = useMotionValue(0);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -80) {
      onDelete();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex items-center px-5 bg-destructive rounded-xl">
        <Trash2 className="h-4 w-4 text-white" />
      </div>
      <motion.div
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -110, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative bg-card rounded-xl"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Draggable exercise item (vertical reorder + horizontal swipe-to-delete) ────
function ExerciseItem({
  ex,
  index,
  onUpdate,
  onDelete,
}: {
  ex: Exercise;
  index: number;
  onUpdate: (id: string, field: keyof Exercise, value: string | number) => void;
  onDelete: (id: string) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={ex.id}
      dragListener={false}
      dragControls={dragControls}
      className="list-none"
    >
      <SwipeToDeleteRow onDelete={() => onDelete(ex.id)}>
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="cursor-grab active:cursor-grabbing touch-none shrink-0"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary shrink-0">
              {index + 1}
            </span>
            <ExerciseNameInput
              value={ex.name}
              onChange={(n) => onUpdate(ex.id, "name", n)}
              onSelectFromLibrary={(n, muscleGroup) => {
                onUpdate(ex.id, "name", n);
                onUpdate(ex.id, "targetMuscle", muscleGroup);
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pl-8">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Sets</label>
              <input
                type="number"
                min={1}
                max={10}
                value={ex.sets}
                onChange={(e) => onUpdate(ex.id, "sets", Number(e.target.value))}
                className="w-full h-7 rounded-md bg-muted/50 border border-border/50 px-2 text-xs text-center text-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Reps</label>
              <input
                value={ex.reps}
                onChange={(e) => onUpdate(ex.id, "reps", e.target.value)}
                placeholder="8-10"
                className="w-full h-7 rounded-md bg-muted/50 border border-border/50 px-2 text-xs text-center text-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Muscle</label>
              <select
                value={ex.targetMuscle}
                onChange={(e) => onUpdate(ex.id, "targetMuscle", e.target.value)}
                className="w-full h-7 rounded-md bg-muted/50 border border-border/50 px-1 text-[10px] text-foreground outline-none"
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pl-8">
            <input
              value={ex.notes || ""}
              onChange={(e) => onUpdate(ex.id, "notes", e.target.value)}
              placeholder="Notes (optional)"
              className="w-full h-7 rounded-md bg-muted/50 border border-border/50 px-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
      </SwipeToDeleteRow>
    </Reorder.Item>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function WorkoutBuilder() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧤");
  const [focus, setFocus] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutDay[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setSavedWorkouts(getCustomWorkouts());
  }, []);

  const addExercise = () => {
    hapticMedium();
    setExercises((prev) => [
      ...prev,
      {
        id: `custom-${crypto.randomUUID().slice(0, 8)}`,
        name: "",
        sets: 3,
        reps: "8-10",
        notes: "",
        targetMuscle: "Chest",
      },
    ]);
  };

  const updateExercise = (id: string, field: keyof Exercise, value: string | number) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)));
  };

  const removeExercise = (id: string) => {
    hapticMedium();
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const loadForEdit = (workout: WorkoutDay) => {
    setEditingId(workout.id);
    setName(workout.name);
    setFocus(workout.focus);
    setColor(workout.color);
    setExercises(workout.exercises.map((e) => ({ ...e })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setFocus("");
    setExercises([]);
  };

  const saveWorkout = () => {
    if (!name.trim()) { toast.error("Give your workout a name"); return; }
    if (exercises.length === 0) { toast.error("Add at least one exercise"); return; }
    if (exercises.some((ex) => !ex.name.trim())) { toast.error("Fill in all exercise names"); return; }

    const existing = getCustomWorkouts();

    if (editingId) {
      const updated = existing.map((w) =>
        w.id === editingId
          ? { ...w, name: name.trim(), focus: focus.trim() || "Custom Workout", color, exercises }
          : w
      );
      saveCustomWorkouts(updated);
      setSavedWorkouts(updated);
      setEditingId(null);
      toast.success("Workout updated!");
    } else {
      const workout: WorkoutDay = {
        id: `custom-${crypto.randomUUID().slice(0, 8)}`,
        name: name.trim(),
        icon: Dumbbell,
        day: "Custom",
        focus: focus.trim() || "Custom Workout",
        exercises,
        color,
      };
      existing.push(workout);
      saveCustomWorkouts(existing);
      setSavedWorkouts(existing);
      toast.success("Workout saved!");
    }

    hapticSuccess();
    setName("");
    setFocus("");
    setExercises([]);
  };

  const deleteCustomWorkout = (id: string) => {
    const updated = getCustomWorkouts().filter((w) => w.id !== id);
    saveCustomWorkouts(updated);
    setSavedWorkouts(updated);
    if (editingId === id) cancelEdit();
    toast("Workout deleted");
  };

  const exerciseIds = exercises.map((e) => e.id);

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-bold">
            {editingId ? "Edit Workout" : "Workout Builder"}
          </h1>
          <div className="ml-auto flex items-center gap-1">
            <HelpButton />
            {editingId && (
              <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Builder form */}
        <div className="glass-card-elevated rounded-2xl p-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex flex-wrap gap-1.5 max-w-[120px]">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e ? "bg-primary/20 ring-1 ring-primary/50" : "bg-muted/50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workout Name"
                className="w-full h-10 rounded-lg bg-muted/50 border border-border/50 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 font-display font-semibold"
              />
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Focus area (e.g., Chest · Shoulders)"
                className="w-full h-9 rounded-lg bg-muted/50 border border-border/50 px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 flex-1 rounded-md bg-gradient-to-br ${c} transition-all ${
                  color === c ? "ring-2 ring-primary/60" : "ring-1 ring-border/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">
              Exercises{exercises.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-1">({exercises.length})</span>
              )}
            </h2>
            <button
              onClick={addExercise}
              className="flex items-center gap-1 text-xs font-medium text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          <Reorder.Group
            axis="y"
            values={exerciseIds}
            onReorder={(newIds) => {
              setExercises((prev) => newIds.map((id) => prev.find((e) => e.id === id)!));
            }}
            className="space-y-2"
          >
            {exercises.map((ex, i) => (
              <ExerciseItem
                key={ex.id}
                ex={ex}
                index={i}
                onUpdate={updateExercise}
                onDelete={removeExercise}
              />
            ))}
          </Reorder.Group>

          {exercises.length === 0 && (
            <button
              onClick={addExercise}
              className="w-full glass-card rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="h-8 w-8" />
              <span className="text-sm font-medium">Add your first exercise</span>
              <span className="text-xs opacity-60">Search the exercise library or type a name</span>
            </button>
          )}
        </div>

        {exercises.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={saveWorkout}
            className="w-full rounded-xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Save className="h-5 w-5" /> {editingId ? "Update Workout" : "Save Workout"}
          </motion.button>
        )}

        {savedWorkouts.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-base font-semibold mt-4">Your Custom Workouts</h2>
            {savedWorkouts.map((w) => (
              <div
                key={w.id}
                className={`glass-card rounded-xl p-4 bg-gradient-to-br ${w.color} ${editingId === w.id ? "ring-2 ring-primary/50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-semibold text-foreground truncate">{w.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {w.exercises.length} exercise{w.exercises.length !== 1 ? "s" : ""} · {w.focus}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => loadForEdit(w)}
                      className="h-8 w-8 rounded-lg bg-secondary/70 text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/workout/${w.id}`)}
                      className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center"
                      title="Start"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCustomWorkout(w.id)}
                      className="h-8 w-8 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
