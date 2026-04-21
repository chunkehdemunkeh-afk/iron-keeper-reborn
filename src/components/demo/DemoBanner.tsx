import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isDemoMode, exitDemo } from "@/lib/demo-mode";
import { resetDemoStore } from "@/lib/demo-data";

export default function DemoBanner() {
  const navigate = useNavigate();

  if (!isDemoMode()) return null;

  const handleExit = () => {
    exitDemo();
    resetDemoStore();
    // Hard reload so all in-memory state and React Query caches are cleared
    window.location.href = "/login";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="sticky top-0 z-[100] w-full"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div
          className="mx-auto max-w-lg flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-medium"
          style={{
            background: "linear-gradient(90deg, hsl(36 95% 55% / 0.15), hsl(36 95% 55% / 0.05))",
            borderBottom: "1px solid hsl(36 95% 55% / 0.25)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-foreground/90 truncate">
              <span className="font-bold text-primary">Demo Mode</span>
              <span className="text-muted-foreground"> · exploring with sample data</span>
            </span>
          </div>
          <button
            onClick={handleExit}
            className="flex items-center gap-1 rounded-full bg-background/60 hover:bg-background px-2.5 py-1 text-foreground transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
            Exit demo
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
