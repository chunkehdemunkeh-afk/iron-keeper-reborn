import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/lib/cloud-data";

interface Props {
  entry: LeaderboardEntry;
  valueLabel: string;
  subLabel?: string;
  index: number;
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt={entry.displayName}
        className="h-9 w-9 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  const initials = entry.displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-display font-bold text-muted-foreground flex-shrink-0">
      {initials}
    </div>
  );
}

export default function LeaderboardRow({ entry, valueLabel, subLabel, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 + index * 0.04 }}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        entry.isCurrentUser
          ? "border border-primary/40 bg-primary/5"
          : "bg-card/40"
      }`}
    >
      {/* Rank */}
      <span className="font-display text-lg font-bold text-muted-foreground w-7 text-center flex-shrink-0">
        {entry.rank}
      </span>

      <Avatar entry={entry} />

      {/* Name + sub info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {entry.isCurrentUser ? (
            <span>
              {entry.displayName.split(" ")[0]}{" "}
              <span className="text-[10px] font-bold text-primary bg-primary/15 rounded-full px-1.5 py-0.5 ml-1">YOU</span>
            </span>
          ) : (
            entry.displayName
          )}
        </p>
        {subLabel && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{subLabel}</p>
        )}
      </div>

      {/* Value */}
      <span className="font-display text-base font-bold text-foreground flex-shrink-0">
        {valueLabel}
      </span>
    </motion.div>
  );
}
