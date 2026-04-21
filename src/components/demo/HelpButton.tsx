import { HelpCircle } from "lucide-react";
import { useDemoTour } from "@/hooks/useDemoTour";
import DemoTour from "./DemoTour";

interface Props {
  className?: string;
}

/**
 * Page-header help button. Renders nothing outside demo mode (or on routes
 * with no tour defined). When tapped, re-opens the current screen's tour.
 */
export default function HelpButton({ className }: Props) {
  const { tour, open, close, restart, available } = useDemoTour();

  if (!available || !tour) return null;

  return (
    <>
      <button
        onClick={restart}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ${className ?? ""}`}
        aria-label="Show tips for this screen"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <DemoTour tour={tour} open={open} onClose={close} />
    </>
  );
}
