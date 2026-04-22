import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { WeeklyReview, ProgressPhoto } from "@/lib/cloud-data";
import { formatWeekRange } from "@/lib/weekly-review";

interface Props {
  review: WeeklyReview;
  photo?: ProgressPhoto | null;
  onClick: () => void;
}

export default function WeeklyReviewCard({ review, photo, onClick }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      className="w-full glass-card rounded-xl p-3 flex gap-3 text-left hover:bg-muted/20 transition-colors"
    >
      {photo?.signedUrl ? (
        <img
          src={photo.signedUrl}
          alt="Weekly progress"
          className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-16 w-16 rounded-lg bg-muted/40 flex items-center justify-center text-[10px] text-muted-foreground flex-shrink-0">
          No photo
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {formatWeekRange(review.weekStart)}
          </p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-3 w-3 ${
                  n <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
        {review.wentWell && (
          <p className="text-xs text-muted-foreground line-clamp-2">{review.wentWell}</p>
        )}
        {!review.wentWell && review.focusNext && (
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            Focus: {review.focusNext}
          </p>
        )}
      </div>
    </motion.button>
  );
}
