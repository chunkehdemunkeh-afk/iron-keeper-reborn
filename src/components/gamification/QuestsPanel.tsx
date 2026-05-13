import { useActiveQuests } from "@/hooks/queries/useQuests";
import { Check, Trophy, Calendar, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { QuestWithProgress } from "@/lib/data/quest-queries";

export default function QuestsPanel() {
  const { data, isLoading } = useActiveQuests();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Loading quests…</p>;
  }
  if (!data) return null;

  return (
    <div className="space-y-5">
      <Group title="Daily Quests" icon={<Sparkles className="h-3.5 w-3.5" />} quests={data.daily} />
      <Group title="Weekly Quests" icon={<Calendar className="h-3.5 w-3.5" />} quests={data.weekly} />
    </div>
  );
}

function Group({ title, icon, quests }: { title: string; icon: React.ReactNode; quests: QuestWithProgress[] }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
        {icon} {title}
      </h2>
      <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
        {quests.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">No quests active.</div>
        )}
        {quests.map(q => <QuestRow key={q.id} q={q} />)}
      </div>
    </section>
  );
}

function QuestRow({ q }: { q: QuestWithProgress }) {
  return (
    <div className="p-3.5 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {q.completed && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
            <p className="text-sm font-semibold truncate">{q.title}</p>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{q.description}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold shrink-0">
          <span className="text-primary">+{q.xp_reward}</span>
          <Trophy className="h-3 w-3 text-amber-400" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${q.pct}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${q.completed ? "bg-emerald-400" : "bg-primary"}`}
          />
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums w-14 text-right">
          {Math.round(q.progress)} / {q.criteria.target}
        </span>
      </div>
    </div>
  );
}
