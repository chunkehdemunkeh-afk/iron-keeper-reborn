import { useState, useCallback, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { getLatestChangelog, hasSeenVersion, markVersionSeen } from "@/lib/changelog";
import Index from "./pages/Index";
import Sessions from "./pages/Sessions";
import WorkoutSession from "./pages/WorkoutSession";
import WorkoutBuilder from "./pages/WorkoutBuilder";
import History from "./pages/History";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import BodyMeasurements from "./pages/BodyMeasurements";
import CoachDashboard from "./pages/CoachDashboard";
import FoodTracker from "./pages/FoodTracker";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import ResetPassword from "./pages/ResetPassword";
import { isOnboardingComplete } from "@/lib/user-preferences";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
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
        <Route path="/" element={<PageWrapper><ProtectedRoute><RoleBasedHome /></ProtectedRoute></PageWrapper>} />
        <Route path="/coach" element={<PageWrapper><ProtectedRoute><CoachDashboard /></ProtectedRoute></PageWrapper>} />
        <Route path="/sessions" element={<PageWrapper><ProtectedRoute><Sessions /></ProtectedRoute></PageWrapper>} />
        <Route path="/workout/:id" element={<PageWrapper><ProtectedRoute><WorkoutSession /></ProtectedRoute></PageWrapper>} />
        <Route path="/builder" element={<PageWrapper><ProtectedRoute><WorkoutBuilder /></ProtectedRoute></PageWrapper>} />
        <Route path="/nutrition" element={<PageWrapper><ProtectedRoute><FoodTracker /></ProtectedRoute></PageWrapper>} />
        <Route path="/history" element={<PageWrapper><ProtectedRoute><History /></ProtectedRoute></PageWrapper>} />
        <Route path="/progress" element={<PageWrapper><ProtectedRoute><Progress /></ProtectedRoute></PageWrapper>} />
        <Route path="/profile" element={<PageWrapper><ProtectedRoute><Profile /></ProtectedRoute></PageWrapper>} />
        <Route path="/exercises" element={<PageWrapper><ProtectedRoute><ExerciseLibrary /></ProtectedRoute></PageWrapper>} />
        <Route path="/body" element={<PageWrapper><ProtectedRoute><BodyMeasurements /></ProtectedRoute></PageWrapper>} />
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
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
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
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <AnimatedRoutes />
      {user && <BottomNav />}
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

  // Show "What's New" after an update reload OR if changelog is unseen
  useEffect(() => {
    if (!splashDone) return;
    const justUpdated = localStorage.getItem("ik-just-updated") === "1";
    if (justUpdated) {
      localStorage.removeItem("ik-just-updated");
      const latest = getLatestChangelog();
      if (latest) {
        markVersionSeen(latest.version);
        const timer = setTimeout(() => setShowWhatsNew(true), 800);
        return () => clearTimeout(timer);
      }
    } else {
      const latest = getLatestChangelog();
      if (latest && !hasSeenVersion(latest.version)) {
        const timer = setTimeout(() => setShowWhatsNew(true), 800);
        return () => clearTimeout(timer);
      }
    }
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
