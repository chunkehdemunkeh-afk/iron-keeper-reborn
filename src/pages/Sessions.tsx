import { WORKOUTS } from "@/lib/workout-data";
import { getAllCustomWorkouts } from "@/pages/WorkoutBuilder";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown, Plus, Dumbbell, Zap, Wind, Shield, Crosshair, ArrowUp, ArrowDown, Footprints, Layers, Flame, Trophy, Activity, Target, History, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences } from "@/lib/user-preferences";
import type { LucideIcon } from "lucide-react";
import HelpButton from "@/components/demo/HelpButton";

type ProgrammePoint = { icon: LucideIcon; title: string; desc: string };

const PROGRAMME_INFO: Record<string, { title: string; points: ProgrammePoint[] }> = {
  gk: {
    title: "Goalkeeper Programme",
    points: [
      { icon: Shield,    title: "Goalkeeper-First",    desc: "Every exercise directly improves diving, jumping, catching, and throwing — the core skills of a goalkeeper." },
      { icon: Zap,       title: "Explosive Power",     desc: "Box jumps, depth jumps, and plyometrics to develop the fast-twitch muscles needed for shot-stopping." },
      { icon: Wind,      title: "Agility & Reaction",  desc: "Lateral drills, T-drills, and reaction work to sharpen footwork and reflexes in the goal." },
      { icon: Crosshair, title: "Injury Prevention",   desc: "Nordic curls, Copenhagen adductors, and dead bugs to bulletproof knees, groin, and core." },
    ],
  },
  ppl: {
    title: "Push / Pull / Legs",
    points: [
      { icon: ArrowUp,   title: "Train to Failure",    desc: "Every working set pushed to 0–1 RIR. Maximal mechanical tension drives the most muscle growth." },
      { icon: ArrowDown, title: "Frequency First",     desc: "Run once for 3 days or twice a week for 6. Hitting each muscle 2× weekly outperforms once-a-week splits." },
      { icon: Footprints,title: "Balanced Development",desc: "No muscle left behind — pressing, rowing, and leg work all hit twice per week in a single rotation." },
      { icon: Flame,     title: "Progressive Overload", desc: "Log every session and add weight or reps each week. That's the entire game." },
    ],
  },
  upper_lower: {
    title: "Upper / Lower",
    points: [
      { icon: ArrowUp,   title: "Twice a Week",        desc: "Upper and lower body each trained twice. Optimal balance of frequency, volume, and recovery." },
      { icon: ArrowDown, title: "Strength Foundation", desc: "Built around compound movements: bench, row, squat, Romanian deadlift. Add isolation work on top." },
      { icon: Shield,    title: "Injury Resilience",   desc: "Lower frequency per session means better form, heavier weights, and lower injury risk." },
      { icon: Zap,       title: "Flexible Rest Days",  desc: "Works with any 4-day schedule. Train Mon/Tue/Thu/Fri or any split that fits your week." },
    ],
  },
  pplu: {
    title: "Push / Pull / Legs / Upper",
    points: [
      { icon: ArrowUp,   title: "Upper Body Priority", desc: "An extra upper day on top of PPL gives more frequency on chest, back, and shoulders." },
      { icon: ArrowDown, title: "High Intensity",      desc: "Train at RIR 0–2. Push close to failure every set for maximum stimulus." },
      { icon: Footprints,title: "Leg Volume Managed",  desc: "Legs get one dedicated session — plenty of volume without overtraining the hardest muscle group." },
      { icon: Flame,     title: "4-Day Sweet Spot",    desc: "Four days hits the optimal frequency:recovery ratio for most intermediate lifters." },
    ],
  },
  pplul: {
    title: "Push / Pull / Legs / Upper / Lower",
    points: [
      { icon: Zap,       title: "Maximum Frequency",   desc: "5 days, every muscle group hit 2×/week. The highest stimulus you can sustain without overreaching." },
      { icon: ArrowUp,   title: "Train to Failure",    desc: "0–1 RIR on all working sets. High intensity meets high frequency." },
      { icon: Shield,    title: "Structured Recovery", desc: "Alternating push/pull/legs/upper/lower means no two back-to-back sessions hammer the same muscles." },
      { icon: Flame,     title: "Advanced Athletes",   desc: "Best suited to lifters with 2+ years of consistent training who can manage 5 sessions a week." },
    ],
  },
  fullbody: {
    title: "Full Body",
    points: [
      { icon: Target,    title: "Whole Body Each Time",desc: "Train every major muscle group every session. Maximum frequency, minimum sessions." },
      { icon: Shield,    title: "Great for Beginners", desc: "Allows the nervous system to practice every movement pattern more often, speeding up skill acquisition." },
      { icon: Zap,       title: "Busy Schedule",       desc: "2–3 sessions a week is all it takes. Fits around work, family, and everything else in your life." },
      { icon: Flame,     title: "Compound-Led",        desc: "Squat, hinge, push, pull — big movements first. Isolation work added to taste." },
    ],
  },
  arnold: {
    title: "Arnold Split",
    points: [
      { icon: Layers,    title: "Chest & Back Together", desc: "Pairing antagonist muscles in one session allows more volume through natural supersets." },
      { icon: ArrowUp,   title: "Shoulders & Arms",   desc: "Dedicated arm day maximises pump and volume on smaller muscle groups that get left behind in PPL." },
      { icon: Footprints,title: "Legs Complete It",   desc: "Quad, hamstring, and calf volume rounded out on leg day. Classic bodybuilding structure." },
      { icon: Flame,     title: "6-Day High Volume",  desc: "Run the 3-day rotation twice per week for maximum bodybuilder-style volume. Arnold's original method." },
    ],
  },
  bro: {
    title: "Bro Split",
    points: [
      { icon: ArrowUp,   title: "One Muscle, Max Volume", desc: "Dedicate an entire session to one muscle. 15–25 sets in a single workout for maximum pump and soreness." },
      { icon: Flame,     title: "Slow Eccentrics",    desc: "Control the negative — 3–4 seconds down. More time under tension = more growth." },
      { icon: Shield,    title: "Full Recovery",      desc: "6 days between sessions on the same muscle. Hit it hard and let it fully recover before the next round." },
      { icon: Zap,       title: "Old-School Proven",  desc: "The split that built the physiques of the 70s and 80s greats. Volume and isolation work." },
    ],
  },
  "531": {
    title: "5/3/1 Strength",
    points: [
      { icon: Trophy,    title: "AMRAP is Everything", desc: "Your last set each week is all-out. These reps are your progress marker and training max calculator." },
      { icon: Activity,  title: "Training Max",        desc: "Start at 90% of your actual 1RM. Progresses slowly but consistently — the safest way to add strength." },
      { icon: Dumbbell,  title: "The Big 4",           desc: "Squat, bench, deadlift, and overhead press. Everything else is accessory work. Simple and effective." },
      { icon: Flame,     title: "Long-Term Thinking",  desc: "5/3/1 is built for a decade, not a month. Slow progress that actually sticks." },
    ],
  },
  custom: {
    title: "Custom Split",
    points: [
      { icon: Zap,       title: "Built by You",        desc: "You chose the exercises, the order, and the days. This programme is entirely yours." },
      { icon: Shield,    title: "Flexible",             desc: "Change any day at any time via the workout builder. Adapt as your goals evolve." },
      { icon: Flame,     title: "Track Everything",    desc: "All your sets, reps, and weights are logged just like any preset programme." },
      { icon: Target,    title: "No Rules",             desc: "Train for strength, size, endurance, or all three. Your stats, your way." },
    ],
  },
};

