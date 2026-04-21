import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchSleepLogs, upsertSleepLog } from "@/lib/cloud-data";
import { hapticSuccess } from "@/lib/haptics";

interface Props {
  date: string; // YYYY-MM-DD — the morning being logged for
}

export default function SleepCard({ date }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(7.5);
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ["sleep-logs", user?.id],
    queryFn: () => fetchSleepLogs(14),
    enabled: !!user,
    staleTime: 60_000,
  });

  const todayLog = logs.find((l) => l.date === date);

  // Sync sheet inputs when opening or when log changes
  useEffect(() => {
    if (todayLog) {
      setHours(todayLog.hours);
      setQuality(todayLog.quality);
      setNotes(todayLog.notes ?? "");
    }
  }, [todayLog, open]);

  if (!user) return null;

  async function handleSave() {
    setSaving(true);
    const ok = await upsertSleepLog({ date, hours, quality, notes: notes.trim() || undefined });
    setSaving(false);
    if (ok) {
      hapticSuccess();
      toast.success("Sleep logged");
      queryClient.invalidateQueries({ queryKey: ["sleep-logs"] });
      setOpen(false);
    } else {
      toast.error("Failed to save sleep");
    }
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="glass-card rounded-xl p-4 w-full text-left active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Moon className="h-3 w-3" /> Sleep
          </p>
          {!todayLog && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
              <Plus className="h-3 w-3" /> Log
            </span>
          )}
        </div>

        {todayLog ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl font-bold text-foreground leading-none">
                {todayLog.hours}<span className="text-base text-muted-foreground font-normal">h</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Last night</p>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                    n <= todayLog.quality ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Tap to log last night's sleep</p>
        )}
      </motion.button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Log Sleep</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6 pb-8">
            {/* Hours */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hours</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {hours.toFixed(1)}<span className="text-lg text-muted-foreground font-normal">h</span>
                </p>
              </div>
              <Slider
                value={[hours]}
                onValueChange={(v) => setHours(v[0])}
                min={4}
                max={10}
                step={0.5}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>4h</span><span>10h</span>
              </div>
            </div>

            {/* Quality */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quality</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuality(n)}
                    className={`h-12 rounded-lg font-bold text-sm transition-colors ${
                      quality === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                1 = Restless · 5 = Deep & refreshed
              </p>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Notes <span className="text-[10px] normal-case tracking-normal">(optional)</span>
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. woke up twice, late caffeine"
                className="w-full h-16 rounded-lg bg-muted/50 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                style={{ fontSize: "16px" }}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 rounded-lg gradient-primary font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : todayLog ? "Update Sleep" : "Save Sleep"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
