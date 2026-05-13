/**
 * Competitive tier system — Bronze → Champion.
 * RP (Rank Points) earned in duels/challenges; resets per 8-week season.
 */

export type Tier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "champion";

export interface TierMeta {
  id: Tier;
  label: string;
  /** Min RP to enter this tier. */
  minRp: number;
  /** Tailwind text colour token-friendly. */
  color: string;
  /** Background gradient class chain. */
  gradient: string;
  /** Lucide icon name suggestion. */
  icon: string;
}

export const TIERS: TierMeta[] = [
  { id: "bronze",   label: "Bronze",   minRp: 0,    color: "text-amber-700",  gradient: "from-amber-700/20 to-amber-900/10",  icon: "Shield"   },
  { id: "silver",   label: "Silver",   minRp: 200,  color: "text-slate-300",  gradient: "from-slate-400/20 to-slate-600/10",  icon: "Shield"   },
  { id: "gold",     label: "Gold",     minRp: 500,  color: "text-amber-400",  gradient: "from-amber-400/25 to-amber-600/10",  icon: "Award"    },
  { id: "platinum", label: "Platinum", minRp: 900,  color: "text-cyan-300",   gradient: "from-cyan-400/20 to-sky-600/10",     icon: "Award"    },
  { id: "diamond",  label: "Diamond",  minRp: 1400, color: "text-sky-300",    gradient: "from-sky-400/25 to-indigo-500/15",   icon: "Gem"      },
  { id: "champion", label: "Champion", minRp: 2000, color: "text-fuchsia-300",gradient: "from-fuchsia-500/25 to-purple-600/15",icon: "Crown"    },
];

export function tierFromRp(rp: number): TierMeta {
  let current = TIERS[0];
  for (const t of TIERS) if (rp >= t.minRp) current = t;
  return current;
}

export function nextTier(rp: number): TierMeta | null {
  const cur = tierFromRp(rp);
  const idx = TIERS.findIndex((t) => t.id === cur.id);
  return TIERS[idx + 1] ?? null;
}

/** Progress 0..1 toward next tier. Champion → 1. */
export function tierProgress(rp: number): number {
  const cur = tierFromRp(rp);
  const next = nextTier(rp);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (rp - cur.minRp) / (next.minRp - cur.minRp)));
}

export function getTierMeta(id: Tier): TierMeta {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}
