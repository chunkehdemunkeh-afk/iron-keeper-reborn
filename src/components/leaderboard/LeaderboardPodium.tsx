import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/lib/cloud-data";
import AvatarFrame from "@/components/gamification/AvatarFrame";

const GOLD   = "#F0C040";
const SILVER = "#9AACBA";
const BRONZE = "#B8825A";

function Avatar({ entry, size }: { entry: LeaderboardEntry; size: number }) {
  const initials = entry.displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <AvatarFrame userId={entry.userId} size={size} className="flex-shrink-0">
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.displayName}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center bg-muted/60 font-display font-bold text-muted-foreground"
          style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
          {initials}
        </div>
      )}
    </AvatarFrame>
  );
}

function GoldAvatar({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className="relative flex-shrink-0">
      <motion.div
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 20px 6px ${GOLD}50`, borderRadius: "50%" }}
      />
      <div
        className="rounded-full p-[2px]"
        style={{ background: `conic-gradient(${GOLD} 0%, ${GOLD}80 60%, transparent 100%)` }}
      >
        <div className="rounded-full p-[2px] bg-background">
          <Avatar entry={entry} size={64} />
        </div>
      </div>
    </div>
  );
}

function TrendPill({ delta, small }: { delta: number; small?: boolean }) {
  const base = small ? "text-[9px] px-1 py-0.5" : "text-[10px] px-2 py-0.5";
  if (delta > 0) return (
    <span className={`${base} font-bold rounded-full bg-emerald-500/20 text-emerald-400`}>↑{delta}</span>
  );
  if (delta < 0) return (
    <span className={`${base} font-bold rounded-full bg-red-500/20 text-red-400`}>↓{Math.abs(delta)}</span>
  );
  return (
    <span className={`${base} font-bold rounded-full bg-muted/30 text-muted-foreground/40`}>—</span>
  );
}

interface Props {
  entries: LeaderboardEntry[];
  valueLabel: (e: LeaderboardEntry) => string;
  getRankDelta?: (e: LeaderboardEntry) => number | null;
  isPerDB?: boolean;
}

export default function LeaderboardPodium({ entries, valueLabel, getRankDelta, isPerDB }: Props) {
  const [first, second, third] = entries;
  if (!first) return null;

  const displayName = (e: LeaderboardEntry) =>
    e.isCurrentUser ? "You" : e.displayName;

  const firstDelta = getRankDelta ? getRankDelta(first) : null;

  return (
    <div className="space-y-3">
      {/* Champion hero card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border p-5"
        style={{ borderColor: `${GOLD}35`, background: `linear-gradient(135deg, ${GOLD}0A 0%, transparent 60%)` }}
      >
        {/* Ambient glow */}
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 30% 50%, ${GOLD}25 0%, transparent 65%)` }}
        />

        {/* Trend pill — top right */}
        {firstDelta !== null && firstDelta !== undefined && (
          <div className="absolute top-3 right-3">
            <TrendPill delta={firstDelta} />
          </div>
        )}

        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <GoldAvatar entry={first} />
            <motion.span
              initial={{ scale: 0, y: 4 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 15 }}
              className="absolute -top-5 left-1/2 -translate-x-1/2 text-xl select-none"
            >
              👑
            </motion.span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase mb-1" style={{ color: GOLD }}>
              Champion
            </p>
            <p className="text-base font-semibold text-foreground truncate leading-tight">
              {displayName(first)}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-display text-4xl font-black leading-none mt-1"
              style={{ color: GOLD }}
            >
              {valueLabel(first)}
            </motion.p>
            {/* Badges below value */}
            {(first.isTested || isPerDB) && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {first.isTested && (
                  <span className="text-[9px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 rounded px-1.5 py-0.5 uppercase">
                    Tested
                  </span>
                )}
                {isPerDB && (
                  <span className="text-[9px] font-bold tracking-wider bg-primary/12 text-primary/60 rounded px-1.5 py-0.5">
                    per DB
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Ghost rank number */}
          <span
            className="font-display font-black leading-none select-none flex-shrink-0"
            style={{ fontSize: 80, color: `${GOLD}12`, lineHeight: 1 }}
          >
            1
          </span>
        </div>
      </motion.div>

      {/* Silver + Bronze */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { entry: second, color: SILVER, rank: 2, label: "2nd Place" },
          { entry: third,  color: BRONZE, rank: 3, label: "3rd Place" },
        ].map(({ entry, color, rank, label }) => {
          if (!entry) return <div key={rank} />;
          const delta = getRankDelta ? getRankDelta(entry) : null;
          return (
            <motion.div
              key={entry.userId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: rank * 0.08, duration: 0.35, ease: "easeOut" }}
              className="relative rounded-xl border p-3 overflow-hidden"
              style={{ borderColor: `${color}28`, background: `linear-gradient(135deg, ${color}08 0%, transparent 70%)` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="font-display text-4xl font-black leading-none select-none"
                  style={{ color: `${color}25` }}
                >
                  {rank}
                </span>
                {delta !== null && delta !== undefined && (
                  <TrendPill delta={delta} small />
                )}
                <Avatar entry={entry} size={36} />
              </div>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color }}>
                {label}
              </p>
              <p className="text-xs font-semibold text-foreground truncate">
                {displayName(entry)}
              </p>
              <p className="font-display text-xl font-black leading-none mt-1" style={{ color }}>
                {valueLabel(entry)}
              </p>
              {(entry.isTested || isPerDB) && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {entry.isTested && (
                    <span className="text-[8px] font-bold tracking-wider bg-emerald-500/15 text-emerald-400 rounded px-1 py-0.5 uppercase">
                      Tested
                    </span>
                  )}
                  {isPerDB && (
                    <span className="text-[8px] font-bold tracking-wider bg-primary/12 text-primary/60 rounded px-1 py-0.5">
                      per DB
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
