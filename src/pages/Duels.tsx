import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Swords, Trophy, Clock, Plus, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useMyDuels, useChallengeableUsers, useDuelMutations } from "@/hooks/queries/useDuels";
import { DUEL_TYPE_LABELS, DUEL_PRESETS, type DuelType, type DuelWithParticipants } from "@/lib/data/duel-queries";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/gamification/TierBadge";
import { toast } from "sonner";

export default function Duels() {
  const navigate = useNavigate();
  const { data: duels = [], isLoading } = useMyDuels();
  const { create, accept, decline, cancel, refresh, settle } = useDuelMutations();
  const [open, setOpen] = useState(false);

  const pending = duels.filter(d => d.status === "pending");
  const active = duels.filter(d => d.status === "active");
  const completed = duels.filter(d => d.status === "completed");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-bold flex-1">Duels</h1>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
        ) : duels.length === 0 ? (
          <EmptyState onChallenge={() => setOpen(true)} />
        ) : (
          <>
            {pending.length > 0 && (
              <Section title="Pending">
                {pending.map(d => (
                  <DuelCard key={d.id} duel={d}
                    onAccept={() => accept.mutate(d.id, { onSuccess: () => toast.success("Duel accepted!") })}
                    onDecline={() => decline.mutate(d.id)}
                    onCancel={() => cancel.mutate(d.id)}
                  />
                ))}
              </Section>
            )}
            {active.length > 0 && (
              <Section title="Active">
                {active.map(d => (
                  <DuelCard key={d.id} duel={d}
                    onRefresh={() => refresh.mutate(d, { onSuccess: () => toast.success("Progress updated") })}
                    onSettle={() => settle.mutate(d.id, { onSuccess: () => toast.success("Duel settled") })}
                  />
                ))}
              </Section>
            )}
            {completed.length > 0 && (
              <Section title="Completed">
                {completed.map(d => <DuelCard key={d.id} duel={d} />)}
              </Section>
            )}
          </>
        )}
      </div>

      <NewDuelSheet open={open} onClose={() => setOpen(false)}
        onCreate={(payload) => {
          create.mutate(payload, {
            onSuccess: () => { toast.success("Challenge sent!"); setOpen(false); },
            onError: (e: any) => toast.error(e.message ?? "Failed"),
          });
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyState({ onChallenge }: { onChallenge: () => void }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-10 text-center space-y-4">
      <Swords className="h-10 w-10 mx-auto text-primary" />
      <div>
        <h3 className="font-display text-lg font-bold">No duels yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Challenge another lifter head-to-head and stake RP.</p>
      </div>
      <Button onClick={onChallenge}>Start a duel</Button>
    </div>
  );
}

function DuelCard({ duel, onAccept, onDecline, onCancel, onRefresh, onSettle }: {
  duel: DuelWithParticipants;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onRefresh?: () => void;
  onSettle?: () => void;
}) {
  const myIsChallenger = false; // We don't have user context here; handle via UI showing both sides equally
  const totalC = duel.challenger_value;
  const totalO = duel.opponent_value;
  const max = Math.max(totalC, totalO, 1);
  const target = duel.target ?? max;
  const cPct = Math.min(100, (totalC / Math.max(target, 1)) * 100);
  const oPct = Math.min(100, (totalO / Math.max(target, 1)) * 100);

  const endsLabel = duel.ends_at
    ? duel.status === "completed"
      ? `ended ${formatDistanceToNow(new Date(duel.ends_at), { addSuffix: true })}`
      : `ends ${formatDistanceToNow(new Date(duel.ends_at), { addSuffix: true })}`
    : `${duel.duration_days}d duel`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card border border-border p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{DUEL_TYPE_LABELS[duel.type]}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Clock className="h-3 w-3" /> {endsLabel} · stake {duel.rp_stake} RP
          </p>
        </div>
        {duel.status === "completed" && duel.winner_id && (
          <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
        )}
      </div>

      <Side name={duel.challenger_name} value={totalC} pct={cPct} target={duel.target} winner={duel.winner_id === duel.challenger_id} />
      <Side name={duel.opponent_name} value={totalO} pct={oPct} target={duel.target} winner={duel.winner_id === duel.opponent_id} />

      {(onAccept || onDecline || onCancel || onRefresh || onSettle) && (
        <div className="flex gap-2 pt-2 border-t border-border">
          {onAccept && <Button size="sm" onClick={onAccept} className="flex-1 gap-1"><Check className="h-3 w-3"/> Accept</Button>}
          {onDecline && <Button size="sm" variant="ghost" onClick={onDecline} className="gap-1"><X className="h-3 w-3"/> Decline</Button>}
          {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
          {onRefresh && <Button size="sm" variant="outline" onClick={onRefresh} className="flex-1">Refresh progress</Button>}
          {onSettle && duel.ends_at && new Date(duel.ends_at) <= new Date() && (
            <Button size="sm" onClick={onSettle} className="flex-1">Settle</Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Side({ name, value, pct, target, winner }: { name: string | null; value: number; pct: number; target: number | null; winner: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className={`truncate ${winner ? "font-bold text-amber-400" : "font-medium"}`}>{name ?? "Anonymous"}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(value).toLocaleString()}{target ? ` / ${Math.round(target).toLocaleString()}` : ""}
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${winner ? "bg-gradient-to-r from-amber-400 to-amber-300" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function NewDuelSheet({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (p: { opponent_id: string; type: DuelType; duration_days: number; rp_stake: number; target?: number }) => void;
}) {
  const { data: users = [] } = useChallengeableUsers();
  const [opponent, setOpponent] = useState<string | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const preset = DUEL_PRESETS[presetIdx];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Duel</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">Challenge type</p>
            <div className="grid grid-cols-1 gap-2">
              {DUEL_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPresetIdx(i)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    presetIdx === i ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-semibold">{DUEL_TYPE_LABELS[p.type]}</p>
                  <p className="text-[11px] text-muted-foreground">{p.description} · {p.stake} RP</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Opponent {users.length === 0 && "(no challengeable users)"}
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg border border-border">
              {users.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => setOpponent(u.user_id)}
                  className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors ${
                    opponent === u.user_id ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} className="h-8 w-8 rounded-full" alt="" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.display_name}</p>
                      <p className="text-[10px] text-muted-foreground">L{u.level} · {u.season_rp} RP</p>
                    </div>
                  </div>
                  <TierBadge rp={u.season_rp} variant="icon" />
                </button>
              ))}
            </div>
          </div>

          <Button
            disabled={!opponent}
            className="w-full"
            onClick={() => opponent && onCreate({
              opponent_id: opponent,
              type: preset.type,
              duration_days: preset.days,
              rp_stake: preset.stake,
              target: preset.target,
            })}
          >
            Send Challenge
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
