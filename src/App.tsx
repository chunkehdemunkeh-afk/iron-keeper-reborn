import { useState, useCallback, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AnimatePresence, motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import UpdateBanner from "@/components/UpdateBanner";
import WhatsNewSheet from "@/components/WhatsNewSheet";
import DemoBanner from "@/components/demo/DemoBanner";
import { getLatestChangelog, hasSeenVersion, markVersionSeen } from "@/lib/changelog";
import Index from "./pages/Index";
import Sessions from "./pages/Sessions";
import WorkoutSession from "./pages/WorkoutSession";
import WorkoutBuilder from "./pages/WorkoutBuilder";
import ProgrammeEditor from "./pages/ProgrammeEditor";
import History from "./pages/History";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import BodyMeasurements from "./pages/BodyMeasurements";
import CoachDashboard from "./pages/CoachDashboard";
import CoachAthleteDetail from "./pages/CoachAthleteDetail";
import FoodTracker from "./pages/FoodTracker";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import NutritionOnboarding from "./pages/NutritionOnboarding";
import ResetPassword from "./pages/ResetPassword";
import Leaderboard from "./pages/Leaderboard";
import Recovery from "./pages/Recovery";
import CheckInHistory from "./pages/CheckInHistory";
import Quests from "./pages/Quests";
import Duels from "./pages/Duels";
import Shop from "./pages/Shop";
import Community from "./pages/Community";
import HyroxBenchmarks from "./pages/HyroxBenchmarks";
import Inbox from "./pages/Inbox";
import Conversation from "./pages/Conversation";
import LevelUpSheet from "@/components/gamification/LevelUpSheet";
import BadgeUnlockSheet from "@/components/gamification/BadgeUnlockSheet";
import SeasonFinaleSheet from "@/components/gamification/SeasonFinaleSheet";
import { isOnboardingComplete } from "@/lib/user-preferences";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorBoundary } from "@/components/ui/async-boundary";
import { ErrorState } from "@/components/ui/error-state";



