/**
 * Community page — global challenges + clan list/creation.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Target, Plus, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useCommunityChallenges, useChallengeStats } from "@/hooks/queries/useCommunityChallenges";
import { useAllClans, useMyClan, useClanMembers } from "@/hooks/queries/useClans";
import { createClan, joinClan, leaveClan } from "@/lib/data/clan-queries";
import { formatDistanceToNowStrict } from "date-fns";

export default function Community() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("challenges");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Community</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="challenges"><Target className="h-3.5 w-3.5 mr-1.5" />Challenges</TabsTrigger>
            <TabsTrigger value="clans"><Users className="h-3.5 w-3.5 mr-1.5" />Clans</TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="mt-4">
            <ChallengesList />
          </TabsContent>

          <TabsContent value="clans" className="mt-4">
            <ClansSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ChallengesList() {
  const { data: challenges = [] } = useCommunityChallenges();
  if (challenges.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-12">No active challenges right now.</p>;
  }
  return (
    <div className="space-y-3">
      {challenges.map((c) => <ChallengeCard key={c.id} challengeId={c.id} />)}
    </div>
  );
}

function ChallengeCard({ challengeId }: { challengeId: string }) {
  const { data: challenges = [] } = useCommunityChallenges();
  const { data: stats } = useChallengeStats(challengeId);
  const c = challenges.find((x) => x.id === challenges.findIndex ? 0 : 0) ?? challenges.find((x) => x.id === challengeId);
  if (!c) return null;
  const total = stats?.totalProgress ?? 0;
  const mine = stats?.myContribution ?? 0;
  const targetNum = Number(c.target);
  const pct = Math.min(100, (total / targetNum) * 100);

  const isWeight = c.metric === "volume_kg";
  const useTonnes = isWeight && targetNum >= 1000;
  const unit = useTonnes ? "t" : c.metric;
  const fmt = (v: number) => {
    if (useTonnes) {
      const t = v / 1000;
      return t >= 100 ? Math.round(t).toLocaleString() : t.toLocaleString(undefined, { maximumFractionDigits: 1 });
    }
    return Math.round(v).toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-border p-4 space-y-3"
    >
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-display text-base font-bold">{c.title}</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {formatDistanceToNowStrict(new Date(c.ends_at))} left
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{c.description}</p>
      </div>

      <div>
        <div className="flex justify-between text-[11px] tabular-nums mb-1.5">
          <span className="font-bold">{fmt(total)}{useTonnes ? "t" : ""}</span>
          <span className="text-muted-foreground">{fmt(targetNum)} {unit}</span>
        </div>
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-gradient-to-r from-primary to-primary/60"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>You: <span className="font-bold text-foreground tabular-nums">{fmt(mine)}{useTonnes ? "t" : ""}</span></span>
          <span>{stats?.contributorCount ?? 0} contributors</span>
      </div>

      <p className="text-[10px] text-center text-amber-400 font-semibold">
        Reward: {c.reward_coins} 🪙{c.reward_cosmetic_code ? ` + ${c.reward_cosmetic_code} cosmetic` : ""}
      </p>
    </motion.div>
  );
}

function ClansSection() {
  const { user } = useAuth();
  const { data: myClan } = useMyClan();
  const { data: clans = [] } = useAllClans();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [desc, setDesc] = useState("");

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim() || !tag.trim()) return toast.error("Name and tag required");
    try {
      await createClan(user.id, name.trim(), tag.trim().toUpperCase().slice(0, 4), desc.trim() || undefined);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clans-all"] }),
        qc.invalidateQueries({ queryKey: ["clan-mine"] }),
      ]);
      setCreateOpen(false);
      setName(""); setTag(""); setDesc("");
      toast.success("Clan created");
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Could not create clan");
    }
  };

  const handleJoin = async (clanId: string) => {
    if (!user) return;
    try {
      await joinClan(user.id, clanId);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clans-all"] }),
        qc.invalidateQueries({ queryKey: ["clan-mine"] }),
      ]);
      toast.success("Joined clan");
    } catch {
      toast.error("Could not join — leave your current clan first");
    }
  };

  const handleLeave = async () => {
    if (!user || !myClan) return;
    try {
      await leaveClan(user.id, myClan.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["clan-mine"] }),
        qc.invalidateQueries({ queryKey: ["clan-members"] }),
      ]);
      toast.success("Left clan");
    } catch {
      toast.error("Could not leave");
    }
  };

  return (
    <div className="space-y-4">
      {myClan ? (
        <MyClanCard clanId={myClan.id} name={myClan.name} tag={myClan.tag} description={myClan.description} onLeave={handleLeave} />
      ) : (
        <Button onClick={() => setCreateOpen(true)} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Start a Clan
        </Button>
      )}

      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
          All Clans
        </h2>
        {clans.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">No clans yet — be first.</p>
        ) : (
          <div className="space-y-2">
            {clans.map((c) => (
              <div key={c.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-display font-bold text-xs">
                  {c.tag}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.memberCount} member{c.memberCount === 1 ? "" : "s"}</p>
                </div>
                {!myClan && (
                  <Button size="sm" variant="outline" onClick={() => handleJoin(c.id)}>Join</Button>
                )}
                {myClan?.id === c.id && (
                  <span className="text-[10px] uppercase tracking-wider text-primary font-bold">Yours</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader><SheetTitle>Start a Clan</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Iron Wolves" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tag (max 4)</label>
              <Input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 4))} placeholder="WLF" maxLength={4} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Description (optional)</label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's your crew about?" />
            </div>
            <Button onClick={handleCreate} className="w-full" size="lg">Create</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MyClanCard({ clanId, name, tag, description, onLeave }: {
  clanId: string;
  name: string;
  tag: string;
  description: string | null;
  onLeave: () => void;
}) {
  const { data: members = [] } = useClanMembers(clanId);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-primary/15 via-card to-card border border-primary/40 p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center font-display font-black">
          {tag}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-bold truncate">{name}</p>
          {description && <p className="text-[11px] text-muted-foreground truncate">{description}</p>}
        </div>
        <Button size="icon" variant="ghost" onClick={onLeave} title="Leave clan">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
          {members.length} Member{members.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <span key={m.user_id} className="text-[11px] bg-secondary/60 px-2 py-1 rounded-full">
              {m.display_name ?? "?"}
              {m.role === "owner" && <span className="ml-1 text-amber-400">★</span>}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
