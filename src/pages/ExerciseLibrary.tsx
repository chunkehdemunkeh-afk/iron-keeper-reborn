import { useState } from "react";
import { EXERCISE_LIBRARY, MUSCLE_GROUPS_ALL } from "@/lib/exercise-library";
import { Search, Dumbbell, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";

export default function ExerciseLibrary() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("All");

  const filtered = EXERCISE_LIBRARY.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.description.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = selectedGroup === "All" || ex.muscleGroup === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-4xl px-4 pt-6 pb-24 space-y-4">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-2xl font-bold"
        >
          Exercise Library
        </motion.h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full h-10 rounded-xl bg-card border border-border/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        {/* Muscle group filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {MUSCLE_GROUPS_ALL.map(group => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedGroup === group
                  ? "gradient-primary text-primary-foreground glow-primary"
                  : "bg-card border border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {filtered.length} exercise{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Exercise list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <AnimatePresence>
            {filtered.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="glass-card rounded-xl p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Dumbbell className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{ex.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ex.description}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {ex.muscleGroup}
                      </span>
                      <span className="rounded-md bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {ex.equipment}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <EmptyState
              icon={Filter}
              title="No exercises match"
              description="Try a different muscle group or search term."
            />
          )}
        </div>
      </div>
    </div>
  );
}
