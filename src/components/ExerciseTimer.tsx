import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";

interface ExerciseTimerProps {
  targetSeconds: number;
  onComplete: (seconds: number) => void;
}

export default function ExerciseTimer({ targetSeconds, onComplete }: ExerciseTimerProps) {
  const [seconds, setSeconds] = useState(targetSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const hasCompleted = useRef(false);
  const endTimeRef = useRef<number>(0);
  const pausedRemainingRef = useRef<number>(targetSeconds);

  // Countdown using wall-clock time — survives backgrounding
  useEffect(() => {
    if (!running || done) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setSeconds(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [running, done]);

  useEffect(() => {
    if (seconds === 0 && !hasCompleted.current) {
      hasCompleted.current = true;
      setRunning(false);
      setDone(true);
      hapticSuccess();
      onComplete(targetSeconds);
    }
  }, [seconds, targetSeconds, onComplete]);

  const reset = useCallback(() => {
    setSeconds(targetSeconds);
    setRunning(false);
    setDone(false);
    hasCompleted.current = false;
    pausedRemainingRef.current = targetSeconds;
  }, [targetSeconds]);

  const toggle = useCallback(() => {
    if (done) return;
    hapticMedium();
    setRunning((prev) => {
      if (!prev) {
        // Starting or resuming: set end time from stored remaining
        endTimeRef.current = Date.now() + pausedRemainingRef.current * 1000;
      } else {
        // Pausing: store how much time is left
        pausedRemainingRef.current = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      }
      return !prev;
    });
  }, [done]);

  // Keep pausedRemainingRef in sync for initial state
  useEffect(() => {
    if (!running && !done) {
      pausedRemainingRef.current = seconds;
    }
  }, [seconds, running, done]);

  const progress = 1 - seconds / targetSeconds;

  return (
    <div className="flex items-center gap-1.5">
      {/* Mini progress ring + time */}
      <div className="relative flex items-center justify-center h-9 w-9 flex-shrink-0">
        <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke={done ? "hsl(var(--success))" : "hsl(var(--primary))"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 15}
            strokeDashoffset={2 * Math.PI * 15 * (1 - progress)}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute text-[9px] font-bold tabular-nums text-foreground">
          {seconds}s
        </span>
      </div>

      {/* Play/Pause */}
      <button
        onClick={toggle}
        disabled={done}
        className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all ${
          done
            ? "bg-success/20 text-success"
            : running
            ? "bg-primary/20 text-primary"
            : "bg-muted/50 text-muted-foreground border border-border/50 hover:text-foreground"
        }`}
      >
        {done ? (
          "Done ✓"
        ) : running ? (
          <><Pause className="h-3 w-3" /> Pause</>
        ) : (
          <><Play className="h-3 w-3" /> {seconds === targetSeconds ? "Start" : "Resume"}</>
        )}
      </button>

      {/* Reset */}
      {(done || seconds < targetSeconds) && (
        <button
          onClick={reset}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground hover:text-foreground transition-colors border border-border/50"
        >
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
