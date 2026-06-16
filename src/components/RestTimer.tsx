import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, X, RotateCcw } from "lucide-react";
import { hapticHeavy, hapticSuccess } from "@/lib/haptics";
import { toast } from "@/hooks/use-toast";

interface RestTimerProps {
  isActive: boolean;
  initialSeconds: number;
  reason?: string;
  onClose: () => void;
  onTimerEnd: () => void;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.2, 0.4].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.12);
    });
  } catch {
    // Audio not supported
  }
}

export default function RestTimer({ isActive, initialSeconds, reason, onClose, onTimerEnd }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [paused, setPaused] = useState(false);
  const hasEndedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onTimerEndRef = useRef(onTimerEnd);
  // Track the target end time so background/sleep doesn't break the countdown
  const endTimeRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number>(0);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onTimerEndRef.current = onTimerEnd; }, [onTimerEnd]);

  // Reset when timer activates
  useEffect(() => {
    if (isActive) {
      const now = Date.now();
      endTimeRef.current = now + initialSeconds * 1000;
      setRemaining(initialSeconds);
      setPaused(false);
      hasEndedRef.current = false;
    }
  }, [isActive, initialSeconds]);

  // Handle pause/resume by adjusting endTime
  const togglePause = useCallback(() => {
    setPaused((prev) => {
      if (!prev) {
        // Pausing: store how much time is left
        pausedRemainingRef.current = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      } else {
        // Resuming: set new end time from stored remaining
        endTimeRef.current = Date.now() + pausedRemainingRef.current * 1000;
      }
      return !prev;
    });
  }, []);

  // Countdown using wall-clock time — survives backgrounding
  const isDone = remaining <= 0;

  useEffect(() => {
    if (!isActive || paused || isDone) return;
    const tick = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000));
      setRemaining(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    // Also tick on visibility change (returning from background)
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isActive, paused, isDone]);

  // Timer ended — beep, haptic, notify, auto-dismiss
  useEffect(() => {
    if (remaining === 0 && isActive && !hasEndedRef.current) {
      hasEndedRef.current = true;
      playBeep();
      hapticHeavy();
      onTimerEndRef.current();

      const timeout = setTimeout(() => {
        hapticSuccess();
        toast({
          title: "⏱️ Rest over!",
          description: "Time to start your next set 💪",
        });
        onCloseRef.current();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [remaining, isActive]);

  const progress = remaining / initialSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const circumference = 2 * Math.PI * 44;

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed inset-x-0 bottom-[4.5rem] z-50 flex justify-center px-4"
      >
        <div className="glass-card-elevated rounded-2xl p-4 w-full max-w-sm border border-border/50 shadow-xl">
          <div className="flex items-center gap-4">
            {/* Circular progress */}
            <div className="relative flex-shrink-0">
              <svg width="64" height="64" viewBox="0 0 96 96" className="-rotate-90">
                <circle cx="48" cy="48" r="44" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                <circle
                  cx="48" cy="48" r="44" fill="none"
                  stroke={remaining === 0 ? "hsl(var(--success))" : "hsl(var(--primary))"}
                  strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                  className="transition-all duration-300 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-base font-bold tabular-nums text-foreground">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Label */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {remaining === 0 ? "Rest Complete!" : "Rest Timer"}
              </p>
              <p className="text-xs text-muted-foreground">
                {remaining === 0 ? "Ready for next set" : (reason || "Recover before your next set")}
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-1.5">
              {remaining > 0 && (
                <button
                  onClick={togglePause}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                </button>
              )}
              {remaining === 0 && (
                <button
                  onClick={() => {
                    endTimeRef.current = Date.now() + initialSeconds * 1000;
                    setRemaining(initialSeconds);
                    hasEndedRef.current = false;
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
