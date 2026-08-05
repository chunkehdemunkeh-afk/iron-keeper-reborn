import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getExerciseVideoUrl, getExerciseImages } from "@/lib/exercise-videos";
import { ExternalLink, Play, Dumbbell } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  exerciseId?: string;
};

function ImageFrame({ src, label }: { src: string; label: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">{label}</span>
      <div className="relative rounded-xl overflow-hidden bg-muted/30 aspect-[3/4]">
        {!loaded && !failed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
          </div>
        )}
        {!failed && (
          <img
            src={src}
            alt={label}
            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        )}
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Dumbbell className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExerciseVideoSheet({ open, onOpenChange, exerciseName, exerciseId }: Props) {
  const images = getExerciseImages(exerciseId || "");
  const videoUrl = images ? null : getExerciseVideoUrl(exerciseId || "");

  const isShort = videoUrl?.includes("/shorts/");
  const shortId = isShort ? videoUrl!.split("/shorts/")[1]?.split("?")[0] : null;
  const videoId = shortId || (videoUrl?.match(/[?&]v=([^&]+)/) || [])[1] || null;
  const youtubeWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl || "";
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setThumbLoaded(false);
      setThumbFailed(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl bg-card border-border/50 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="font-display text-lg text-foreground flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            How to: {exerciseName}
            {videoUrl && (
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6 h-full overflow-y-auto">
          {/* Static form images for lib-db-* exercises */}
          {images && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <ImageFrame src={images.frame0} label="Start" />
                <ImageFrame src={images.frame1} label="Finish" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Form reference — start and finish positions
              </p>
            </div>
          )}

          {/* YouTube thumbnail for exercises with a video URL */}
          {!images && thumbnailUrl && (
            <div className="flex flex-col gap-4">
              <div className="relative rounded-xl overflow-hidden bg-muted/30 aspect-video">
                {!thumbLoaded && !thumbFailed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
                  </div>
                )}
                {!thumbFailed && (
                  <img
                    src={thumbnailUrl}
                    alt={exerciseName}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${thumbLoaded ? "opacity-100" : "opacity-0"}`}
                    onLoad={() => setThumbLoaded(true)}
                    onError={() => setThumbFailed(true)}
                  />
                )}
                {thumbFailed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
              >
                <Play className="h-4 w-4" />
                Watch on YouTube
              </a>
            </div>
          )}

          {/* No demo available */}
          {!images && !videoUrl && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Dumbbell className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                No demo available for this exercise yet.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
