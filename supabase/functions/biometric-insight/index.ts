import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BiometricPayload {
  scores: {
    recovery: number;
    strain: number;
    stress: number;
    sleep: number;
  };
  trends: {
    stress_7d: (number | null)[];
    rhr_7d: (number | null)[];
    recovery_7d: (number | null)[];
  };
  context: {
    next_workout: string | null;
    training_today?: Array<{
      name: string;
      durationMin: number;
      totalSets: number;
      totalVolumeKg: number;
      caloriesBurned: number | null;
    }>;
    sleep_hours: number | null;
    sleep_stages: {
      deep: number | null;
      rem: number | null;
      light: number | null;
      awake: number | null;
    } | null;
    yesterday_strain: number | null;
    spo2: number | null;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth gate: require a valid Supabase JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supa = createClient(supabaseUrl, supabaseAnon);
    const { data: userData, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: BiometricPayload = await req.json();
    const { scores, trends, context } = payload;

    // Derive descriptive labels for the prompt
    const recoveryLabel = scores.recovery >= 67 ? "Green (well recovered)" : scores.recovery >= 34 ? "Yellow (moderate)" : "Red (fatigued)";
    const strainLabel = scores.strain < 8 ? "light" : scores.strain < 12 ? "moderate" : scores.strain < 16 ? "strenuous" : "very strenuous";
    const stressLabel = scores.stress < 1 ? "low" : scores.stress < 2 ? "moderate" : scores.stress < 2.8 ? "elevated" : "high";

    const validRecovery = trends.recovery_7d.filter((v): v is number => v !== null);
    const avgRecovery7d = validRecovery.length ? Math.round(validRecovery.reduce((a, b) => a + b, 0) / validRecovery.length) : null;

    const validStress = trends.stress_7d.filter((v): v is number => v !== null);
    const avgStress7d = validStress.length ? Math.round(validStress.reduce((a, b) => a + b, 0) / validStress.length) : null;

    const sleepStagesText = context.sleep_stages && context.sleep_stages.deep !== null
      ? `deep ${context.sleep_stages.deep}min, REM ${context.sleep_stages.rem}min, light ${context.sleep_stages.light}min, awake ${context.sleep_stages.awake}min`
      : "stages not recorded";

    const trainingTodayText = (context.training_today && context.training_today.length > 0)
      ? context.training_today
          .map((w) => `${w.name} — ${w.totalSets} working sets, ${w.totalVolumeKg}kg total volume, ${w.durationMin}min${w.caloriesBurned ? `, ${w.caloriesBurned} kcal` : ""}`)
          .join("; ")
      : "no training logged yet today";

    const userMessage = `
Today's biometric data for an athlete using Iron Keeper fitness app:

SCORES:
- Recovery Score: ${Math.round(scores.recovery)}% (${recoveryLabel})
- Daily Strain: ${scores.strain.toFixed(1)}/21 (${strainLabel})
- Body Stress Level: ${scores.stress.toFixed(1)}/3 (${stressLabel})
- Sleep Performance: ${Math.round(scores.sleep)}%

TODAY'S CONTEXT:
- Sleep: ${context.sleep_hours ? `${context.sleep_hours}h` : "not logged"} — ${sleepStagesText}
- SpO2: ${context.spo2 ? `${context.spo2}%` : "not recorded"}
- Training already completed today: ${trainingTodayText}
- Yesterday's strain: ${context.yesterday_strain ? `${context.yesterday_strain.toFixed(1)}/21` : "not recorded"}

7-DAY TRENDS:
- Avg recovery: ${avgRecovery7d ? `${avgRecovery7d}%` : "insufficient data"}
- Avg stress scores: ${avgStress7d ? `${avgStress7d}/100` : "insufficient data"}
- Recovery trend (oldest→newest): ${trends.recovery_7d.map(v => v !== null ? Math.round(v) : "?").join(", ")}

Provide a JSON response with exactly these 5 fields (no markdown, just JSON):
{
  "headline": "Short punchy 4-8 word summary of today's status",
  "recovery_summary": "2-3 sentences on what the recovery/stress numbers mean today. Reference the user's own trends where possible. Be specific — mention actual numbers.",
  "training_recommendation": "2-3 sentences on how to approach today's training given these scores. If next_workout is provided, reference it specifically. Give clear intensity guidance.",
  "sleep_analysis": "1-2 sentences on last night's sleep quality and what it means for today. If stage data is available, reference it. If sleep was poor, explain the impact.",
  "week_ahead": "1-2 sentences looking at the trend and giving forward-looking guidance. Mention if a deload or easy day might be needed soon."
}
`.trim();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: "You are Iron Keeper's performance coach. Analyse biometric data and give precise, actionable insights. Be direct and specific — no generic advice, no filler phrases. Always use the athlete's actual numbers to ground your analysis. Respond with pure JSON only, no markdown code blocks.",
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text ?? "";

    let insight: Record<string, string>;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      insight = JSON.parse(cleaned);
    } catch {
      // Fallback: return a minimal valid insight
      insight = {
        headline: "Analysis ready",
        recovery_summary: `Recovery at ${Math.round(scores.recovery)}% today.`,
        training_recommendation: scores.recovery >= 67
          ? "Your scores indicate you're ready to train hard today."
          : "Consider a lighter session or extra recovery time today.",
        sleep_analysis: context.sleep_hours
          ? `You logged ${context.sleep_hours}h of sleep.`
          : "Log your sleep data for better insights.",
        week_ahead: "Keep monitoring your morning check-in data to spot trends.",
      };
    }

    return new Response(JSON.stringify(insight), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("biometric-insight error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
