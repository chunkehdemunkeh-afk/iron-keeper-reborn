import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { Settings2 } from "lucide-react";

export default function PostOnboardingTip() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const flag = localStorage.getItem(`ik-onboarding-tip-${user.id}`);
    if (flag === "pending") {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  const handleDismiss = () => {
    setOpen(false);
    if (user) localStorage.removeItem(`ik-onboarding-tip-${user.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary glow-primary mb-3">
            <Settings2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <SheetTitle className="font-display text-2xl">You're all set</SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            Want to change your training plan or nutrition goals later? Head to{" "}
            <span className="font-semibold text-foreground">Profile</span> any time to update either.
          </SheetDescription>
        </SheetHeader>
        <button
          onClick={handleDismiss}
          className="mt-6 w-full rounded-2xl gradient-primary py-4 text-base font-bold text-primary-foreground glow-primary active:scale-[0.98] transition-transform"
        >
          Got it
        </button>
      </SheetContent>
    </Sheet>
  );
}
