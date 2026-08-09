import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Wand2,
  Plus,
  BookOpen,
  Footprints,
  Timer,
  History as HistoryIcon,
  Dumbbell,
} from "lucide-react";
import WeekStrip from "@/components/WeekStrip";
import NextSessionCard from "@/components/NextSessionCard";
import HelpButton from "@/components/demo/HelpButton";
import { SectionHeader, NavTile } from "@/components/ui/section";
import { useAuth } from "@/hooks/useAuth";
import { getUserPreferences, isNoWorkoutMode } from "@/lib/user-preferences";

/**
 * Train hub — one place for everything training related.
 * Nothing new is built here: it links to the existing pages so they stop
 * being scattered across the app.
 */
export default function Train() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const noWorkoutMode = user ? isNoWorkoutMode(user.id) : false;
  const splitName = user ? getUserPreferences(user.id)?.splitName : null;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl font-bold"
            >
              Train
            </motion.h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {splitName ? `${splitName} · your plan and tools` : "Your plan and training tools"}
            </p>
          </div>
          <HelpButton />
        </div>

        <div>
          <SectionHeader title="This week" />
          <WeekStrip />
        </div>

        {!noWorkoutMode && (
          <div>
            <SectionHeader title="Up next" />
            <NextSessionCard />
          </div>
        )}

        <div>
          <SectionHeader title="Your programme" />
          <div className="space-y-2">
            <NavTile
              index={0}
              accent
              icon={CalendarDays}
              label="All sessions"
              description="Every workout in your split"
              onClick={() => navigate("/sessions")}
            />
            <NavTile
              index={1}
              icon={Wand2}
              label="Customize programme"
              description="Swap exercises, edit sets and reps"
              onClick={() => navigate("/programme/edit")}
            />
            <NavTile
              index={2}
              icon={Plus}
              label="Create a workout"
              description="Build your own session"
              onClick={() => navigate("/builder")}
            />
            <NavTile
              index={3}
              icon={Dumbbell}
              label="Change split"
              description="Pick a different training split"
              onClick={() => navigate("/onboarding?from=train")}
            />
          </div>
        </div>

        <div>
          <SectionHeader title="Conditioning & events" />
          <div className="space-y-2">
            <NavTile
              index={0}
              icon={Footprints}
              label="Half marathon plan"
              description="8-week plan · 4 runs/week · pace PBs"
              onClick={() => navigate("/half-marathon")}
            />
            <NavTile
              index={1}
              icon={Timer}
              label="Run benchmarks"
              description="Times, splits and pace projections"
              onClick={() => navigate("/run")}
            />
            <NavTile
              index={2}
              icon={Timer}
              label="Hyrox benchmarks"
              description="Station targets and goal tracking"
              onClick={() => navigate("/hyrox")}
            />
          </div>
        </div>

        <div>
          <SectionHeader title="Reference" />
          <div className="space-y-2">
            <NavTile
              index={0}
              icon={BookOpen}
              label="Exercise library"
              description="Search every movement"
              onClick={() => navigate("/exercises")}
            />
            <NavTile
              index={1}
              icon={HistoryIcon}
              label="Session history"
              description="Past workouts and CSV export"
              onClick={() => navigate("/history")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
