import { Zap, Wind, Dumbbell, Shield, ArrowUp, ArrowDown, Footprints, User, Flame, Target, Trophy, Layers, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  targetMuscle: string;
  trackWeight?: boolean;  // false = bodyweight/no load (default true)
  repLabel?: string;      // e.g. "Reps", "Sec", "Metres", "Rounds" (default "Reps")
  weightLabel?: string;   // e.g. "Kg", "Height (cm)" (default "Kg")
};

export type WorkoutDay = {
  id: string;
  name: string;
  icon: LucideIcon;
  day: string;
  focus: string;
  exercises: Exercise[];
  color: string;
};

export type CompletedWorkout = {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  duration: number; // minutes
  exercisesCompleted: number;
  totalExercises: number;
  sets: { exerciseId: string; originalExerciseId?: string; exerciseName?: string; reps: number; weight: number; setType?: "working" | "warmup" | "1rm_test" }[];
  effortRating?: number;    // 1-5 star rating
  sessionNotes?: string;    // notes for coach
  caloriesBurned?: number | null;
  startedAt?: string;       // ISO timestamp when session began (wall-clock gym start)
};

export type WeekScheduleItem = {
  day: string;
  label: string;
  type: "open" | "completed";
  completedWorkoutName?: string;
};

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const WORKOUTS: WorkoutDay[] = [
  {
    id: "power",
    name: "Explosive Power",
    icon: Zap,
    day: "Explosive",
    focus: "Diving Power · Vertical Jump · Shot Stopping",
    color: "from-amber-500/20 to-orange-500/10",
    exercises: [
      { id: "pw1", name: "Box Jumps", sets: 3, reps: "8-10", targetMuscle: "Explosive Power", notes: "Max height, soft landing, reset between reps", trackWeight: false, repLabel: "Reps" },
      { id: "pw2", name: "Depth Jumps", sets: 3, reps: "8-10", targetMuscle: "Reactive Power", notes: "Step off box, minimise ground contact time", trackWeight: false, repLabel: "Reps" },
      { id: "pw3", name: "Med Ball Slam", sets: 3, reps: "8-10", targetMuscle: "Core Power", notes: "Full extension overhead, slam hard" },
      { id: "pw4", name: "Single-Leg Broad Jump", sets: 3, reps: "8-10 each", targetMuscle: "Unilateral Power", notes: "Mimic diving push-off, stick the landing", trackWeight: false, repLabel: "Reps" },
      { id: "pw7", name: "Lateral Bounds", sets: 3, reps: "8-10 each", targetMuscle: "Lateral Power", notes: "Stick each landing 1s, drive off outside foot", trackWeight: false, repLabel: "Reps" },
      { id: "pw5", name: "Kettlebell Swing", sets: 3, reps: "8-10", targetMuscle: "Hip Power", notes: "Hip snap — don't use arms" },
      { id: "pw6", name: "Plyo Push-Up", sets: 3, reps: "8-10", targetMuscle: "Upper Body Reactive", notes: "Explosive hands off ground", trackWeight: false, repLabel: "Reps" },
    ],
  },
  {
    id: "agility",
    name: "Agility & Footwork",
    icon: Wind,
    day: "Speed",
    focus: "Lateral Movement · Quick Feet · Reaction Speed",
    color: "from-cyan-500/20 to-blue-500/10",
    exercises: [
      { id: "ag1", name: "Lateral Shuffle", sets: 4, reps: "30s each way", targetMuscle: "Lateral Speed", notes: "Low stance, quick feet, stay on balls of feet", trackWeight: false, repLabel: "Sec" },
      { id: "ag2", name: "T-Drill", sets: 4, reps: "1 rep", targetMuscle: "Change of Direction", notes: "Sprint, shuffle, backpedal — full speed", trackWeight: false, repLabel: "Sec" },
      { id: "ag3", name: "Ladder Drills (In-Out)", sets: 4, reps: "4 rounds", targetMuscle: "Foot Speed", notes: "Light on feet, arms pumping", trackWeight: false, repLabel: "Rounds" },
      { id: "ag4", name: "Lateral Bound", sets: 3, reps: "10-12 each", targetMuscle: "Lateral Power", notes: "Stick each landing for 1s, control the decel", trackWeight: false, repLabel: "Reps" },
      { id: "ag5", name: "Reactive Ball Drop", sets: 4, reps: "10", targetMuscle: "Reaction Time", notes: "Partner drops ball, catch before 2nd bounce", trackWeight: false, repLabel: "Reps" },
      { id: "ag6", name: "Carioca / Grapevine", sets: 3, reps: "20m each way", targetMuscle: "Hip Mobility", notes: "Open hips, stay low, increase speed each set", trackWeight: false, repLabel: "Metres" },
    ],
  },
  {
    id: "strength",
    name: "GK Strength",
    icon: Dumbbell,
    day: "Strength",
    focus: "Lower Body · Core Stability · Injury Prevention",
    color: "from-emerald-500/20 to-teal-500/10",
    exercises: [
      { id: "st1", name: "Goblet Squat", sets: 4, reps: "8-10", targetMuscle: "Quads/Glutes", notes: "Depth over weight, knees track toes" },
      { id: "st2", name: "Romanian Deadlift (DB)", sets: 3, reps: "8-10", targetMuscle: "Hamstrings", notes: "Slow 3s negative, feel the stretch" },
      { id: "st3", name: "Bulgarian Split Squat", sets: 3, reps: "8-10 each", targetMuscle: "Single-Leg Strength", notes: "Key for diving stability, control the descent" },
      { id: "st4", name: "Nordic Hamstring Curl", sets: 3, reps: "8-10", targetMuscle: "Hamstring Resilience", notes: "Injury prevention — control the eccentric", trackWeight: false, repLabel: "Reps" },
      { id: "st5", name: "Copenhagen Adductor", sets: 3, reps: "8-10 each", targetMuscle: "Groin/Adductors", notes: "Essential groin injury prevention", trackWeight: false, repLabel: "Reps" },
      { id: "st6", name: "Dead Bug", sets: 3, reps: "8-10 each", targetMuscle: "Core Stability", notes: "Press lower back flat, breathe out on extension", trackWeight: false, repLabel: "Reps" },
    ],
  },
  {
    id: "reflexes",
    name: "Reflexes & Upper Body",
    icon: Shield,
    day: "Upper Body",
    focus: "Catching Strength · Throwing Power · Wrist/Grip",
    color: "from-purple-500/20 to-fuchsia-500/10",
    exercises: [
      { id: "rf1", name: "Med Ball Chest Pass", sets: 3, reps: "8-10", targetMuscle: "Throwing Power", notes: "Step forward, explosive push, wall or partner" },
      { id: "rf2", name: "Face Pulls", sets: 3, reps: "8-10", targetMuscle: "Rear Delts/Posture", notes: "Shoulder health — squeeze shoulder blades" },
      { id: "rf3", name: "Farmer's Walk", sets: 3, reps: "40m", targetMuscle: "Grip Strength", notes: "Heavy as possible, shoulders back", repLabel: "Metres" },
      { id: "rf4", name: "Wrist Curls (DB)", sets: 3, reps: "8-10", targetMuscle: "Wrist Strength", notes: "Strong wrists = stronger saves, both directions" },
      { id: "rf5", name: "Overhead DB Press", sets: 3, reps: "8-10", targetMuscle: "Shoulders", notes: "Full lockout, powerful for high catches" },
      { id: "rf6", name: "Plank Shoulder Taps", sets: 3, reps: "8-10 each", targetMuscle: "Core/Stability", notes: "Anti-rotation — don't let hips rock", trackWeight: false, repLabel: "Reps" },
    ],
  },
  {
    id: "push",
    name: "Push",
    icon: ArrowUp,
    day: "Push",
    focus: "Chest · Shoulders · Triceps",
    color: "from-red-500/20 to-rose-500/10",
    exercises: [
      { id: "pu1", name: "45° Incline Dumbbell Bench Press", sets: 3, reps: "8-10", targetMuscle: "Upper Chest", notes: "Control the negative, full stretch at bottom" },
      { id: "pu2", name: "Dumbbell Lateral Raises", sets: 3, reps: "8-10", targetMuscle: "Side Delts", notes: "Rest 01 min between sets" },
      { id: "pu3", name: "15° Incline Dumbbell Bench Press", sets: 3, reps: "8-10", targetMuscle: "Upper Chest", notes: "Slight incline, squeeze at the top" },
      { id: "pu4", name: "Flat Dumbbell Flies", sets: 3, reps: "8-10", targetMuscle: "Chest", notes: "Keep in line with nipples / just above" },
      { id: "pu5", name: "X-Over Cable Tricep Extensions", sets: 3, reps: "8-10", targetMuscle: "Triceps", notes: "Lock elbows in place, full extension" },
      { id: "pu6", name: "Single Arm Overhead Cable Tricep Extensions", sets: 3, reps: "8-10", targetMuscle: "Triceps", notes: "Stretch at the bottom, squeeze at lockout" },
    ],
  },
  {
    id: "pull",
    name: "Pull",
    icon: ArrowDown,
    day: "Pull",
    focus: "Back · Biceps · Rear Delts",
    color: "from-blue-500/20 to-indigo-500/10",
    exercises: [
      { id: "pl1", name: "Seated Row Machine", sets: 3, reps: "8-10", targetMuscle: "Mid Back", notes: "Pull to lower chest, squeeze shoulder blades" },
      { id: "pl2", name: "T-Bar Row", sets: 3, reps: "8-10", targetMuscle: "Back Thickness", notes: "Keep chest on pad, drive elbows back" },
      { id: "pl3", name: "Lat Pull Down - Pronated Grip", sets: 3, reps: "8-10", targetMuscle: "Lats", notes: "Wide grip, pull to upper chest, control the negative" },
      { id: "pl4", name: "Face Pulls", sets: 3, reps: "8-10", targetMuscle: "Rear Delts", notes: "High pull, external rotate at top, squeeze shoulder blades" },
      { id: "pl5", name: "Dumbbell Preacher Curls", sets: 3, reps: "8-10", targetMuscle: "Biceps", notes: "Full stretch at bottom, squeeze at top" },
      { id: "pl6", name: "Dumbbell Preacher Hammer Curls", sets: 2, reps: "8-10", targetMuscle: "Biceps", notes: "Neutral grip, controlled negative" },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    icon: Footprints,
    day: "Legs",
    focus: "Quads · Hamstrings · Glutes · Calves",
    color: "from-green-500/20 to-lime-500/10",
    exercises: [
      { id: "lg1", name: "Seated Hamstring Curl", sets: 3, reps: "8-10", targetMuscle: "Hamstrings", notes: "Squeeze at the bottom, slow negative" },
      { id: "lg2", name: "Dumbbell RDL", sets: 3, reps: "8-10", targetMuscle: "Hamstrings/Glutes", notes: "Hinge at hips, keep back flat, feel the hamstring stretch" },
      { id: "lg3", name: "Bulgarian Split Squats", sets: 3, reps: "8-10 each", targetMuscle: "Quads/Glutes", notes: "Rear foot elevated, control the descent" },
      { id: "lg4", name: "Pendulum Squat", sets: 3, reps: "8-10", targetMuscle: "Quads", notes: "Deep range of motion, drive through midfoot" },
      { id: "lg5", name: "Leg Extension", sets: 3, reps: "8-10", targetMuscle: "Quads", notes: "Squeeze at the top, 2s hold" },
      { id: "lg6", name: "Standing Calf Raise", sets: 3, reps: "8-10", targetMuscle: "Calves", notes: "Full stretch at bottom, pause at top" },
    ],
  },
  {
    id: "plyo",
    name: "Plyometrics",
    icon: Flame,
    day: "Plyo",
    focus: "Jump Power · Speed · No Equipment Needed",
    color: "from-orange-500/20 to-red-500/10",
    exercises: [
      { id: "py1", name: "Tuck Jumps", sets: 3, reps: "8-10", targetMuscle: "Explosive Power", notes: "Drive knees to chest, soft landing", trackWeight: false, repLabel: "Reps" },
      { id: "py2", name: "Squat Jumps", sets: 3, reps: "8-10", targetMuscle: "Quads/Glutes", notes: "Full squat, max height each rep", trackWeight: false, repLabel: "Reps" },
      { id: "py3", name: "Split Jump Lunges", sets: 3, reps: "8-10 each", targetMuscle: "Single-Leg Power", notes: "Alternate legs mid-air, land soft", trackWeight: false, repLabel: "Reps" },
      { id: "py4", name: "Broad Jumps", sets: 3, reps: "8-10", targetMuscle: "Horizontal Power", notes: "Swing arms, jump for max distance, stick the landing", trackWeight: false, repLabel: "Reps" },
      { id: "py5", name: "Lateral Bounds", sets: 3, reps: "8-10 each", targetMuscle: "Lateral Power", notes: "Leap side to side, control each landing for 1s", trackWeight: false, repLabel: "Reps" },
      { id: "py6", name: "Burpee Broad Jumps", sets: 3, reps: "8-10", targetMuscle: "Full Body Power", notes: "Burpee into a broad jump forward, reset and repeat", trackWeight: false, repLabel: "Reps" },
      { id: "py7", name: "Plyo Push-Up", sets: 3, reps: "8-10", targetMuscle: "Upper Body Reactive", notes: "Explosive push, hands leave the ground", trackWeight: false, repLabel: "Reps" },
    ],
  },
  {
    id: "upper",
    name: "Upper",
    icon: User,
    day: "Upper Body",
    focus: "Full Upper Body · Push & Pull",
    color: "from-yellow-500/20 to-amber-500/10",
    exercises: [
      { id: "up1", name: "Seated Cable Row", sets: 3, reps: "8-10", targetMuscle: "Mid Back", notes: "Close grip, pull to navel, squeeze back" },
      { id: "up2", name: "Lat Pull Down", sets: 3, reps: "8-10", targetMuscle: "Lats", notes: "Lean back slightly, pull to upper chest" },
      { id: "up3", name: "Flat Dumbbell Bench Press", sets: 3, reps: "8-10", targetMuscle: "Chest", notes: "Control the negative, press through chest" },
      { id: "up4", name: "Cable Flies To Thighs", sets: 3, reps: "8-10", targetMuscle: "Lower Chest", notes: "Cables high to low, squeeze at the bottom" },
      { id: "up5", name: "Converging Shoulder Press Machine", sets: 2, reps: "8-10", targetMuscle: "Shoulders", notes: "Full lockout, don't bounce at the bottom" },
      { id: "up6", name: "Dumbbell Preacher Curls", sets: 3, reps: "8-10", targetMuscle: "Biceps", notes: "Full stretch at bottom, squeeze at top" },
      { id: "up7", name: "Dumbbell Preacher Hammer Curls", sets: 2, reps: "8-10", targetMuscle: "Biceps", notes: "Neutral grip, controlled negative" },
      { id: "up8", name: "Tricep Pushdown", sets: 2, reps: "8-10", targetMuscle: "Triceps", notes: "Split the rope at the bottom, squeeze triceps" },
    ],
  },
  // ── Full Body ──────────────────────────────────────────────────────────────
  {
    id: "fullbody",
    name: "Full Body",
    icon: Target,
    day: "Full Body",
    focus: "Squat · Hinge · Press · Pull · Core",
    color: "from-violet-500/20 to-purple-500/10",
    exercises: [
      { id: "fb1", name: "Barbell Back Squat", sets: 3, reps: "5-8", targetMuscle: "Quads/Glutes", notes: "Compound king — full depth, knees tracking toes" },
      { id: "fb2", name: "Romanian Deadlift", sets: 3, reps: "8-10", targetMuscle: "Hamstrings/Glutes", notes: "Slow 3s eccentric, feel the stretch at the bottom" },
      { id: "fb3", name: "Flat Barbell Bench Press", sets: 3, reps: "5-8", targetMuscle: "Chest", notes: "Full ROM — touch chest, lockout at top" },
      { id: "fb4", name: "Barbell Row", sets: 3, reps: "8-10", targetMuscle: "Back", notes: "Hinge 45°, pull to lower chest, control the negative" },
      { id: "fb5", name: "Overhead Press", sets: 3, reps: "8-10", targetMuscle: "Shoulders", notes: "Brace core, press directly overhead to full lockout" },
      { id: "fb6", name: "Dumbbell Lateral Raises", sets: 3, reps: "12-15", targetMuscle: "Side Delts", notes: "Slight bend in elbow, raise to shoulder height only" },
    ],
  },
  // ── 5/3/1 Strength Days ───────────────────────────────────────────────────
  {
    id: "squat",
    name: "Squat Day",
    icon: Trophy,
    day: "Squat",
    focus: "Barbell Back Squat · Lower Body Accessory",
    color: "from-amber-500/20 to-yellow-500/10",
    exercises: [
      { id: "sq1", name: "Barbell Back Squat", sets: 3, reps: "5", targetMuscle: "Quads/Glutes", notes: "5/3/1 main lift — work up to top set, then back-off sets" },
      { id: "sq2", name: "Front Squat", sets: 3, reps: "8-10", targetMuscle: "Quads", notes: "Keep elbows high, upright torso" },
      { id: "sq3", name: "Leg Press", sets: 3, reps: "8-10", targetMuscle: "Quads/Glutes" },
      { id: "sq4", name: "Leg Extension", sets: 3, reps: "10-12", targetMuscle: "Quads" },
      { id: "sq5", name: "Walking Lunges", sets: 3, reps: "10-12 each", targetMuscle: "Quads/Glutes", notes: "Bodyweight or dumbbells", trackWeight: false, repLabel: "Reps" },
      { id: "sq6", name: "Seated Hamstring Curl", sets: 3, reps: "12-15", targetMuscle: "Hamstrings" },
    ],
  },
  {
    id: "bench",
    name: "Bench Day",
    icon: ArrowUp,
    day: "Bench",
    focus: "Flat Barbell Bench · Chest & Tricep Accessory",
    color: "from-red-500/20 to-rose-500/10",
    exercises: [
      { id: "bn1", name: "Flat Barbell Bench Press", sets: 3, reps: "5", targetMuscle: "Chest", notes: "5/3/1 main lift — full ROM, controlled touch-and-go" },
      { id: "bn2", name: "Incline Barbell Bench Press", sets: 3, reps: "8-10", targetMuscle: "Upper Chest" },
      { id: "bn3", name: "45° Incline Dumbbell Bench Press", sets: 3, reps: "8-10", targetMuscle: "Upper Chest" },
      { id: "bn4", name: "Cable Fly", sets: 3, reps: "12-15", targetMuscle: "Chest", notes: "Full stretch at bottom, squeeze hard at top" },
      { id: "bn5", name: "Skull Crushers", sets: 3, reps: "8-10", targetMuscle: "Triceps", notes: "Lower bar to forehead, extend slowly" },
      { id: "bn6", name: "X-Over Cable Tricep Extensions", sets: 3, reps: "10-12", targetMuscle: "Triceps" },
    ],
  },
  {
    id: "deadlift",
    name: "Deadlift Day",
    icon: Activity,
    day: "Deadlift",
    focus: "Conventional Deadlift · Back & Posterior Chain",
    color: "from-slate-500/20 to-zinc-500/10",
    exercises: [
      { id: "dl1", name: "Conventional Deadlift", sets: 3, reps: "5", targetMuscle: "Full Posterior Chain", notes: "5/3/1 main lift — brace hard, drive through the floor" },
      { id: "dl2", name: "Rack Pull", sets: 3, reps: "5-6", targetMuscle: "Upper Back/Traps", notes: "Bar just below knee, overload position" },
      { id: "dl3", name: "Barbell Row", sets: 3, reps: "8-10", targetMuscle: "Mid Back" },
      { id: "dl4", name: "Lat Pull Down - Pronated Grip", sets: 3, reps: "8-10", targetMuscle: "Lats" },
      { id: "dl5", name: "Single Arm Dumbbell Row", sets: 3, reps: "10-12 each", targetMuscle: "Lats/Mid Back" },
      { id: "dl6", name: "Face Pulls", sets: 3, reps: "12-15", targetMuscle: "Rear Delts", notes: "Shoulder health — external rotation at lockout" },
    ],
  },
  {
    id: "press",
    name: "Press Day",
    icon: Dumbbell,
    day: "Press",
    focus: "Overhead Press · Shoulder & Core Accessory",
    color: "from-cyan-500/20 to-blue-500/10",
    exercises: [
      { id: "pr1", name: "Barbell Overhead Press", sets: 3, reps: "5", targetMuscle: "Shoulders", notes: "5/3/1 main lift — strict press, full lockout overhead" },
      { id: "pr2", name: "Arnold Press", sets: 3, reps: "8-10", targetMuscle: "Full Delts", notes: "Full rotation from neutral to pronated at top" },
      { id: "pr3", name: "Dumbbell Lateral Raises", sets: 4, reps: "12-15", targetMuscle: "Side Delts", notes: "Rest 60s between sets" },
      { id: "pr4", name: "Dumbbell Front Raises", sets: 3, reps: "10-12", targetMuscle: "Front Delts" },
      { id: "pr5", name: "Face Pulls", sets: 3, reps: "12-15", targetMuscle: "Rear Delts/Rotator Cuff" },
      { id: "pr6", name: "Upright Row", sets: 3, reps: "10-12", targetMuscle: "Traps/Side Delts", notes: "Wide grip, pull to chin height" },
    ],
  },
  // ── Arnold Split ──────────────────────────────────────────────────────────
  {
    id: "chest_back",
    name: "Chest & Back",
    icon: Layers,
    day: "Chest & Back",
    focus: "Chest · Back · Antagonist Superset",
    color: "from-orange-500/20 to-amber-500/10",
    exercises: [
      { id: "cb1", name: "Flat Barbell Bench Press", sets: 4, reps: "8-10", targetMuscle: "Chest" },
      { id: "cb2", name: "Barbell Row", sets: 4, reps: "8-10", targetMuscle: "Mid Back", notes: "Superset with bench press — minimal rest between" },
      { id: "cb3", name: "Incline Dumbbell Press", sets: 3, reps: "8-10", targetMuscle: "Upper Chest" },
      { id: "cb4", name: "Lat Pull Down - Pronated Grip", sets: 3, reps: "8-10", targetMuscle: "Lats" },
      { id: "cb5", name: "Cable Fly", sets: 3, reps: "12-15", targetMuscle: "Chest", notes: "Full chest stretch at bottom" },
      { id: "cb6", name: "Seated Cable Row", sets: 3, reps: "12-15", targetMuscle: "Mid Back" },
    ],
  },
  {
    id: "shoulders_arms",
    name: "Shoulders & Arms",
    icon: Shield,
    day: "Shoulders & Arms",
    focus: "Delts · Biceps · Triceps",
    color: "from-purple-500/20 to-fuchsia-500/10",
    exercises: [
      { id: "sa1", name: "Arnold Press", sets: 4, reps: "8-10", targetMuscle: "Full Delts" },
      { id: "sa2", name: "Dumbbell Lateral Raises", sets: 3, reps: "12-15", targetMuscle: "Side Delts" },
      { id: "sa3", name: "Barbell Curl", sets: 3, reps: "8-10", targetMuscle: "Biceps", notes: "Full ROM — squeeze hard at top" },
      { id: "sa4", name: "Skull Crushers", sets: 3, reps: "8-10", targetMuscle: "Triceps" },
      { id: "sa5", name: "Dumbbell Preacher Hammer Curls", sets: 3, reps: "10-12", targetMuscle: "Biceps" },
      { id: "sa6", name: "Tricep Pushdown", sets: 3, reps: "12-15", targetMuscle: "Triceps" },
    ],
  },
  // ── Bro Split Days ────────────────────────────────────────────────────────
  {
    id: "chest",
    name: "Chest Day",
    icon: ArrowUp,
    day: "Chest",
    focus: "Chest · All Angles · Maximum Volume",
    color: "from-red-500/20 to-rose-500/10",
    exercises: [
      { id: "ch1", name: "Flat Barbell Bench Press", sets: 4, reps: "6-8", targetMuscle: "Chest", notes: "Heavy compound to start — touch chest, drive up" },
      { id: "ch2", name: "Incline Barbell Bench Press", sets: 3, reps: "8-10", targetMuscle: "Upper Chest" },
      { id: "ch3", name: "45° Incline Dumbbell Bench Press", sets: 3, reps: "8-10", targetMuscle: "Upper Chest" },
      { id: "ch4", name: "Flat Dumbbell Flies", sets: 3, reps: "10-12", targetMuscle: "Chest", notes: "Keep slight bend in elbow throughout" },
      { id: "ch5", name: "Cable Fly", sets: 3, reps: "12-15", targetMuscle: "Inner Chest", notes: "High to low — squeeze hard at the top" },
      { id: "ch6", name: "Weighted Dips", sets: 3, reps: "8-12", targetMuscle: "Lower Chest/Triceps", notes: "Lean forward slightly to bias chest" },
    ],
  },
  {
    id: "back",
    name: "Back Day",
    icon: ArrowDown,
    day: "Back",
    focus: "Lats · Mid Back · Thickness & Width",
    color: "from-blue-500/20 to-indigo-500/10",
    exercises: [
      { id: "bk1", name: "Conventional Deadlift", sets: 4, reps: "5", targetMuscle: "Full Back", notes: "Start with big compound — focus on brace and drive" },
      { id: "bk2", name: "Pull-Ups", sets: 4, reps: "6-10", targetMuscle: "Lats", notes: "Overhand grip, full hang at bottom, chin over bar at top", trackWeight: false, repLabel: "Reps" },
      { id: "bk3", name: "Barbell Row", sets: 3, reps: "8-10", targetMuscle: "Mid Back", notes: "Hinge 45°, pull to lower chest, control the negative" },
      { id: "bk4", name: "Seated Cable Row", sets: 3, reps: "10-12", targetMuscle: "Mid Back" },
      { id: "bk5", name: "Single Arm Dumbbell Row", sets: 3, reps: "10-12 each", targetMuscle: "Lats/Mid Back" },
      { id: "bk6", name: "Face Pulls", sets: 3, reps: "15-20", targetMuscle: "Rear Delts", notes: "Shoulder health — never skip this" },
    ],
  },
  {
    id: "shoulders",
    name: "Shoulders Day",
    icon: Zap,
    day: "Shoulders",
    focus: "All 3 Heads · Traps · Rear Delts",
    color: "from-cyan-500/20 to-sky-500/10",
    exercises: [
      { id: "sh1", name: "Barbell Overhead Press", sets: 4, reps: "6-8", targetMuscle: "Front Delts/Overall", notes: "Strict press — no leg drive" },
      { id: "sh2", name: "Arnold Press", sets: 3, reps: "8-10", targetMuscle: "Full Delts" },
      { id: "sh3", name: "Dumbbell Lateral Raises", sets: 4, reps: "12-15", targetMuscle: "Side Delts", notes: "Volume key for wide shoulders" },
      { id: "sh4", name: "Dumbbell Front Raises", sets: 3, reps: "10-12", targetMuscle: "Front Delts" },
      { id: "sh5", name: "Single Arm Cross Body Reverse Fly", sets: 3, reps: "12-15", targetMuscle: "Rear Delts" },
      { id: "sh6", name: "Barbell Shrugs", sets: 3, reps: "10-12", targetMuscle: "Traps", notes: "Hold at top for 1s, avoid rolling" },
    ],
  },
  {
    id: "arms",
    name: "Arms Day",
    icon: Flame,
    day: "Arms",
    focus: "Biceps · Triceps · Maximum Pump",
    color: "from-fuchsia-500/20 to-pink-500/10",
    exercises: [
      { id: "am1", name: "Barbell Curl", sets: 4, reps: "8-10", targetMuscle: "Biceps", notes: "Full supination at top, slow eccentric" },
      { id: "am2", name: "Skull Crushers", sets: 4, reps: "8-10", targetMuscle: "Triceps", notes: "Lower to forehead, lock out at top" },
      { id: "am3", name: "Incline Dumbbell Curl", sets: 3, reps: "10-12", targetMuscle: "Biceps", notes: "Full stretch at bottom — great for long head" },
      { id: "am4", name: "Overhead Tricep Extension", sets: 3, reps: "10-12", targetMuscle: "Triceps", notes: "Long head stretch — single dumbbell overhead, lower behind head" },
      { id: "am5", name: "Dumbbell Preacher Hammer Curls", sets: 3, reps: "10-12", targetMuscle: "Brachialis", notes: "Neutral grip, controlled negative" },
      { id: "am6", name: "Tricep Pushdown", sets: 3, reps: "12-15", targetMuscle: "Triceps", notes: "Full extension, squeeze at the bottom" },
    ],
  },
];

export function getTodaySchedule() {
  const dayIndex = new Date().getDay(); // 0=Sun
  return { day: WEEK_DAYS[dayIndex], label: "Open", type: "open" as const };
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Local storage helpers for workout history
const HISTORY_KEY = "ironkeeper_history";
const STREAK_KEY = "ironkeeper_streak";

export function getWorkoutHistory(): CompletedWorkout[] {
  const data = localStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveWorkout(workout: CompletedWorkout) {
  const history = getWorkoutHistory();
  history.unshift(workout);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  updateStreak();
}

export function getStreak(): number {
  const data = localStorage.getItem(STREAK_KEY);
  return data ? JSON.parse(data) : 0;
}

function updateStreak() {
  const history = getWorkoutHistory();
  if (history.length === 0) {
    localStorage.setItem(STREAK_KEY, "0");
    return;
  }

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];

    const hasWorkout = history.some(w => w.date.startsWith(dateStr));
    if (hasWorkout) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

export function getWeeklyStats() {
  const history = getWorkoutHistory();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const thisWeek = history.filter(w => new Date(w.date) >= weekStart);

  return {
    workoutsThisWeek: thisWeek.length,
    totalWorkouts: history.length,
    totalMinutes: history.reduce((sum, w) => sum + w.duration, 0),
    weekTarget: 4,
  };
}

// Haptic feedback utility
export function triggerHaptic(style: "light" | "medium" | "heavy" = "medium") {
  if ("vibrate" in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[style]);
  }
}
