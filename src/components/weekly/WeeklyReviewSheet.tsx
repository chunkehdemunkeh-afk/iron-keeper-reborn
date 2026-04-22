import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  computeWeekStats,
  fetchWeeklyReview,
  upsertWeeklyReview,
  uploadProgressPhoto,
  fetchProgressPhotos,
  type WeekSummary,
  type WeeklyReview,
  type ProgressPhoto,
} from "@/lib/cloud-data";
import { formatWeekRange, toDateStr } from "@/lib/weekly-review";
import {
  Star, Dumbbell, Activity, Apple, Droplets, Scale, Moon, Trophy, Camera, Loader2, Pencil, Check,
} from "lucide-react";
import { hapticSuccess, hapticMedium } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  open: boolean;
  weekStart: string;
  mode?: "create" | "edit" | "view";
  onClose: () => void;
}

export default function WeeklyReviewSheet({ open, weekStart, mode = "create", onClose }: Props) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [wentWell, setWentWell] = useState("");
  const [toImprove, setToImprove] = useState("");
  const [focusNext, setFocusNext] = useState("");
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(mode !== "view");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery<WeekSummary>({
    queryKey: ["week-summary", weekStart],
    queryFn: () => computeWeekStats(weekStart),
    enabled: open,
  });

  const { data: existing } = useQuery<WeeklyReview | null>({
    queryKey: ["weekly-review", weekStart],
    queryFn: () => fetchWeeklyReview(weekStart),
    enabled: open,
  });

  const { data: photos = [] } = useQuery<ProgressPhoto[]>({
    queryKey: ["progress-photos"],
    queryFn: fetchProgressPhotos,
    enabled: open,
  });

  // Hydrate state on open / when existing changes
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setRating(existing.rating);
      setWentWell(existing.wentWell || "");
      setToImprove(existing.toImprove || "");
      setFocusNext(existing.focusNext || "");
      setPhotoId(existing.photoId);
      setEditMode(mode === "edit");
    } else {
      setRating(0);
      setWentWell("");
      setToImprove("");
      setFocusNext("");
      setPhotoId(null);
      setEditMode(true);
    }
  }, [existing, open, mode]);

  // Resolve attached photo URL
  useEffect(() => {
    if (!photoId) {
      setPhotoUrl(null);
      return;
    }
    const found = photos.find((p) => p.id === photoId);
    setPhotoUrl(found?.signedUrl ?? null);
  }, [photoId, photos]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const photo = await uploadProgressPhoto(file, toDateStr(new Date()));
    setUploading(false);
    if (photo) {
      setPhotoId(photo.id);
      setPhotoUrl(photo.signedUrl);
      hapticSuccess();
      toast.success("Photo added");
      queryClient.invalidateQueries({ queryKey: ["progress-photos"] });
    }
  }

  async function handleSave() {
    if (rating === 0) {
      toast.error("Please rate your week first");
      return;
    }
    setSaving(true);
    const saved = await upsertWeeklyReview({
      weekStart,
      rating,
      wentWell: wentWell.trim() || null,
      toImprove: toImprove.trim() || null,
      focusNext: focusNext.trim() || null,
      photoId,
    });
    setSaving(false);
    if (!saved) {
      toast.error("Could not save review");
      return;
    }
    hapticSuccess();
    toast.success("Week saved");
    queryClient.invalidateQueries({ queryKey: ["weekly-review", weekStart] });
    queryClient.invalidateQueries({ queryKey: ["weekly-reviews"] });
    onClose();
  }

  const readOnly = !editMode;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-0 rounded-t-2xl">
        <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3">
          <SheetTitle className="font-display text-lg flex items-center justify-between">
            <span>Weekly Review</span>
            {existing && readOnly && (
              <button
                type="button"
                onClick={() => { setEditMode(true); hapticMedium(); }}
                className="text-xs font-medium text-primary bg-primary/10 rounded-full px-3 py-1 flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )}
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">{formatWeekRange(weekStart)}</p>
        </SheetHeader>

        <div className="px-4 pt-4 pb-8 space-y-5">
          {/* Auto-summary */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your week at a glance
            </h3>
            {summaryLoading || !summary ? (
              <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                Crunching the numbers…
              </div>
            ) : (
              <div className="space-y-2">
                <SummaryRow
                  icon={Dumbbell}
                  label="Workouts"
                  value={`${summary.workouts.count} ${summary.workouts.count === 1 ? "session" : "sessions"} · ${summary.workouts.totalMinutes} min`}
                  tone={summary.workouts.count >= 3 ? "good" : summary.workouts.count >= 1 ? "neutral" : "nudge"}
                  message={
                    summary.workouts.count >= 3
                      ? "Strong week of training!"
                      : summary.workouts.count >= 1
                      ? "Good consistency — keep going."
                      : "Aim for at least one session next week."
                  }
                />
                <SummaryRow
                  icon={Activity}
                  label="Activities"
                  value={`${summary.activities.restDays} rest · ${summary.activities.otherCount} other`}
                  tone="neutral"
                />
                <SummaryRow
                  icon={Apple}
                  label="Food logged"
                  value={`${summary.food.daysLogged}/7 days${summary.food.avgCalories ? ` · avg ${summary.food.avgCalories} kcal` : ""}`}
                  tone={summary.food.daysLogged >= 5 ? "good" : summary.food.daysLogged >= 2 ? "neutral" : "nudge"}
                  message={
                    summary.food.daysLogged >= 5
                      ? "Great food tracking habit."
                      : summary.food.daysLogged >= 2
                      ? "Keep building the habit."
                      : "Try logging a few meals next week."
                  }
                />
                <SummaryRow
                  icon={Droplets}
                  label="Water"
                  value={`${summary.water.daysAtGoal}/7 days at goal`}
                  tone={summary.water.daysAtGoal >= 5 ? "good" : "neutral"}
                />
                <SummaryRow
                  icon={Scale}
                  label="Weight"
                  value={
                    summary.weight.entries === 0
                      ? "0 entries"
                      : `${summary.weight.entries} entries${
                          summary.weight.deltaKg != null
                            ? ` · ${summary.weight.deltaKg > 0 ? "+" : ""}${summary.weight.deltaKg} kg`
                            : ""
                        }`
                  }
                  tone={summary.weight.entries >= 2 ? "good" : "nudge"}
                  message={
                    summary.weight.entries >= 2
                      ? "Sharp tracking."
                      : "Try logging weight more often — it sharpens the trends."
                  }
                />
                <SummaryRow
                  icon={Moon}
                  label="Sleep"
                  value={
                    summary.sleep.avgHours
                      ? `${summary.sleep.avgHours}h avg · ${summary.sleep.avgQuality}/5`
                      : "No sleep logged"
                  }
                  tone={summary.sleep.avgHours && summary.sleep.avgHours >= 7 ? "good" : "neutral"}
                />
                {summary.prs.count > 0 && (
                  <SummaryRow
                    icon={Trophy}
                    label="New PRs"
                    value={`${summary.prs.count} hit`}
                    tone="good"
                    message={summary.prs.names.join(", ")}
                  />
                )}
              </div>
            )}
          </section>

          {/* Reflection form */}
          <section className="space-y-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your reflection
            </h3>

            {/* Rating */}
            <div className="glass-card rounded-xl p-4">
              <p className="text-sm font-semibold text-foreground mb-3">How did this week feel?</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={readOnly}
                    onClick={() => { setRating(n); hapticMedium(); }}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className="p-1 disabled:opacity-100"
                  >
                    <Star
                      className={`h-8 w-8 transition-all ${
                        n <= rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <ReflectionField
              label="What went well?"
              value={wentWell}
              onChange={setWentWell}
              placeholder="The wins, the highlights, what you're proud of…"
              readOnly={readOnly}
            />
            <ReflectionField
              label="What to improve?"
              value={toImprove}
              onChange={setToImprove}
              placeholder="Anything you'd do differently?"
              readOnly={readOnly}
            />
            <ReflectionField
              label="Focus for next week"
              value={focusNext}
              onChange={setFocusNext}
              placeholder="One thing to prioritise…"
              readOnly={readOnly}
            />

            {/* Photo */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">This week's photo</p>
                <span className="text-[10px] text-muted-foreground">Optional</span>
              </div>
              {photoUrl ? (
                <div className="relative">
                  <img
                    src={photoUrl}
                    alt="Weekly progress"
                    className="w-full rounded-lg object-cover max-h-72"
                  />
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => { setPhotoId(null); setPhotoUrl(null); }}
                      className="absolute top-2 right-2 rounded-full bg-background/90 text-xs px-2 py-1 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : !readOnly ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-6 text-sm text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {uploading ? "Uploading…" : "Add a progress photo"}
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">No photo this week.</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </section>

          {/* Save */}
          {!readOnly && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleSave}
              disabled={saving || rating === 0}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {existing ? "Update review" : "Save week"}
            </motion.button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  tone,
  message,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "good" | "neutral" | "nudge";
  message?: string;
}) {
  const toneColor =
    tone === "good"
      ? "text-success"
      : tone === "nudge"
      ? "text-amber-400"
      : "text-foreground";
  return (
    <div className="glass-card rounded-xl p-3 flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className={`text-sm font-semibold ${toneColor}`}>{value}</p>
        {message && <p className="text-[11px] text-muted-foreground mt-0.5">{message}</p>}
      </div>
    </div>
  );
}

function ReflectionField({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  readOnly: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground px-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-card/60 border border-border/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 resize-none read-only:opacity-90 read-only:cursor-default"
      />
    </div>
  );
}
