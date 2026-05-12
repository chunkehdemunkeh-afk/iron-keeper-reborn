import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useDailyBiometrics } from "@/hooks/queries/useDailyBiometrics";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X } from "lucide-react";
import BiometricCheckIn from "./BiometricCheckIn";

function isDismissed(date: string): boolean {
  return !!localStorage.getItem(STORAGE_KEYS.checkInDismissed(date));
}

function dismiss(date: string) {
  localStorage.setItem(STORAGE_KEYS.checkInDismissed(date), "1");
}

function isMorning(): boolean {
  const h = new Date().getHours();
  return h >= 5 && h < 13; // show 5am–1pm
}

export default function MorningCheckInPrompt() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [show, setShow] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);

  const { data: biometrics = [] } = useDailyBiometrics(1);

  const hasTodayData = biometrics.some(b => b.date === today);

  useEffect(() => {
    if (!user || hasTodayData) return;
    if (isDismissed(today) || !isMorning()) return;
    const t = setTimeout(() => setShow(true), 1800);
    return () => clearTimeout(t);
  }, [user, hasTodayData, today]);

  function handleDismiss() {
    dismiss(today);
    setShow(false);
  }

  function handleOpen() {
    setCheckInOpen(true);
    setShow(false);
  }

  if (!user) return null;

  return (
    <>
      <AnimatePresence>
        {show && !checkInOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-5 w-full max-w-sm shadow-2xl relative"
            >
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 mb-3">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Good morning — 30-second check-in?
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Log your Samsung Health metrics to get your recovery score, strain target, and AI coaching for today.
              </p>
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={handleOpen}
                  className="rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold"
                >
                  Start check-in
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-xl bg-muted/50 text-muted-foreground py-2.5 text-sm font-medium"
                >
                  Skip today
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BiometricCheckIn
        open={checkInOpen}
        date={today}
        onClose={() => setCheckInOpen(false)}
      />
    </>
  );
}
