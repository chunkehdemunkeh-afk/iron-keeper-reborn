import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { isDemoMode } from "@/lib/demo-mode";
import { getTourForPath, type Tour } from "@/lib/demo-tours";

const SEEN_KEY = (id: string) => `ik-demo-tour-${id}-seen`;

export function useDemoTour() {
  const location = useLocation();
  const tour: Tour | null = isDemoMode() ? getTourForPath(location.pathname) : null;
  const [open, setOpen] = useState(false);
  const [startAt, setStartAt] = useState(0);

  // Auto-open on first visit per route
  useEffect(() => {
    if (!tour) return;
    try {
      const seen = sessionStorage.getItem(SEEN_KEY(tour.id));
      if (!seen) {
        const t = setTimeout(() => {
          setStartAt(0);
          setOpen(true);
        }, 600);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [tour?.id]);

  const close = useCallback(() => {
    setOpen(false);
    if (tour) {
      try { sessionStorage.setItem(SEEN_KEY(tour.id), "1"); } catch {}
    }
  }, [tour]);

  const restart = useCallback((stepIndex = 0) => {
    if (!tour) return;
    setStartAt(stepIndex);
    setOpen(true);
  }, [tour]);

  return { tour, open, startAt, close, restart, available: !!tour };
}
