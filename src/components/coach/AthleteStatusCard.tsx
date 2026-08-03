import { TrendingUp, TrendingDown, Minus, Moon, HeartPulse, MessageSquare } from "lucide-react";
import type { RosterStat } from "@/lib/data/coach-feed-queries";
import AthleteAvatar from "@/components/coach/AthleteAvatar";

const STATUS_META: Record<RosterStat["status"], { label: string; cls: string }> = {
  "on-track": { label: "On track", cls: "bg-emerald-500/15 text-emerald-500" },
  slipping: { label: "Slipping", cls: "bg-amber-500/15 text-amber-500" },
  inactive: { label: "Inactive", cls: "bg-destructive/15 text-destructive" },
};

function relative(dateStr: string | null) {
  if (!dateStr) return "No sessions yet";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days <= 0) return "Trained today";
  if (days === 1) return "Trained yesterday";
  return `Trained ${days}d ago`;
}

export default function AthleteStatusCard({
  stat,
  onOpen,
  onMessage,
}: {
  stat: RosterStat;
  onOpen: () => void;
  onMessage: () => void;
}) {
  const delta = stat.volumeThisWeek - stat.volumePrevWeek;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendCls = delta > 0 ? "text-emerald-500" : delta < 0 ? "text-destructive" : "text-muted-foreground";
  const meta = STATUS_META[stat.status];

  return (
    <div className="rounded-2xl bg-card hairline border p-4">
      <div className="flex items-start gap-3">
        <button onClick={onOpen} aria-label={`Open ${stat.displayName}`}>
          <AthleteAvatar name={stat.displayName} url={stat.avatarUrl} size={42} />
        </button>
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{stat.displayName}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{relative(stat.lastSessionAt)}</p>
        </button>
        <button
          onClick={onMessage}
          className="relative shrink-0 h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={`Message ${stat.displayName}`}
        >
          <MessageSquare className="h-4 w-4" />
          {stat.unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {stat.unread}
            </span>
          )}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-xl bg-muted/25 py-2">
          <p className="font-display text-base font-bold tabular-nums">{stat.sessionsThisWeek}</p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Sessions</p>
        </div>
        <div className="rounded-xl bg-muted/25 py-2">
          <p className={`font-display text-base font-bold tabular-nums inline-flex items-center gap-0.5 ${trendCls}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(Math.round(delta / 100) / 10)}k
          </p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Volume</p>
        </div>
        <div className="rounded-xl bg-muted/25 py-2">
          <p className="font-display text-base font-bold tabular-nums inline-flex items-center gap-0.5">
            <HeartPulse className="h-3.5 w-3.5 text-primary" />
            {stat.recoveryScore != null ? Math.round(stat.recoveryScore) : "—"}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Recovery</p>
        </div>
        <div className="rounded-xl bg-muted/25 py-2">
          <p className="font-display text-base font-bold tabular-nums inline-flex items-center gap-0.5">
            <Moon className="h-3.5 w-3.5 text-primary" />
            {stat.avgSleepHours != null ? stat.avgSleepHours.toFixed(1) : "—"}
          </p>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Sleep</p>
        </div>
      </div>
    </div>
  );
}
