-- Biometric tracking: daily_biometrics + daily_scores tables
-- Plus sleep stage columns on existing sleep_logs.

-- ─── daily_biometrics ────────────────────────────────────────────────────────
-- Morning check-in data read from Samsung Health (or Health Connect in Phase 2).
CREATE TABLE IF NOT EXISTS daily_biometrics (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users NOT NULL,
  date                 date NOT NULL,
  samsung_stress_score smallint,          -- 0–100 (Samsung's HRV-derived stress score)
  resting_hr           smallint,          -- bpm
  spo2_pct             numeric(4,1),      -- e.g. 97.5
  hrv_ms               numeric(5,1),      -- RMSSD ms (optional — Samsung Wellness report)
  respiratory_rate     numeric(4,1),      -- breaths/min during sleep
  source               text DEFAULT 'manual' CHECK (source IN ('manual', 'health_connect')),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_biometrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own daily_biometrics"
  ON daily_biometrics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── daily_scores ─────────────────────────────────────────────────────────────
-- Cached computed scores + AI coaching insight. Recomputed each morning.
CREATE TABLE IF NOT EXISTS daily_scores (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid REFERENCES auth.users NOT NULL,
  date               date NOT NULL,
  recovery_score     numeric(5,1),        -- 0–100 (green ≥67, yellow 34–66, red ≤33)
  strain_score       numeric(4,2),        -- 0–21 log scale (mirrors Whoop Strain)
  stress_level       numeric(3,1),        -- 0–3 (0–0.9 Low, 1–1.9 Mod, 2–2.9 Elevated, 3 High)
  sleep_performance  numeric(5,1),        -- 0–100
  ai_insight         jsonb,               -- structured JSON from Claude Haiku
  ai_generated_at    timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own daily_scores"
  ON daily_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── sleep_logs stage columns ─────────────────────────────────────────────────
-- Nullable — populated when Samsung Health stage data is available.
ALTER TABLE sleep_logs
  ADD COLUMN IF NOT EXISTS deep_sleep_min  smallint,
  ADD COLUMN IF NOT EXISTS rem_sleep_min   smallint,
  ADD COLUMN IF NOT EXISTS light_sleep_min smallint,
  ADD COLUMN IF NOT EXISTS awake_min       smallint,
  ADD COLUMN IF NOT EXISTS sleep_efficiency numeric(4,1);

-- ─── indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_biometrics_user_date
  ON daily_biometrics (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_scores_user_date
  ON daily_scores (user_id, date DESC);
