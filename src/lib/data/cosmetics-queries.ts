/**
 * Cosmetics shop — catalog, inventory, equipped slots.
 * Spends user_progress.coins via optimistic decrement; RLS gates writes.
 */
import { supabase } from "@/integrations/supabase/client";

export type CosmeticKind = "frame" | "banner" | "xp_theme" | "title";
export type Rarity = "common" | "rare" | "epic" | "legendary" | "seasonal";

export interface Cosmetic {
  code: string;
  name: string;
  description: string;
  kind: CosmeticKind;
  rarity: Rarity;
  price_coins: number;
  required_tier: string | null;
  payload: Record<string, unknown>;
  available: boolean;
}

export interface OwnedCosmetic {
  cosmetic_code: string;
  acquired_at: string;
  source: string;
}

export type EquippedMap = Partial<Record<CosmeticKind, string>>;

const c = supabase as unknown as {
  from: (t: string) => any;
  rpc: (n: string, p?: unknown) => Promise<{ data: unknown; error: unknown }>;
};

export async function fetchCosmetics(): Promise<Cosmetic[]> {
  const { data, error } = await c.from("cosmetics").select("*").eq("available", true).order("price_coins");
  if (error) throw error;
  return (data ?? []) as Cosmetic[];
}

export async function fetchOwnedCosmetics(userId: string): Promise<OwnedCosmetic[]> {
  const { data, error } = await c.from("user_cosmetics").select("cosmetic_code, acquired_at, source").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as OwnedCosmetic[];
}

export async function fetchEquipped(userId: string): Promise<EquippedMap> {
  const { data, error } = await c.from("equipped_cosmetics").select("kind, cosmetic_code").eq("user_id", userId);
  if (error) throw error;
  const out: EquippedMap = {};
  for (const row of (data ?? []) as Array<{ kind: CosmeticKind; cosmetic_code: string }>) {
    out[row.kind] = row.cosmetic_code;
  }
  return out;
}

export async function purchaseCosmetic(userId: string, cosmetic: Cosmetic): Promise<void> {
  // Read current coins
  const { data: prog, error: e1 } = await c.from("user_progress").select("coins").eq("user_id", userId).maybeSingle();
  if (e1) throw e1;
  const coins = (prog as { coins?: number } | null)?.coins ?? 0;
  if (coins < cosmetic.price_coins) throw new Error("Not enough coins");

  // Insert ownership (UNIQUE prevents duplicates)
  const { error: e2 } = await c.from("user_cosmetics").insert({
    user_id: userId,
    cosmetic_code: cosmetic.code,
    source: "shop",
  });
  if (e2) throw e2;

  // Decrement coins
  const { error: e3 } = await c.from("user_progress").update({ coins: coins - cosmetic.price_coins }).eq("user_id", userId);
  if (e3) throw e3;
}

export async function equipCosmetic(userId: string, kind: CosmeticKind, code: string): Promise<void> {
  const { error } = await c.from("equipped_cosmetics").upsert({
    user_id: userId,
    kind,
    cosmetic_code: code,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,kind" });
  if (error) throw error;
}

export async function unequipCosmetic(userId: string, kind: CosmeticKind): Promise<void> {
  const { error } = await c.from("equipped_cosmetics").delete().eq("user_id", userId).eq("kind", kind);
  if (error) throw error;
}
