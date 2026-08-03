import { Dumbbell, Whistle } from "lucide-react";
import type { AccountType } from "@/lib/signup-intent";

const OPTIONS: { id: AccountType; label: string; desc: string }[] = [
  { id: "athlete", label: "I'm training", desc: "Track your own workouts" },
  { id: "coach", label: "I'm a coach", desc: "Manage athletes & programmes" },
];

/** Segmented account-type picker shown when creating a new account. */
export default function AccountTypeSelector({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (v: AccountType) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 text-left">
        Sign up as
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={`rounded-2xl border p-3 text-left transition-colors ${
                active
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/30 bg-card/60 hover:bg-card"
              }`}
            >
              <p className={`text-xs font-bold ${active ? "text-primary" : "text-foreground"}`}>
                {o.label}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{o.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