function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState label="Loading session" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.2,
  ease: "easeOut" as const,
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageWrapper><LoginGuard /></PageWrapper>} />
        <Route path="/onboarding" element={<PageWrapper><ProtectedRoute><Onboarding /></ProtectedRoute></PageWrapper>} />
        <Route path="/onboarding/nutrition" element={<PageWrapper><ProtectedRoute><NutritionOnboarding /></ProtectedRoute></PageWrapper>} />
        <Route path="/" element={<PageWrapper><ProtectedRoute><RoleBasedHome /></ProtectedRoute></PageWrapper>} />
        <Route path="/coach" element={<PageWrapper><ProtectedRoute><CoachDashboard /></ProtectedRoute></PageWrapper>} />
        <Route path="/coach/athlete/:userId" element={<PageWrapper><ProtectedRoute><CoachAthleteDetail /></ProtectedRoute></PageWrapper>} />
        <Route path="/inbox" element={<PageWrapper><ProtectedRoute><Inbox /></ProtectedRoute></PageWrapper>} />
        <Route path="/inbox/:partnerId" element={<PageWrapper><ProtectedRoute><Conversation /></ProtectedRoute></PageWrapper>} />
        <Route path="/sessions" element={<PageWrapper><ProtectedRoute><Sessions /></ProtectedRoute></PageWrapper>} />
        <Route path="/workout/:id" element={<PageWrapper><ProtectedRoute><WorkoutSession /></ProtectedRoute></PageWrapper>} />
        <Route path="/builder" element={<PageWrapper><ProtectedRoute><WorkoutBuilder /></ProtectedRoute></PageWrapper>} />
        <Route path="/programme/edit" element={<PageWrapper><ProtectedRoute><ProgrammeEditor /></ProtectedRoute></PageWrapper>} />
        <Route path="/nutrition" element={<PageWrapper><ProtectedRoute><FoodTracker /></ProtectedRoute></PageWrapper>} />
        <Route path="/history" element={<PageWrapper><ProtectedRoute><History /></ProtectedRoute></PageWrapper>} />
        <Route path="/progress" element={<PageWrapper><ProtectedRoute><Progress /></ProtectedRoute></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><ProtectedRoute><Profile /></ProtectedRoute></PageWrapper>} />
        <Route path="/exercises" element={<PageWrapper><ProtectedRoute><ExerciseLibrary /></ProtectedRoute></PageWrapper>} />
        <Route path="/body" element={<PageWrapper><ProtectedRoute><BodyMeasurements /></ProtectedRoute></PageWrapper>} />
        <Route path="/leaderboard" element={<PageWrapper><ProtectedRoute><Leaderboard /></ProtectedRoute></PageWrapper>} />
        <Route path="/recovery" element={<PageWrapper><ProtectedRoute><Recovery /></ProtectedRoute></PageWrapper>} />
        <Route path="/check-ins" element={<PageWrapper><ProtectedRoute><CheckInHistory /></ProtectedRoute></PageWrapper>} />
        <Route path="/quests" element={<PageWrapper><ProtectedRoute><Quests /></ProtectedRoute></PageWrapper>} />
        <Route path="/duels" element={<PageWrapper><ProtectedRoute><Duels /></ProtectedRoute></PageWrapper>} />
        <Route path="/shop" element={<PageWrapper><ProtectedRoute><Shop /></ProtectedRoute></PageWrapper>} />
        <Route path="/community" element={<PageWrapper><ProtectedRoute><Community /></ProtectedRoute></PageWrapper>} />
        <Route path="/hyrox" element={<PageWrapper><ProtectedRoute><HyroxBenchmarks /></ProtectedRoute></PageWrapper>} />
        <Route path="/join/:code" element={<PageWrapper><JoinCoach /></PageWrapper>} />
        <Route path="/reset-password" element={<PageWrapper><ResetPassword /></PageWrapper>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

function RoleBasedHome() {
  const { isCoach, roleLoading } = useUserRole();
  const { user } = useAuth();
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState label="Loading" />
      </div>
    );
  }
  if (isCoach) return <Navigate to="/coach" replace />;
  if (user && !isOnboardingComplete(user.id)) return <Navigate to="/onboarding" replace />;
  return <Index />;
}

function LoginGuard() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState label="Starting Iron Warrior" />
      </div>
    );
  }

  return (
    <>
      <DemoBanner />
      <ErrorBoundary
        fallback={({ reset }) => (
          <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <ErrorState
              title="Something broke"
              description="The app hit an unexpected error. Try reloading this section."
              onRetry={reset}
            />
          </div>
        )}
      >
        <AnimatedRoutes />
      </ErrorBoundary>
      {user && <BottomNav />}
      {user && <LevelUpSheet />}
      {user && <BadgeUnlockSheet />}
      {user && <SeasonFinaleSheet />}
    </>
  );
};

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);

  // Listen for update-in-progress signal from main.tsx
  useEffect(() => {
    const handler = () => setUpdating(true);
    window.addEventListener("ik-updating", handler);
    return () => window.removeEventListener("ik-updating", handler);
  }, []);

  // Show "What's New" only when the latest changelog entry is genuinely unseen.
  // Previously, any update reload (ik-just-updated flag) would force the sheet
  // open even if the latest version had already been shown — causing the popup
  // to repeatedly display old changes after every background update poll.
  useEffect(() => {
    if (!splashDone) return;
    // Always clear the flag so it can't accumulate across reloads
    localStorage.removeItem(STORAGE_KEYS.justUpdated);
    const latest = getLatestChangelog();
    if (!latest) return;
    if (hasSeenVersion(latest.version)) return;
    const timer = setTimeout(() => setShowWhatsNew(true), 800);
    return () => clearTimeout(timer);
  }, [splashDone]);

  const latestEntry = getLatestChangelog();

  const handleCloseWhatsNew = () => {
    setShowWhatsNew(false);
    if (latestEntry) markVersionSeen(latestEntry.version);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <UpdateBanner visible={updating} />
        {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
        {latestEntry && (
          <WhatsNewSheet
            open={showWhatsNew}
            onClose={handleCloseWhatsNew}
            entry={latestEntry}
          />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
