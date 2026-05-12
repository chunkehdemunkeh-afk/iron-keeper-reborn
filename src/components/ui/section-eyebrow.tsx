import { cn } from "@/lib/utils";

/**
 * Tiny uppercase eyebrow label used above section content.
 * e.g. "THIS WEEK", "RECOVERY", "TRAINING".
 */
export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}
