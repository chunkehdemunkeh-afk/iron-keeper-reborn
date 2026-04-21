import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import type { Tour } from "@/lib/demo-tours";

interface Props {
  tour: Tour;
  open: boolean;
  onClose: () => void;
  startAt?: number;
}

export default function DemoTour({ tour, open, onClose, startAt = 0 }: Props) {
  const [step, setStep] = useState(startAt);

  // Reset when tour changes or reopens
  useEffect(() => {
    if (open) setStep(startAt);
  }, [open, tour.id, startAt]);

  const total = tour.steps.length;
  const current = tour.steps[step];
  const isLast = step === total - 1;

  const next = () => {
    if (isLast) onClose();
    else setStep((s) => s + 1);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            key={step}
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="relative w-full max-w-sm rounded-3xl glass-card-elevated overflow-hidden"
            style={{
              boxShadow: "0 20px 60px -10px hsl(36 95% 55% / 0.35), 0 0 0 1px hsl(36 95% 55% / 0.15)",
              marginBottom: "max(80px, env(safe-area-inset-bottom))",
            }}
          >
            {/* Glow accent */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, hsl(36 95% 55%), transparent 70%)" }}
            />

            <div className="relative p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-primary">
                    <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Demo Tour · {step + 1}/{total}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Close tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step content */}
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-foreground">{current.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{current.body}</p>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5 pt-1">
                {tour.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === step ? "bg-primary w-8" : i < step ? "bg-primary/40 w-4" : "bg-muted w-4"
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                >
                  Skip tour
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={next}
                  className="flex items-center gap-1.5 rounded-xl gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-bold"
                  style={{ boxShadow: "0 6px 20px -4px hsl(36 95% 55% / 0.5)" }}
                >
                  {isLast ? "Got it" : "Next"}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
