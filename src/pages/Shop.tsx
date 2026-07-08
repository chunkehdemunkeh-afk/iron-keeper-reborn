/**
 * Cosmetics Shop — Featured drop, seasonal section, tier exclusives, and the
 * standard category tabs. Rarity glow, animated previews, live tier gating.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Lock, Check, Sparkles, Flame, Crown, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserProgress } from "@/hooks/queries/useUserProgress";
import { useCosmetics, useOwnedCosmetics, useEquippedCosmetics } from "@/hooks/queries/useCosmetics";
import { useCurrentSeason } from "@/hooks/queries/useCurrentSeason";
import { purchaseCosmetic, equipCosmetic, unequipCosmetic, type Cosmetic, type CosmeticKind, type Rarity } from "@/lib/data/cosmetics-queries";
import { tierFromRp, TIERS } from "@/lib/gamification/tiers";
import { AnimatedNumber } from "@/components/AnimatedNumber";

const KIND_LABELS: Record<CosmeticKind, string> = {
  frame: "Frames",
  banner: "Banners",
  xp_theme: "XP",
  title: "Titles",
};

// Rarity glow rings + badge tints.
const RARITY_META: Record<Rarity, { ring: string; text: string; glow: string; label: string }> = {
  common:    { ring: "ring-border/40",     text: "text-muted-foreground", glow: "",                                     label: "Common" },
  rare:      { ring: "ring-sky-400/60",    text: "text-sky-300",          glow: "shadow-[0_0_18px_-4px_rgba(56,189,248,0.6)]", label: "Rare" },
  epic:      { ring: "ring-fuchsia-400/60",text: "text-fuchsia-300",      glow: "shadow-[0_0_20px_-4px_rgba(217,70,239,0.6)]", label: "Epic" },
  legendary: { ring: "ring-amber-400/70",  text: "text-amber-300",        glow: "shadow-[0_0_24px_-4px_rgba(251,191,36,0.7)]", label: "Legendary" },
  seasonal:  { ring: "ring-emerald-400/60",text: "text-emerald-300",      glow: "shadow-[0_0_20px_-4px_rgba(52,211,153,0.6)]", label: "Seasonal" },
};

export default function Shop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: progress } = useUserProgress();
  const { data: catalog = [] } = useCosmetics();
  const { data: owned = [] } = useOwnedCosmetics();
  const { data: equipped = {} } = useEquippedCosmetics();
  const { data: season } = useCurrentSeason();
  const qc = useQueryClient();
  const [tab, setTab] = useState<CosmeticKind>("frame");

  const ownedSet = useMemo(() => new Set(owned.map((o) => o.cosmetic_code)), [owned]);
  const userTier = tierFromRp(progress?.seasonRp ?? 0).id;
  const tierIdx = TIERS.findIndex((t) => t.id === userTier);

  const meetsTier = (req: string | null) => {
    if (!req) return true;
    const reqIdx = TIERS.findIndex((t) => t.id === req);
    return tierIdx >= reqIdx;
  };

  const handleBuy = async (item: Cosmetic) => {
    if (!user) return;
    try {
      await purchaseCosmetic(user.id, item);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["owned-cosmetics"] }),
        qc.invalidateQueries({ queryKey: ["user-progress"] }),
      ]);
      toast.success(`Acquired ${item.name}`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Purchase failed");
    }
  };

  const handleEquip = async (item: Cosmetic) => {
    if (!user) return;
    try {
      const isEquipped = equipped[item.kind] === item.code;
      if (isEquipped) {
        await unequipCosmetic(user.id, item.kind);
        toast.success("Unequipped");
      } else {
        await equipCosmetic(user.id, item.kind, item.code);
        toast.success(`Equipped ${item.name}`);
      }
      await qc.invalidateQueries({ queryKey: ["equipped-cosmetics"] });
    } catch {
      toast.error("Could not update");
    }
  };

  // Featured: highest-rarity affordable-tier item you don't yet own.
  const featured = useMemo(() => {
    const rarityRank: Rarity[] = ["legendary", "epic", "rare", "seasonal", "common"];
    const unowned = catalog.filter((c) => !ownedSet.has(c.code));
    for (const r of rarityRank) {
      const pick = unowned.find((c) => c.rarity === r);
      if (pick) return pick;
    }
    return null;
  }, [catalog, ownedSet]);

  const seasonalDrops = useMemo(
    () => catalog.filter((c) => c.season_release === season?.number),
    [catalog, season]
  );

  const items = catalog.filter((c) => c.kind === tab);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold flex-1">Shop</h1>
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-400/10 ring-1 ring-amber-400/40 px-3 py-1.5 text-amber-400"
          >
            <Coins className="h-4 w-4" />
            <AnimatedNumber value={progress?.coins ?? 0} className="font-bold tabular-nums text-sm" />
          </motion.div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {/* Featured hero */}
        {featured && (
          <FeaturedCard
            item={featured}
            canAfford={(progress?.coins ?? 0) >= featured.price_coins}
            tierOk={meetsTier(featured.required_tier)}
            onBuy={() => handleBuy(featured)}
          />
        )}

        {/* Season 2 drops */}
        {seasonalDrops.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider">
                  New This Season
                </h2>
              </div>
              {season?.theme && (
                <span className="text-[10px] uppercase tracking-widest text-primary/70 font-semibold">
                  {season.theme}
                </span>
              )}
            </div>
            <div className="flex gap-3 -mx-4 px-4 overflow-x-auto pb-1">
              {seasonalDrops.map((item) => (
                <div key={item.code} className="w-[160px] flex-shrink-0">
                  <ShopItemCard
                    item={item}
                    isOwned={ownedSet.has(item.code)}
                    isEquipped={equipped[item.kind] === item.code}
                    canAfford={(progress?.coins ?? 0) >= item.price_coins}
                    tierOk={meetsTier(item.required_tier)}
                    onBuy={() => handleBuy(item)}
                    onEquip={() => handleEquip(item)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as CosmeticKind)}>
          <TabsList className="grid grid-cols-4 w-full">
            {(Object.keys(KIND_LABELS) as CosmeticKind[]).map((k) => (
              <TabsTrigger key={k} value={k} className="text-xs">{KIND_LABELS[k]}</TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(KIND_LABELS) as CosmeticKind[]).map((k) => (
            <TabsContent key={k} value={k} className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                {items.length === 0 && (
                  <p className="col-span-2 text-center text-sm text-muted-foreground py-12">
                    Nothing here yet — check back next season.
                  </p>
                )}
                {items.map((item) => (
                  <ShopItemCard
                    key={item.code}
                    item={item}
                    isOwned={ownedSet.has(item.code)}
                    isEquipped={equipped[item.kind] === item.code}
                    canAfford={(progress?.coins ?? 0) >= item.price_coins}
                    tierOk={meetsTier(item.required_tier)}
                    onBuy={() => handleBuy(item)}
                    onEquip={() => handleEquip(item)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="rounded-xl bg-muted/30 border border-border/40 p-3 flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <p>
            Earn coins from quests, duels, community challenges, and season finales.
            Higher tiers unlock rarer cosmetics and richer season rewards.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({
  item, canAfford, tierOk, onBuy,
}: {
  item: Cosmetic; canAfford: boolean; tierOk: boolean; onBuy: () => void;
}) {
  const rarity = RARITY_META[item.rarity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl bg-gradient-to-br from-card via-card to-background border border-border/60 p-4 space-y-3 overflow-hidden ${rarity.glow}`}
    >
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full opacity-20 blur-3xl" style={featurePayloadBg(item)} />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[10px] uppercase tracking-widest font-bold text-primary">Featured Drop</h2>
        </div>
        <Badge variant="outline" className={`text-[9px] uppercase ${rarity.text} border-current/40`}>
          {rarity.label}
        </Badge>
      </div>
      <div className="relative flex items-center gap-4">
        <div className={`flex-shrink-0 rounded-xl bg-secondary/40 ring-1 ${rarity.ring}`}>
          <CosmeticPreview item={item} size="lg" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-black">{item.name}</h3>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
          <Button
            size="sm"
            className="mt-2 w-full h-8"
            disabled={!canAfford || !tierOk}
            onClick={onBuy}
          >
            {!tierOk ? (
              <><Lock className="h-3 w-3 mr-1" /> {item.required_tier} tier</>
            ) : (
              <><Coins className="h-3 w-3 mr-1" /> {item.price_coins.toLocaleString()}</>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function ShopItemCard({
  item, isOwned, isEquipped, canAfford, tierOk, onBuy, onEquip,
}: {
  item: Cosmetic;
  isOwned: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  tierOk: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const rarity = RARITY_META[item.rarity];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className={`relative rounded-xl bg-card border border-border p-3 space-y-2 ring-1 ${rarity.ring} ${item.rarity === "legendary" || item.rarity === "epic" ? rarity.glow : ""}`}
    >
      {isOwned && (
        <div className="absolute top-1.5 right-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border border-emerald-400/40">
          Owned
        </div>
      )}
      {item.rarity === "legendary" && (
        <Crown className="absolute top-1.5 left-1.5 h-3 w-3 text-amber-300" />
      )}
      <div className={`rounded-lg bg-gradient-to-br from-secondary/60 to-background/40 ${item.rarity === "legendary" ? "animate-pulse-soft" : ""}`}>
        <CosmeticPreview item={item} />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-sm truncate flex-1">{item.name}</h3>
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-2 min-h-[28px]">
          {item.description}
        </p>
        <p className={`text-[9px] uppercase tracking-wider font-bold ${rarity.text} mt-1`}>
          {rarity.label}
        </p>
      </div>
      {!isOwned && (
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          disabled={!canAfford || !tierOk}
          onClick={onBuy}
        >
          {!tierOk ? (
            <><Lock className="h-3 w-3 mr-1" />{item.required_tier}</>
          ) : (
            <><Coins className="h-3 w-3 mr-1" />{item.price_coins.toLocaleString()}</>
          )}
        </Button>
      )}
      {isOwned && (
        <Button
          size="sm"
          variant={isEquipped ? "default" : "outline"}
          className="w-full h-8 text-xs"
          onClick={onEquip}
        >
          {isEquipped ? <><Check className="h-3 w-3 mr-1" />Equipped</> : "Equip"}
        </Button>
      )}
    </motion.div>
  );
}

function featurePayloadBg(item: Cosmetic): React.CSSProperties {
  const p = item.payload as { gradient?: string; from?: string; to?: string };
  if (p.gradient) return { background: p.gradient };
  if (p.from && p.to) return { background: `linear-gradient(135deg, ${p.from}, ${p.to})` };
  return { background: "linear-gradient(135deg,#666,#999)" };
}

function CosmeticPreview({ item, size = "md" }: { item: Cosmetic; size?: "md" | "lg" }) {
  const payload = item.payload as { gradient?: string; from?: string; to?: string; label?: string };
  const dim = size === "lg" ? 88 : 72;

  if (item.kind === "frame") {
    return (
      <motion.div
        animate={{ rotate: [0, 3, -3, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="aspect-square rounded-full mx-auto flex items-center justify-center"
        style={{
          width: dim,
          height: dim,
          background: payload.gradient ?? "linear-gradient(135deg,#666,#999)",
          padding: 4,
        }}
      >
        <div className="w-full h-full rounded-full bg-secondary" />
      </motion.div>
    );
  }
  if (item.kind === "banner") {
    return (
      <div
        className="aspect-[3/1] rounded-lg w-full"
        style={{
          background: payload.gradient ?? "linear-gradient(135deg,#222,#444)",
          height: size === "lg" ? 60 : undefined,
          width: size === "lg" ? 180 : undefined,
        }}
      />
    );
  }
  if (item.kind === "xp_theme") {
    return (
      <div className="py-3 px-1 space-y-1.5" style={size === "lg" ? { width: 180 } : undefined}>
        <div className="h-3 rounded-full overflow-hidden bg-secondary">
          <motion.div
            className="h-full"
            initial={{ width: "10%" }}
            animate={{ width: "82%" }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            style={{ background: `linear-gradient(90deg, ${payload.from}, ${payload.to})` }}
          />
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-secondary opacity-60">
          <div className="h-full w-1/3" style={{ background: `linear-gradient(90deg, ${payload.from}, ${payload.to})` }} />
        </div>
      </div>
    );
  }
  return (
    <div className="aspect-[3/1] flex items-center justify-center" style={size === "lg" ? { width: 180 } : undefined}>
      <span className="font-display text-base font-black uppercase tracking-wider bg-gradient-to-r from-primary via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
        {payload.label ?? item.name}
      </span>
    </div>
  );
}
