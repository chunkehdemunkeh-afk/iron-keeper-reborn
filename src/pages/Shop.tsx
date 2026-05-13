/**
 * Cosmetics Shop — browse, buy, equip frames/banners/xp themes/titles.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, Lock, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserProgress } from "@/hooks/queries/useUserProgress";
import { useCosmetics, useOwnedCosmetics, useEquippedCosmetics } from "@/hooks/queries/useCosmetics";
import { purchaseCosmetic, equipCosmetic, unequipCosmetic, type Cosmetic, type CosmeticKind } from "@/lib/data/cosmetics-queries";
import { tierFromRp, TIERS } from "@/lib/gamification/tiers";

const KIND_LABELS: Record<CosmeticKind, string> = {
  frame: "Frames",
  banner: "Banners",
  xp_theme: "XP Themes",
  title: "Titles",
};

export default function Shop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: progress } = useUserProgress();
  const { data: catalog = [] } = useCosmetics();
  const { data: owned = [] } = useOwnedCosmetics();
  const { data: equipped = {} } = useEquippedCosmetics();
  const qc = useQueryClient();
  const [tab, setTab] = useState<CosmeticKind>("frame");

  const ownedSet = new Set(owned.map((o) => o.cosmetic_code));
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

  const items = catalog.filter((c) => c.kind === tab);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold flex-1">Shop</h1>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1.5 text-amber-400">
            <Coins className="h-4 w-4" />
            <span className="font-bold tabular-nums text-sm">{progress?.coins ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
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
                {items.map((item) => {
                  const isOwned = ownedSet.has(item.code);
                  const isEquipped = equipped[item.kind] === item.code;
                  const canAfford = (progress?.coins ?? 0) >= item.price_coins;
                  const tierOk = meetsTier(item.required_tier);

                  return (
                    <motion.div
                      key={item.code}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-card border border-border p-3 space-y-2"
                    >
                      <CosmeticPreview item={item} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm truncate">{item.name}</h3>
                          {item.rarity !== "common" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 capitalize">{item.rarity}</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 min-h-[28px]">
                          {item.description}
                        </p>
                      </div>
                      {!isOwned && (
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs"
                          disabled={!canAfford || !tierOk}
                          onClick={() => handleBuy(item)}
                        >
                          {!tierOk ? (
                            <>
                              <Lock className="h-3 w-3 mr-1" />
                              {item.required_tier}
                            </>
                          ) : (
                            <>
                              <Coins className="h-3 w-3 mr-1" />
                              {item.price_coins}
                            </>
                          )}
                        </Button>
                      )}
                      {isOwned && (
                        <Button
                          size="sm"
                          variant={isEquipped ? "default" : "outline"}
                          className="w-full h-8 text-xs"
                          onClick={() => handleEquip(item)}
                        >
                          {isEquipped ? <><Check className="h-3 w-3 mr-1" />Equipped</> : "Equip"}
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <p className="text-[11px] text-center text-muted-foreground pt-4">
          <Sparkles className="inline h-3 w-3 mr-1" />
          Earn coins by completing quests, winning duels, and finishing seasons.
        </p>
      </div>
    </div>
  );
}

function CosmeticPreview({ item }: { item: Cosmetic }) {
  const payload = item.payload as { gradient?: string; from?: string; to?: string; label?: string };

  if (item.kind === "frame") {
    return (
      <div
        className="aspect-square rounded-full mx-auto w-20 flex items-center justify-center"
        style={{ background: payload.gradient ?? "linear-gradient(135deg,#666,#999)", padding: 4 }}
      >
        <div className="w-full h-full rounded-full bg-secondary" />
      </div>
    );
  }
  if (item.kind === "banner") {
    return (
      <div
        className="aspect-[3/1] rounded-lg w-full"
        style={{ background: payload.gradient ?? "linear-gradient(135deg,#222,#444)" }}
      />
    );
  }
  if (item.kind === "xp_theme") {
    return (
      <div className="space-y-1.5 py-3">
        <div className="h-3 rounded-full overflow-hidden bg-secondary">
          <div className="h-full w-3/4" style={{ background: `linear-gradient(90deg, ${payload.from}, ${payload.to})` }} />
        </div>
      </div>
    );
  }
  // title
  return (
    <div className="aspect-[3/1] flex items-center justify-center">
      <span className="font-display text-base font-black uppercase tracking-wider bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        {payload.label}
      </span>
    </div>
  );
}
