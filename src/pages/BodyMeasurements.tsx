import { useState, useEffect } from "react";
import { fetchBodyMeasurements, saveBodyMeasurement } from "@/lib/cloud-data";
import { Plus, Scale, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import HelpButton from "@/components/demo/HelpButton";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

export default function BodyMeasurements() {
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    const data = await fetchBodyMeasurements();
    setMeasurements(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!weight && !bodyFat) {
      toast.error("Enter at least one measurement");
      return;
    }
    setSaving(true);
    const success = await saveBodyMeasurement({
      bodyWeight: weight ? Number(weight) : undefined,
      bodyFatPct: bodyFat ? Number(bodyFat) : undefined,
      notes: notes || undefined,
    });
    setSaving(false);

    if (success) {
      toast.success("Measurement saved! 📊");
      setWeight("");
      setBodyFat("");
      setNotes("");
      setShowForm(false);
      loadData();
    } else {
      toast.error("Failed to save");
    }
  };

  const chartData = measurements
    .filter(m => m.bodyWeight)
    .map(m => ({
      date: new Date(m.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      weight: m.bodyWeight,
      bodyFat: m.bodyFatPct,
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState label="Loading measurements" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <div className="mx-auto max-w-lg md:max-w-2xl px-4 pt-6 pb-24 space-y-5">
        <div className="flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-2xl font-bold"
          >
            Body Tracking
          </motion.h1>
          <div className="flex items-center gap-1">
            <HelpButton />
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Log
            </button>
          </div>
        </div>

        {/* Add measurement form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card-elevated rounded-2xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Body Weight (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="75.0"
                      className="w-full h-10 rounded-lg bg-muted/50 border border-border/50 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Body Fat %</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={bodyFat}
                      onChange={e => setBodyFat(e.target.value)}
                      placeholder="15.0"
                      className="w-full h-10 rounded-lg bg-muted/50 border border-border/50 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                </div>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  className="w-full h-9 rounded-lg bg-muted/50 border border-border/50 px-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground glow-primary disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Measurement"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weight chart */}
        {chartData.length >= 2 && (
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Weight Trend
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "hsl(220 10% 55%)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220 18% 11%)",
                    border: "1px solid hsl(220 14% 18%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="weight" stroke="hsl(36 95% 55%)" strokeWidth={2} dot={{ fill: "hsl(36 95% 55%)", r: 3 }} />
                {chartData.some(d => d.bodyFat) && (
                  <Line type="monotone" dataKey="bodyFat" stroke="hsl(142 70% 45%)" strokeWidth={2} dot={{ fill: "hsl(142 70% 45%)", r: 3 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Latest stats */}
        {measurements.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card rounded-xl p-3 text-center">
              <Scale className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-foreground">
                {measurements[measurements.length - 1]?.bodyWeight || "—"}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">Latest Weight (kg)</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center">
              <TrendingUp className="h-4 w-4 text-success mx-auto mb-1" />
              <p className="font-display text-xl font-bold text-success">
                {measurements[measurements.length - 1]?.bodyFatPct ? `${measurements[measurements.length - 1].bodyFatPct}%` : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium">Latest Body Fat</p>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Measurement Log</h3>
          {measurements.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="No measurements yet"
              description='Tap "Log" to add your first entry.'
              className="glass-card rounded-xl"
            />
          ) : (
            <div className="space-y-2">
              {[...measurements].reverse().slice(0, 20).map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card rounded-xl p-3 flex items-center gap-3"
                >
                  <span className="text-lg">📊</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {m.bodyWeight ? `${m.bodyWeight} kg` : ""}
                      {m.bodyWeight && m.bodyFatPct ? " · " : ""}
                      {m.bodyFatPct ? `${m.bodyFatPct}% BF` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    {m.notes && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{m.notes}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
