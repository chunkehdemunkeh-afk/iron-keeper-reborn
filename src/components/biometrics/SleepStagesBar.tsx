interface Props {
  deepMin: number;
  remMin: number;
  lightMin: number;
  awakeMin: number;
  className?: string;
}

const STAGES = [
  { key: "deep",  label: "Deep",  color: "bg-indigo-500"  },
  { key: "rem",   label: "REM",   color: "bg-violet-500"  },
  { key: "light", label: "Light", color: "bg-blue-400"    },
  { key: "awake", label: "Awake", color: "bg-rose-400"    },
] as const;

export default function SleepStagesBar({ deepMin, remMin, lightMin, awakeMin, className = "" }: Props) {
  const total = deepMin + remMin + lightMin + awakeMin;
  if (total === 0) return null;

  const values = { deep: deepMin, rem: remMin, light: lightMin, awake: awakeMin };

  function fmt(mins: number): string {
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${mins}m`;
  }

  return (
    <div className={className}>
      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-3 w-full">
        {STAGES.map(({ key, color }) => {
          const pct = (values[key] / total) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={key}
              className={`${color} transition-all`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-2 flex-wrap">
        {STAGES.map(({ key, label, color }) => {
          const mins = values[key];
          if (!mins) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${color} flex-shrink-0`} />
              <span className="text-[10px] text-muted-foreground">{label} {fmt(mins)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
