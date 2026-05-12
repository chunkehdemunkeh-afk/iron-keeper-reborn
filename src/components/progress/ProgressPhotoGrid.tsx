import { useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence, type PanInfo } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Trash2, X, Save, Loader2, Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  deleteProgressPhoto,
  updateProgressPhotoNotes,
  type ProgressPhoto,
} from "@/lib/cloud-data";
import { queryKeys } from "@/lib/query-keys";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { toast } from "sonner";

interface Props {
  photos: ProgressPhoto[];
  weights: Record<string, number>;
}

export default function ProgressPhotoGrid({ photos, weights }: Props) {
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ProgressPhoto | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openPhoto(p: ProgressPhoto) {
    setActive(p);
    setNotesDraft(p.notes || "");
  }

  async function handleDelete() {
    if (!active) return;
    setDeleting(true);
    const ok = await deleteProgressPhoto(active.id, active.storagePath);
    setDeleting(false);
    if (ok) {
      hapticSuccess();
      toast.success("Photo deleted");
      queryClient.invalidateQueries({ queryKey: queryKeys.progressPhotos() });
      setActive(null);
    } else {
      toast.error("Could not delete");
    }
  }

  async function handleSaveNotes() {
    if (!active) return;
    setSaving(true);
    const ok = await updateProgressPhotoNotes(active.id, notesDraft.trim());
    setSaving(false);
    if (ok) {
      hapticSuccess();
      toast.success("Notes saved");
      queryClient.invalidateQueries({ queryKey: queryKeys.progressPhotos() });
      setActive(null);
    } else {
      toast.error("Could not save notes");
    }
  }

  if (photos.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No progress photos yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tap "Add photo" to start your visual log
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((p) => (
          <SwipeTile
            key={p.id}
            photo={p}
            weightKg={weights[p.date]}
            onTap={() => openPhoto(p)}
            onDelete={async () => {
              const ok = await deleteProgressPhoto(p.id, p.storagePath);
              if (ok) {
                hapticSuccess();
                toast.success("Photo deleted");
                queryClient.invalidateQueries({ queryKey: queryKeys.progressPhotos() });
              } else {
                toast.error("Could not delete");
              }
            }}
          />
        ))}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-0 rounded-t-2xl">
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col"
              >
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(active.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {weights[active.date] != null && (
                      <p className="text-xs text-muted-foreground">{weights[active.date]} kg</p>
                    )}
                  </div>
                  <button
                    onClick={() => setActive(null)}
                    className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-4 py-4 space-y-4">
                  {active.signedUrl ? (
                    <img src={active.signedUrl} alt="Progress" className="w-full rounded-xl" />
                  ) : (
                    <div className="aspect-square rounded-xl bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
                      Image unavailable
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground px-1">Notes</label>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      rows={3}
                      placeholder="Anything to remember about this photo?"
                      className="w-full bg-card/60 border border-border/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary/50 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-xl bg-destructive/10 text-destructive py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SwipeTile({
  photo,
  weightKg,
  onTap,
  onDelete,
}: {
  photo: ProgressPhoto;
  weightKg?: number;
  onTap: () => void;
  onDelete: () => void;
}) {
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, -30], [1, 0]);
  const [tapStart, setTapStart] = useState<number>(0);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x < -90) {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      hapticMedium();
      onDelete();
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 flex items-center justify-end pr-4 bg-destructive rounded-xl"
      >
        <Trash2 className="h-5 w-5 text-white" />
      </motion.div>
      <motion.div
        style={{ x, touchAction: "pan-y" }}
        drag="x"
        dragConstraints={{ left: -110, right: 0 }}
        dragElastic={{ left: 0.1, right: 0 }}
        onDragEnd={handleDragEnd}
        onPointerDown={() => setTapStart(Date.now())}
        onPointerUp={() => {
          if (Date.now() - tapStart < 200 && Math.abs(x.get()) < 5) onTap();
        }}
        className="bg-card rounded-xl overflow-hidden"
      >
        {photo.signedUrl ? (
          <img
            src={photo.signedUrl}
            alt="Progress"
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-square bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
            Loading…
          </div>
        )}
        <div className="px-2 py-1.5">
          <p className="text-[11px] font-medium text-foreground">
            {new Date(photo.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
          {weightKg != null && (
            <p className="text-[10px] text-muted-foreground">{weightKg} kg</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
