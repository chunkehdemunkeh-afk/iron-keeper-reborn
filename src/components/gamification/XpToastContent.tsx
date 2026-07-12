import { Sparkles, Zap, Coins } from "lucide-react";

interface XpToastContentProps {
  title: string;
  totalXp: number;
  totalCoins: number;
}

export function XpToastContent({ title, totalXp, totalCoins }: XpToastContentProps) {
  return (
    <div className="flex items-center gap-3.5 min-w-0">
      <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-base leading-tight text-foreground truncate">
          {title}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {totalXp > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm font-display font-bold text-primary tabular-nums">
              <Zap className="h-4 w-4" />
              +{totalXp.toLocaleString()} XP
            </span>
          )}
          {totalCoins > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm font-display font-bold text-amber-400 tabular-nums">
              <Coins className="h-4 w-4" />
              +{totalCoins.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
