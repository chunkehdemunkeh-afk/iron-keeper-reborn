import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, GitCompareArrows } from "lucide-react";
import { motion } from "framer-motion";
import {
  fetchProgressPhotos,
  uploadProgressPhoto,
  fetchBodyMeasurements,
  type ProgressPhoto,
} from "@/lib/cloud-data";
import { toDateStr } from "@/lib/weekly-review";
import { hapticSuccess } from "@/lib/haptics";
import { toast } from "sonner";
import ProgressPhotoGrid from "./ProgressPhotoGrid";
import PhotoCompareSheet from "./PhotoCompareSheet";

export default function PhotosTab() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos = [], isLoading } = useQuery<ProgressPhoto[]>({
    queryKey: ["progress-photos"],
    queryFn: fetchProgressPhotos,
  });

  const { data: bodyMeasurements = [] } = useQuery({
    queryKey: ["body-measurements"],
    queryFn: fetchBodyMeasurements,
  });

  // Map photo date → most recent body weight on/before that day
  const weightsByPhotoDate = useMemo(() => {
    const map: Record<string, number> = {};
    if (photos.length === 0 || bodyMeasurements.length === 0) return map;
    const sortedMeas = [...bodyMeasurements]
      .filter((m) => m.bodyWeight != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    photos.forEach((p) => {
      const photoDay = p.date;
      let last: number | undefined;
      for (const m of sortedMeas) {
        const mDay = m.date.split("T")[0];
        if (mDay <= photoDay) last = m.bodyWeight!;
        else break;
      }
      // Same-day exact match preferred
      const same = sortedMeas.find((m) => m.date.split("T")[0] === photoDay);
      if (same?.bodyWeight != null) last = same.bodyWeight;
      if (last != null) map[p.date] = last;
    });
    return map;
  }, [photos, bodyMeasurements]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const photo = await uploadProgressPhoto(file, toDateStr(new Date()));
    setUploading(false);
    if (photo) {
      hapticSuccess();
      toast.success("Photo added");
      queryClient.invalidateQueries({ queryKey: ["progress-photos"] });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Add photo"}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => setCompareOpen(true)}
          disabled={photos.length < 2}
          className="rounded-xl bg-muted/50 text-foreground py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <GitCompareArrows className="h-4 w-4" />
          Compare
        </motion.button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading photos…</div>
      ) : (
        <ProgressPhotoGrid photos={photos} weights={weightsByPhotoDate} />
      )}

      <PhotoCompareSheet
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        photos={photos}
        weights={weightsByPhotoDate}
      />
    </div>
  );
}
