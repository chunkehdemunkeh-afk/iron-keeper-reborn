import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Apple, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TDEESetup from "@/components/food/TDEESetup";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/storage-keys";

export default function NutritionOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);

  const finish = () => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.nutritionOnboarding(user.id), "complete");
      localStorage.setItem(STORAGE_KEYS.onboardingTip(user.id), "pending");
    }
    navigate("/", { replace: true });
  };

  const handleSkip = () => {
    toast.success("You can set nutrition goals later from the Nutrition tab");
    finish();
  };

  if (showSetup) {
    return <TDEESetup onComplete={finish} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar with single dot to match flow continuity */}
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <div className="w-10" />
        <div className="flex gap-1.5">
          <div className="h-1.5 w-6 rounded-full bg-primary" />
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-4 pt-4 pb-2 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary glow-primary mb-5">
            <Apple className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Now let's set your nutrition goals
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Personalised calorie and macro targets power the food tracker, daily summary, and macro rings.
            We use the Mifflin–St Jeor formula based on your age, height, weight, and activity level.
          </p>

          <div className="glass-card rounded-2xl p-4 mt-6 space-y-2">
            <div className="flex gap-3 items-start">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Daily calorie target</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Protein, carbs & fat goals</p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p className="text-sm text-foreground">Daily water target</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pb-10 pt-4 space-y-2">
        <button
          onClick={() => setShowSetup(true)}
          className="w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary active:scale-[0.98] flex items-center justify-center gap-2 transition-transform"
        >
          Set up nutrition goals <ChevronRight className="h-5 w-5" />
        </button>
        <button
          onClick={handleSkip}
          className="w-full rounded-2xl py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