const DEFAULT_PROGRAMME: { title: string; points: ProgrammePoint[] } = {
  title: "Your Programme",
  points: [
    { icon: Zap,    title: "Train Hard",       desc: "Every session logged brings you one step closer to your goal." },
    { icon: Flame,  title: "Stay Consistent",  desc: "Consistency beats intensity over the long run. Show up." },
    { icon: Shield, title: "Recover Well",     desc: "Sleep, eat enough protein, and rest between sessions." },
    { icon: Target, title: "Track Progress",   desc: "Log your sets and weights to know when to add load." },
  ],
};

const SESSION_GROUPS = [
  { label: "Goalkeeper", ids: ["power", "agility", "strength", "reflexes", "plyo"] },
  { label: "Push / Pull / Legs", ids: ["push", "pull", "legs", "upper", "fullbody"] },
  { label: "Strength Days", ids: ["squat", "bench", "deadlift", "press"] },
  { label: "Arnold & Bro Split", ids: ["chest_back", "shoulders_arms", "chest", "back", "shoulders", "arms"] },
];

export default function Sessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefs = user ? getUserPreferences(user.id) : null;
  const customWorkouts = getAllCustomWorkouts();
  const allWorkouts = [...WORKOUTS, ...customWorkouts];

  const progInfo = prefs ? (PROGRAMME_INFO[prefs.splitId] ?? DEFAULT_PROGRAMME) : DEFAULT_PROGRAMME;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) =>
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });

  const groupedWorkouts = SESSION_GROUPS.map(group => ({
    ...group,
    workouts: allWorkouts.filter(w => group.ids.includes(w.id)),
  })).filter(g => g.workouts.length > 0);

  const ungroupedWorkouts = allWorkouts.filter(
    w => !SESSION_GROUPS.flatMap(g => g.ids).includes(w.id)
  );

  const renderCard = (workout: typeof allWorkouts[0], i: number) => {
    const Icon = workout.icon;
    const visibleExercises = workout.exercises.slice(0, 4);
    const overflow = workout.exercises.length - 4;
    return (
      <motion.button
        key={workout.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
        onClick={() => navigate(`/workout/${workout.id}`)}
        className={`w-full glass-card rounded-2xl p-4 text-left transition-all hover:ring-1 hover:ring-primary/30 active:scale-[0.98] bg-gradient-to-br ${workout.color}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/40 shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-semibold text-foreground leading-tight">
              {workout.name}
            </h3>
            <p className="text-[11px] text-muted-foreground">{workout.day}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-medium text-muted-foreground">
              {workout.exercises.length} ex
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-2.5 flex gap-1.5 flex-wrap">
          {visibleExercises.map((ex) => (
            <span
              key={ex.id}
              className="rounded-md bg-background/25 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
            >
              {ex.name}
            </span>
          ))}
          {overflow > 0 && (
            <span className="rounded-md bg-background/25 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{overflow} more
            </span>
          )}
        </div>
      </motion.button>
    );
  };

  let cardIndex = 0;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-3xl px-4 pt-6 pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-2xl font-bold"
          >
            All Sessions
          </motion.h1>
          <div className="flex items-center gap-1">
            <HelpButton />
            <button
              onClick={() => navigate("/history")}
              className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted/60 rounded-full px-3 py-1.5 hover:bg-muted transition-colors active:scale-95"
              title="View past sessions"
            >
              <History className="h-3.5 w-3.5" /> History
            </button>
            <button
              onClick={() => navigate("/programme/edit")}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5 hover:bg-primary/20 transition-colors active:scale-95"
              title="Customize your programme"
            >
              <Wand2 className="h-3.5 w-3.5" /> Customize
            </button>
            <button
              onClick={() => navigate("/builder")}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5 hover:bg-primary/20 transition-colors active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> Create
            </button>
          </div>
        </div>

        {/* Half marathon training entry point */}
        <button
          onClick={() => navigate("/half-marathon")}
          className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 text-left bg-gradient-to-br from-emerald-500/20 to-teal-500/5 active:scale-[0.99] transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <Footprints className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-bold">Half Marathon Training</p>
            <p className="text-xs text-muted-foreground truncate">8-week plan · 4 runs/week · pace PBs</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>



        {groupedWorkouts.map((group) => {
          const isOpen = expandedGroups.has(group.label);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center gap-2 py-1 group"
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[10px] text-muted-foreground/60 mr-1">{group.workouts.length}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2.5">
                      {group.workouts.map((workout) => renderCard(workout, cardIndex++))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {ungroupedWorkouts.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Custom
              </span>
              <div className="flex-1 h-px bg-border/40" />
              <span className="text-[10px] text-muted-foreground/60">{ungroupedWorkouts.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {ungroupedWorkouts.map((workout) => renderCard(workout, cardIndex++))}
            </div>
          </div>
        )}


        {/* Programme info — dynamic per user's split */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            About This Programme
          </h2>
          {progInfo.points.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.title} className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <ItemIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
