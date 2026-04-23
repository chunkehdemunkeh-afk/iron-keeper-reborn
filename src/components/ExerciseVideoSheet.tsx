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
  const videoUrl = images ? null : getExerciseVideoUrl(exerciseId || "", exerciseName);

  // YouTube state
  const isShort = videoUrl?.includes("/shorts/");
  const shortId = isShort ? videoUrl!.split("/shorts/")[1]?.split("?")[0] : null;
  const videoId = shortId || (videoUrl?.match(/[?&]v=([^&]+)/) || [])[1] || null;
  const youtubeWatchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl || "";
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&rel=0&modestbranding=1`
    : null;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  const [embedFailed, setEmbedFailed] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setEmbedFailed(false);
      setEmbedLoaded(false);
    }
    onOpenChange(isOpen);
  };

  const showEmbed = open && embedUrl && !embedFailed;
  const showFallback = open && videoUrl && (!embedUrl || embedFailed);

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

          {/* YouTube embed */}
          {showEmbed && (
            <div className="relative" style={{ height: "calc(100% - 60px)" }}>
              {!embedLoaded && thumbnailUrl && (
                <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center bg-muted/30">
                  <img src={thumbnailUrl} alt={exerciseName} className="w-full h-full object-cover rounded-xl opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-primary/80 flex items-center justify-center animate-pulse">
                      <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                </div>
              )}
              <iframe
                src={embedUrl!}
                className={`w-full h-full rounded-xl transition-opacity duration-300 ${embedLoaded ? "opacity-100" : "opacity-0"}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${exerciseName} tutorial`}
                onLoad={() => setEmbedLoaded(true)}
                onError={() => setEmbedFailed(true)}
              />
            </div>
          )}

          {/* YouTube fallback */}
          {showFallback && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl overflow-hidden relative" style={{ height: "calc(100% - 60px)" }}>
              {thumbnailUrl && (
                <img src={thumbnailUrl} alt={exerciseName} className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-30" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <p className="text-muted-foreground text-sm text-center max-w-xs">
                  Embedded playback unavailable. Open the video directly in YouTube instead.
                </p>
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground glow-primary flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Open in YouTube
                </a>
              </div>
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
