import { useEffect, useRef, useState } from "react";
import { hapticMedium } from "@/lib/haptics";

interface Options {
  /** Called when the user releases past the threshold. Should return a promise. */
  onRefresh: () => Promise<unknown> | void;
  /** Pixels of pull required to trigger. */
  threshold?: number;
  /** Disable when true (e.g. a sheet is open). */
  disabled?: boolean;
}

interface State {
  /** Current pull distance in px (already damped). */
  pull: number;
  /** True while the refresh promise is pending. */
  refreshing: boolean;
  /** True once pull crosses the threshold (used for visual cue / haptic). */
  armed: boolean;
}

/**
 * Native-feel pull-to-refresh for mobile web.
 * Listens on `window` so any vertical scroll container at scrollTop=0 triggers.
 * Returns a state object you can use to render an indicator at the top of the page.
 */
export function usePullToRefresh({ onRefresh, threshold = 70, disabled = false }: Options): State {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);
  const startY = useRef<number | null>(null);
  const armedRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Damped pull (rubber band)
      const damped = Math.min(120, dy * 0.5);
      setPull(damped);
      const isArmed = damped >= threshold;
      if (isArmed && !armedRef.current) {
        armedRef.current = true;
        setArmed(true);
        hapticMedium();
      } else if (!isArmed && armedRef.current) {
        armedRef.current = false;
        setArmed(false);
      }
    };

    const onTouchEnd = async () => {
      if (startY.current == null) return;
      const wasArmed = armedRef.current;
      startY.current = null;
      armedRef.current = false;
      setArmed(false);
      if (wasArmed && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, threshold, disabled, refreshing]);

  return { pull, refreshing, armed };
}
