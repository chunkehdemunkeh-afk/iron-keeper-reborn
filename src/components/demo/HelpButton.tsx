import { HelpCircle, Sparkles, Play, Check } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDemoTour } from "@/hooks/useDemoTour";
import DemoTour from "./DemoTour";

interface Props {
  className?: string;
}

/**
 * Page-header help button. In demo mode, opens a menu showing the current
 * tour section name and a quick-jump list to each step. Renders nothing
 * outside demo mode or on routes without a tour.
 */
export default function HelpButton({ className }: Props) {
  const { tour, open, startAt, close, restart, available } = useDemoTour();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!available || !tour) return null;

  const sectionLabel = tour.id.charAt(0).toUpperCase() + tour.id.slice(1);

  const handleJump = (idx: number) => {
    setMenuOpen(false);
    restart(idx);
  };

  const handleStartFromTop = () => {
    setMenuOpen(false);
    restart(0);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            menuOpen
              ? "text-primary bg-primary/15"
              : "text-muted-foreground hover:text-primary hover:bg-primary/10"
          } ${className ?? ""}`}
          aria-label="Show tips for this screen"
          aria-expanded={menuOpen}
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <AnimatePresence>
          {menuOpen && (
            <>
              {/* Click-outside backdrop */}
              <div
                className="fixed inset-0 z-[150]"
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ type: "spring", damping: 22, stiffness: 320 }}
                className="absolute right-0 top-10 z-[160] w-72 rounded-2xl glass-card-elevated overflow-hidden"
                style={{
                  boxShadow:
                    "0 20px 50px -12px hsl(36 95% 55% / 0.3), 0 0 0 1px hsl(36 95% 55% / 0.12)",
                }}
              >
                {/* Header */}
                <div className="relative px-4 pt-3.5 pb-3 border-b border-border/50">
                  <div className="absolute -top-12 right-0 w-32 h-32 rounded-full opacity-25 blur-2xl pointer-events-none"
                    style={{ background: "radial-gradient(circle, hsl(36 95% 55%), transparent 70%)" }}
                  />
                  <div className="relative flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
                      <Sparkles className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none">
                        Demo Tour
                      </p>
                      <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                        {sectionLabel}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step list */}
                <div className="max-h-[320px] overflow-y-auto py-1.5">
                  {tour.steps.map((s, i) => {
                    let seen = false;
                    try {
                      seen = !!sessionStorage.getItem(`ik-demo-tour-${tour.id}-seen`);
                    } catch {
                      // ignore
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => handleJump(i)}
                        className="group w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-primary/8 transition-colors"
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 transition-colors ${
                            seen
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary"
                          }`}
                        >
                          {seen ? <Check className="h-3 w-3" /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-snug truncate">
                            {s.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                            {s.body}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-3 py-2.5 border-t border-border/50 bg-muted/20">
                  <button
                    onClick={handleStartFromTop}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg gradient-primary text-primary-foreground py-2 text-xs font-bold"
                    style={{ boxShadow: "0 4px 12px -2px hsl(36 95% 55% / 0.4)" }}
                  >
                    <Play className="h-3 w-3" /> Start from beginning
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <DemoTour tour={tour} open={open} startAt={startAt} onClose={close} />
    </>
  );
}
