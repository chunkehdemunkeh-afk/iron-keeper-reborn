import { useEffect, useState } from "react";
import { getGreeting } from "@/lib/workout-data";
import { useAuth } from "@/hooks/useAuth";
import WeekStrip from "@/components/WeekStrip";
import NextSessionCard from "@/components/NextSessionCard";
import StatsBar from "@/components/StatsBar";
import DailyStretchCard from "@/components/DailyStretchCard";
import HomeDailySummary from "@/components/HomeDailySummary";
import HomeWeightTracker from "@/components/HomeWeightTracker";
import HomeCompleteDay from "@/components/HomeCompleteDay";
import { isGKSplit, isNoWorkoutMode } from "@/lib/user-preferences";
import PostOnboardingTip from "@/components/PostOnboardingTip";
import { format, subDays, addDays, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import HelpButton from "@/components/demo/HelpButton";

const Index = () => {
  const { profile, user } = useAuth();
  const displayName = profile?.display_name?.split(" ")[0] || "Athlete";
  const gkMode = user ? isGKSplit(user.id) : false;
  const noWorkoutMode = user ? isNoWorkoutMode(user.id) : false;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slideDir, setSlideDir] = useState(0); // -1 left, 1 right

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const isCurrentDay = isToday(selectedDate);
  const minDate = subDays(new Date(), 6);
  const canGoBack = selectedDate > minDate;
  const canGoForward = !isCurrentDay;

  const goBack = () => {
    if (!canGoBack) return;
    setSlideDir(-1);
    setSelectedDate((d) => subDays(d, 1));
  };

  const goForward = () => {
    if (!canGoForward) return;
    setSlideDir(1);
    setSelectedDate((d) => addDays(d, 1));
  };

  // Remind GK users to do daily stretches if not yet completed
  useEffect(() => {
    if (!user || !gkMode) return;
    const todayStr = new Date().toISOString().split("T")[0];
    const reminderKey = `stretch-reminder-shown-${todayStr}`;
    if (sessionStorage.getItem(reminderKey)) return;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("stretch_completions")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .maybeSingle();
      if (!data) {
        sessionStorage.setItem(reminderKey, "1");
        toast("Don't forget your daily stretches! 🧘", {
          description: "10 minutes to keep your body match-ready.",
          duration: 6000,
        });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [user, gkMode]);

  const headerDate = selectedDate.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const shortDateLabel = isCurrentDay
    ? "Today"
    : format(selectedDate, "EEE, d MMM");

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-2"
        >
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold">
              {getGreeting()}, <span className="text-gradient-primary">{displayName}!</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">{headerDate}</p>
          </div>
          <HelpButton />
        </motion.div>

        {/* Stats */}
        <StatsBar />

        {/* Week strip */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            This Week
          </p>
          <WeekStrip />
        </div>

        {/* Next session — only show on today and when user has a workout plan */}
        {isCurrentDay && !noWorkoutMode && <NextSessionCard />}

        {/* Date navigation for daily cards */}
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-foreground">{shortDateLabel}</p>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Date-aware cards with slide animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={dateStr}
            initial={{ x: slideDir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDir * -60, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="space-y-5"
          >
            {/* Daily nutrition & water summary */}
            <HomeDailySummary date={dateStr} />

            {/* Body weight tracker */}
            <HomeWeightTracker date={dateStr} />

            {/* Complete Day */}
            <HomeCompleteDay date={dateStr} />
          </motion.div>
        </AnimatePresence>

        {/* Pre-workout stretches — only show on today and when user has a workout plan */}
        {isCurrentDay && !noWorkoutMode && <DailyStretchCard />}
      </div>

      {/* One-time post-onboarding tip drawer */}
      <PostOnboardingTip />
    </div>
  );
};

export default Index;
