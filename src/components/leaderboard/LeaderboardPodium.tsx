import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/lib/cloud-data";

const MEDAL_COLORS = [
  { ring: "#FFD700", bg: "bg-[#FFD700]/15", label: "text-[#FFD700]", border: "border-[#FFD700]/50" },
  { ring: "#C0C0C0", bg: "bg-[#C0C0C0]/10", label: "text-[#C0C0C0]", border: "border-[#C0C0C0]/40" },
  { ring: "#CD7F32", bg: "bg-[#CD7F32]/10", label: "text-[#CD7F32]", border: "border-[#CD7F32]/40" },
];

const PODIUM_HEIGHTS = ["h-24", "h-16", "h-12"];
const PODIUM_ORDER = [1, 0, 2]; // 2nd | 1st | 3rd visual order

interface Props {
  entries: LeaderboardEntry[];
  valueLabel: (e: LeaderboardEntry) => string;
}

function Avatar({ entry, size = 48 }: { entry: LeaderboardEntry; size?: number }) {
  if (entry.avatarUrl) {
    return (
      <img
        src={entry.avatarUrl}
        alt={entry.displayName}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
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
    <div
      className="rounded-full flex items-center justify-center bg-muted text-muted-foreground font-display font-bold"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export default function LeaderboardPodium({ entries, valueLabel }: Props) {
  const top3 = entries.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-3 pt-2 pb-1">
      {PODIUM_ORDER.map((idx) => {
        const entry = top3[idx];
        if (!entry) return <div key={idx} className="w-24" />;
        const medal = MEDAL_COLORS[idx];
        const isFirst = idx === 0;

        return (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.08, type: "spring", stiffness: 300, damping: 24 }}
            className="flex flex-col items-center gap-1.5 flex-1 max-w-[90px]"
          >
            {/* Crown for 1st */}
            {isFirst && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 400 }}
                className="text-[18px] leading-none"
              >
                👑
              </motion.div>
            )}

            {/* Avatar with medal ring */}
            <div
              className="rounded-full p-0.5"
              style={{ background: `conic-gradient(${medal.ring} 0%, transparent 80%)`, boxShadow: `0 0 12px ${medal.ring}40` }}
            >
              <div className="rounded-full bg-background p-0.5">
                <Avatar entry={entry} size={isFirst ? 52 : 42} />
              </div>
            </div>

            {/* Name */}
            <p className="text-[10px] font-semibold text-center leading-tight max-w-full truncate px-1">
              {entry.isCurrentUser ? "You" : entry.displayName.split(" ")[0]}
            </p>

            {/* Value */}
            <p className={`font-display text-sm font-bold leading-none ${medal.label}`}>
              {valueLabel(entry)}
            </p>

            {/* Podium block */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.2 + idx * 0.06, type: "spring", stiffness: 260, damping: 20 }}
              style={{ transformOrigin: "bottom" }}
              className={`w-full ${PODIUM_HEIGHTS[idx]} rounded-t-lg ${medal.bg} border ${medal.border} flex items-center justify-center`}
            >
              <span className={`font-display text-2xl font-black leading-none ${medal.label}`}>
                {entry.rank}
              </span>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
