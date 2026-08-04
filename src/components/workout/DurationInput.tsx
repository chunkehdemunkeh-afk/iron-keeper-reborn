import { useEffect, useState } from "react";
import { formatSplit } from "@/lib/run-splits";

/** Parse "5:30", "1:05:00" or "90" (seconds) into total seconds. */
export function parseDuration(input: string): number {
  const raw = input.trim();
  if (!raw) return 0;
  const parts = raw.split(":").map((p) => Number(p.replace(/[^0-9]/g, "")) || 0);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/** Time entry field: shows m:ss (or h:mm:ss) instead of raw seconds. */
export default function DurationInput({
  seconds,
  onChange,
  completed,
  placeholder,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
  completed?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(seconds > 0 ? formatSplit(seconds) : "");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(seconds > 0 ? formatSplit(seconds) : "");
  }, [seconds, focused]);

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder ?? "m:ss"}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9:]/g, "");
        setText(v);
        onChange(parseDuration(v));
      }}
      onBlur={() => {
        setFocused(false);
        const s = parseDuration(text);
        onChange(s);
        setText(s > 0 ? formatSplit(s) : "");
      }}
      className={`h-9 w-full rounded-lg px-2 text-sm text-center tabular-nums outline-none transition-all ${
        completed
          ? "bg-success/15 border border-success/40 text-success font-semibold ring-1 ring-success/20"
          : "bg-muted/50 border border-border/50 focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/40"
      }`}
    />
  );
}
