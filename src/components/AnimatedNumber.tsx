import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  /** Tween duration in ms. Default 400. */
  duration?: number;
  /** Number of decimals to show. Default 0. */
  decimals?: number;
  className?: string;
  /** Optional suffix appended verbatim (e.g. "%", "h"). */
  suffix?: string;
}

/**
 * Smoothly tweens between numeric values using requestAnimationFrame.
 * Used for status counts, recovery percentages, and "ready in Xh" labels
 * so they don't snap jarringly when settings or data change.
 */
export default function AnimatedNumber({
  value,
  duration = 400,
  decimals = 0,
  className,
  suffix = "",
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;

    const target = value;
    const from = fromRef.current;
    if (Math.abs(target - from) < 0.0001) {
      setDisplay(target);
      return;
    }

    function step(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // We intentionally exclude `display` so the tween isn't restarted by its own updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{display.toFixed(decimals)}{suffix}</span>;
}
