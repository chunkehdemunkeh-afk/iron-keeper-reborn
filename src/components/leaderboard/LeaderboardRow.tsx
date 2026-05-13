import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/lib/cloud-data";
import AvatarFrame from "@/components/gamification/AvatarFrame";

interface Props {
  entry: LeaderboardEntry;
  valueLabel: string;
  subLabel?: string;
  index: number;
  rankDelta?: number | null;
  isPerDB?: boolean;
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  const initials = entry.displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <AvatarFrame
      userId={entry.userId}
      size={32}
      className="flex-shrink-0"
    >
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.displayName}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-display font-bold text-muted-foreground">
          {initials}
        </div>
      )}
    </AvatarFrame>
  );
}

function TrendBadge({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="text-[9px] font-bold leading-none text-emerald-400">↑{delta}</span>
  );
  if (delta < 0) return (
    <span className="text-[9px] font-bold leading-none text-red-400">↓{Math.abs(delta)}</span>
  );
  return <span className="text-[9px] font-bold leading-none text-muted-foreground/30">—</span>;
}

export default function LeaderboardRow({ entry, valueLabel, subLabel, index, rankDelta, isPerDB }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 + index * 0.035, duration: 0.25, ease: "easeOut" }}
      className={`flex items-center gap-3 py-3 border-b border-border/20 ${
        entry.isCurrentUser ? "relative" : ""
      }`}
    >
      {/* Current user side accent */}
      {entry.isCurrentUser && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-full bg-primary" />
      )}

      {/* Rank + trend indicator */}
      <div className="flex flex-col items-end w-9 flex-shrink-0 gap-0.5">
        <span className="font-display text-2xl font-black leading-none tabular-nums text-muted-foreground/25 select-none">
          {String(entry.rank).padStart(2, "0")}
        </span>
        {rankDelta !== null && rankDelta !== undefined && (
          <TrendBadge delta={rankDelta} />
        )}
      </div>

      <Avatar entry={entry} />

      {/* Name + sub */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-sm font-semibold truncate ${entry.isCurrentUser ? "text-foreground" : "text-foreground/80"}`}>
            {entry.displayName}
          </p>
          {entry.isCurrentUser && (
            <span className="text-[9px] font-bold tracking-wider text-primary bg-primary/12 rounded px-1.5 py-0.5 flex-shrink-0 uppercase">
              You
            </span>
          )}
        </div>
        {(subLabel || entry.isTested || isPerDB) && (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {subLabel && (
              <p className="text-[10px] text-muted-foreground/60 truncate">{subLabel}</p>
            )}
            {entry.isTested && (
              <span className="text-[9px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 rounded px-1.5 py-0.5 flex-shrink-0 uppercase">
                Tested
              </span>
            )}
            {isPerDB && (
              <span className="text-[9px] font-bold tracking-wider bg-primary/12 text-primary/60 rounded px-1.5 py-0.5 flex-shrink-0">
                per DB
              </span>
            )}
          </div>
        )}
      </div>

      {/* Value */}
      <span className={`font-display text-base font-bold flex-shrink-0 tabular-nums ${
        entry.isCurrentUser ? "text-primary" : "text-foreground/90"
      }`}>
        {valueLabel}
      </span>
    </motion.div>
  );
}
