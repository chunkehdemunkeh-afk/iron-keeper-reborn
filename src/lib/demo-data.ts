// In-memory seeded fixtures for Demo Mode.
// Mirrors the shape of Supabase rows so the interceptor can return them directly.

import { format, subDays } from "date-fns";
import { DEMO_USER_ID } from "./demo-mode";

let nextId = 1;
const id = () => `demo-${nextId++}`;
const today = () => format(new Date(), "yyyy-MM-dd");
const daysAgo = (n: number) => format(subDays(new Date(), n), "yyyy-MM-dd");
const isoDaysAgo = (n: number) => subDays(new Date(), n).toISOString();

// ── Workout history ────────────────────────────────────────────────────────
type DemoWorkout = {
  id: string;
  user_id: string;
  workout_id: string;
  workout_name: string;
  date: string;
  duration: number;
  exercises_completed: number;
  total_exercises: number;
  effort_rating: number | null;
  session_notes: string | null;
  created_at: string;
};

type DemoSet = {
  id: string;
  workout_history_id: string;
  user_id: string;
  exercise_id: string;
  exercise_name: string;
  reps: number;
  weight: number;
  created_at: string;
};

type DemoBodyMeasurement = {
  id: string;
  user_id: string;
  body_weight: number | null;
  body_fat_pct: number | null;
  date: string;
  notes: string | null;
  created_at: string;
};

type DemoFoodLog = {
  id: string;
  user_id: string;
  date: string;
  meal_type: string;
  food_name: string;
  brand: string | null;
  serving_qty: number;
  serving_size: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number | null;
  fibre_g: number | null;
  saturated_fat_g: number | null;
  salt_g: number | null;
  barcode: string | null;
  created_at: string;
};

type DemoWater = {
  id: string;
  user_id: string;
  date: string;
  amount_ml: number;
  created_at: string;
};

type DemoActivity = {
  id: string;
  user_id: string;
  date: string;
  activity_type: string;
  label: string | null;
  duration: number;
  notes: string | null;
  created_at: string;
};

type DemoDailyLog = {
  id: string;
  user_id: string;
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
  calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  water_goal_ml: number;
  weight_kg: number | null;
  created_at: string;
};

type DemoNutritionGoals = {
  id: string;
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_goal_ml: number;
  tdee_age: number | null;
  tdee_gender: string | null;
  tdee_height_cm: number | null;
  tdee_weight_kg: number | null;
  tdee_activity_level: string | null;
  tdee_goal: string | null;
  updated_at: string;
  created_at: string;
};

interface DemoStore {
  workout_history: DemoWorkout[];
  workout_sets: DemoSet[];
  body_measurements: DemoBodyMeasurement[];
  food_logs: DemoFoodLog[];
  water_intake: DemoWater[];
  activity_logs: DemoActivity[];
  daily_logs: DemoDailyLog[];
  nutrition_goals: DemoNutritionGoals[];
  stretch_completions: { id: string; user_id: string; date: string; created_at: string }[];
  favourite_foods: any[];
  profiles: { id: string; user_id: string; display_name: string; avatar_url: string | null; last_seen_at: string; created_at: string; updated_at: string }[];
  user_roles: { id: string; user_id: string; role: string }[];
  coach_notifications: any[];
}

let initialised = false;
let store: DemoStore;

function buildStore(): DemoStore {
  const s: DemoStore = {
    workout_history: [],
    workout_sets: [],
    body_measurements: [],
    food_logs: [],
    water_intake: [],
    activity_logs: [],
    daily_logs: [],
    nutrition_goals: [],
    stretch_completions: [],
    favourite_foods: [],
    profiles: [{
      id: id(),
      user_id: DEMO_USER_ID,
      display_name: "Alex",
      avatar_url: null,
      last_seen_at: new Date().toISOString(),
      created_at: isoDaysAgo(60),
      updated_at: new Date().toISOString(),
    }],
    user_roles: [{ id: id(), user_id: DEMO_USER_ID, role: "user" }],
    coach_notifications: [],
  };

  // ── Nutrition goals ──
  s.nutrition_goals.push({
    id: id(),
    user_id: DEMO_USER_ID,
    calories: 2600,
    protein_g: 180,
    carbs_g: 290,
    fat_g: 80,
    water_goal_ml: 2500,
    tdee_age: 28,
    tdee_gender: "male",
    tdee_height_cm: 182,
    tdee_weight_kg: 78,
    tdee_activity_level: "moderate",
    tdee_goal: "maintain",
    updated_at: new Date().toISOString(),
    created_at: isoDaysAgo(30),
  });

  // ── 12 workouts across last 21 days ──
  const sessions: { dayAgo: number; workoutId: string; workoutName: string; sets: { exId: string; exName: string; reps: number; weight: number }[] }[] = [
    { dayAgo: 20, workoutId: "push", workoutName: "Push", sets: [
      { exId: "ph1", exName: "Barbell Bench Press", reps: 8, weight: 70 },
      { exId: "ph1", exName: "Barbell Bench Press", reps: 8, weight: 70 },
      { exId: "ph1", exName: "Barbell Bench Press", reps: 6, weight: 75 },
      { exId: "ph2", exName: "Overhead Press", reps: 8, weight: 45 },
      { exId: "ph2", exName: "Overhead Press", reps: 8, weight: 45 },
    ]},
    { dayAgo: 18, workoutId: "pull", workoutName: "Pull", sets: [
      { exId: "bk1", exName: "Deadlift", reps: 5, weight: 110 },
      { exId: "bk1", exName: "Deadlift", reps: 5, weight: 110 },
      { exId: "bk2", exName: "Pull-Ups", reps: 8, weight: 0 },
      { exId: "bk2", exName: "Pull-Ups", reps: 7, weight: 0 },
      { exId: "bk3", exName: "Barbell Row", reps: 10, weight: 60 },
    ]},
    { dayAgo: 16, workoutId: "legs", workoutName: "Legs", sets: [
      { exId: "lg1", exName: "Back Squat", reps: 8, weight: 90 },
      { exId: "lg1", exName: "Back Squat", reps: 8, weight: 90 },
      { exId: "lg1", exName: "Back Squat", reps: 6, weight: 95 },
      { exId: "lg2", exName: "Romanian Deadlift", reps: 10, weight: 70 },
    ]},
    { dayAgo: 13, workoutId: "push", workoutName: "Push", sets: [
      { exId: "ph1", exName: "Barbell Bench Press", reps: 8, weight: 72.5 },
      { exId: "ph1", exName: "Barbell Bench Press", reps: 8, weight: 72.5 },
      { exId: "ph1", exName: "Barbell Bench Press", reps: 6, weight: 77.5 },
      { exId: "ph2", exName: "Overhead Press", reps: 8, weight: 47.5 },
    ]},
    { dayAgo: 11, workoutId: "pull", workoutName: "Pull", sets: [
      { exId: "bk1", exName: "Deadlift", reps: 5, weight: 115 },
      { exId: "bk1", exName: "Deadlift", reps: 5, weight: 115 },
      { exId: "bk2", exName: "Pull-Ups", reps: 9, weight: 0 },
      { exId: "bk3", exName: "Barbell Row", reps: 10, weight: 62.5 },
    ]},
    { dayAgo: 9, workoutId: "legs", workoutName: "Legs", sets: [
      { exId: "lg1", exName: "Back Squat", reps: 8, weight: 92.5 },
      { exId: "lg1", exName: "Back Squat", reps: 8, weight: 92.5 },
      { exId: "lg1", exName: "Back Squat", reps: 6, weight: 100 },
      { exId: "lg2", exName: "Romanian Deadlift", reps: 10, weight: 72.5 },
    ]},
    { dayAgo: 6, workoutId: "push", workoutName: "Push", sets: [
      { exId: "ph1", exName: "Barbell Bench Press", reps: 8, weight: 75 },
      { exId: "ph1", exName: "Barbell Bench Press", reps: 8, weight: 75 },
      { exId: "ph1", exName: "Barbell Bench Press", reps: 5, weight: 80 },
      { exId: "ph2", exName: "Overhead Press", reps: 8, weight: 50 },
    ]},
    { dayAgo: 4, workoutId: "pull", workoutName: "Pull", sets: [
      { exId: "bk1", exName: "Deadlift", reps: 5, weight: 120 },
      { exId: "bk1", exName: "Deadlift", reps: 5, weight: 120 },
      { exId: "bk2", exName: "Pull-Ups", reps: 10, weight: 0 },
      { exId: "bk3", exName: "Barbell Row", reps: 10, weight: 65 },
    ]},
    { dayAgo: 2, workoutId: "legs", workoutName: "Legs", sets: [
      { exId: "lg1", exName: "Back Squat", reps: 8, weight: 95 },
      { exId: "lg1", exName: "Back Squat", reps: 8, weight: 95 },
      { exId: "lg1", exName: "Back Squat", reps: 5, weight: 105 },
      { exId: "lg2", exName: "Romanian Deadlift", reps: 10, weight: 75 },
    ]},
  ];

  sessions.forEach((sess) => {
    const wId = id();
    s.workout_history.push({
      id: wId,
      user_id: DEMO_USER_ID,
      workout_id: sess.workoutId,
      workout_name: sess.workoutName,
      date: isoDaysAgo(sess.dayAgo),
      duration: 45 + Math.floor(Math.random() * 15),
      exercises_completed: new Set(sess.sets.map(x => x.exId)).size,
      total_exercises: new Set(sess.sets.map(x => x.exId)).size,
      effort_rating: 4,
      session_notes: null,
      created_at: isoDaysAgo(sess.dayAgo),
    });
    sess.sets.forEach((st) => {
      s.workout_sets.push({
        id: id(),
        workout_history_id: wId,
        user_id: DEMO_USER_ID,
        exercise_id: st.exId,
        exercise_name: st.exName,
        reps: st.reps,
        weight: st.weight,
        created_at: isoDaysAgo(sess.dayAgo),
      });
    });
  });

  // ── Body weight (downward trend over 14 days) ──
  for (let i = 14; i >= 0; i--) {
    if (i % 2 === 0 || i < 4) {
      const weight = +(79.5 - (14 - i) * 0.11).toFixed(1);
      s.body_measurements.push({
        id: id(),
        user_id: DEMO_USER_ID,
        body_weight: weight,
        body_fat_pct: null,
        date: isoDaysAgo(i),
        notes: null,
        created_at: isoDaysAgo(i),
      });
    }
  }

  // ── 7 days of food logs ──
  const meals = [
    { meal_type: "breakfast", food_name: "Oats with banana & whey", brand: "Quaker", calories: 480, protein_g: 32, carbs_g: 65, fat_g: 9 },
    { meal_type: "breakfast", food_name: "Greek yoghurt & berries", brand: "Fage", calories: 220, protein_g: 22, carbs_g: 18, fat_g: 5 },
    { meal_type: "lunch", food_name: "Chicken & rice bowl", brand: null, calories: 680, protein_g: 55, carbs_g: 78, fat_g: 12 },
    { meal_type: "lunch", food_name: "Mixed leaf salad", brand: null, calories: 110, protein_g: 4, carbs_g: 8, fat_g: 7 },
    { meal_type: "dinner", food_name: "Salmon, sweet potato & broccoli", brand: null, calories: 720, protein_g: 48, carbs_g: 62, fat_g: 26 },
    { meal_type: "snack", food_name: "Protein shake", brand: "MyProtein", calories: 180, protein_g: 28, carbs_g: 8, fat_g: 3 },
    { meal_type: "snack", food_name: "Apple & peanut butter", brand: null, calories: 220, protein_g: 6, carbs_g: 24, fat_g: 11 },
  ];
  for (let d = 0; d < 7; d++) {
    meals.forEach((m) => {
      s.food_logs.push({
        id: id(),
        user_id: DEMO_USER_ID,
        date: daysAgo(d),
        meal_type: m.meal_type,
        food_name: m.food_name,
        brand: m.brand,
        serving_qty: 1,
        serving_size: "1 serving",
        calories: m.calories,
        protein_g: m.protein_g,
        carbs_g: m.carbs_g,
        fat_g: m.fat_g,
        sugar_g: null,
        fibre_g: null,
        saturated_fat_g: null,
        salt_g: null,
        barcode: null,
        created_at: subDays(new Date(), d).toISOString(),
      });
    });
  }

  // ── Water intake (7 days, ~2L each) ──
  for (let d = 0; d < 7; d++) {
    const glasses = d === 0 ? 4 : 8 + Math.floor(Math.random() * 2);
    for (let g = 0; g < glasses; g++) {
      s.water_intake.push({
        id: id(),
        user_id: DEMO_USER_ID,
        date: daysAgo(d),
        amount_ml: 250,
        created_at: subDays(new Date(), d).toISOString(),
      });
    }
  }

  // ── Activity logs ──
  [3, 7, 12, 17].forEach((d) => {
    s.activity_logs.push({
      id: id(),
      user_id: DEMO_USER_ID,
      date: daysAgo(d),
      activity_type: d === 3 ? "running" : d === 7 ? "rest" : d === 12 ? "football" : "cycling",
      label: d === 3 ? "Running" : d === 7 ? "Rest Day" : d === 12 ? "Football" : "Cycling",
      duration: d === 7 ? 0 : 45,
      notes: null,
      created_at: isoDaysAgo(d),
    });
  });

  // ── Daily logs (completed days for past 6 days, skip today) ──
  for (let d = 1; d <= 6; d++) {
    const dayMeals = s.food_logs.filter(f => f.date === daysAgo(d));
    const totals = dayMeals.reduce(
      (a, m) => ({
        calories: a.calories + m.calories,
        protein_g: a.protein_g + m.protein_g,
        carbs_g: a.carbs_g + m.carbs_g,
        fat_g: a.fat_g + m.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
    const water = s.water_intake.filter(w => w.date === daysAgo(d)).reduce((sum, w) => sum + w.amount_ml, 0);
    const wt = s.body_measurements.find(b => b.date.startsWith(daysAgo(d)));
    s.daily_logs.push({
      id: id(),
      user_id: DEMO_USER_ID,
      date: daysAgo(d),
      calories: Math.round(totals.calories),
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
      water_ml: water,
      calorie_goal: 2600,
      protein_goal_g: 180,
      carbs_goal_g: 290,
      fat_goal_g: 80,
      water_goal_ml: 2500,
      weight_kg: wt?.body_weight ?? null,
      created_at: isoDaysAgo(d),
    });
  }

  return s;
}

export function getDemoStore(): DemoStore {
  if (!initialised) {
    store = buildStore();
    initialised = true;
  }
  return store;
}

export function resetDemoStore(): void {
  initialised = false;
  nextId = 1;
}

export function demoInsert(table: keyof DemoStore, row: any): any {
  const s = getDemoStore();
  const newRow = {
    id: row.id ?? id(),
    created_at: row.created_at ?? new Date().toISOString(),
    ...row,
  };
  (s[table] as any[]).push(newRow);
  return newRow;
}

export function demoDelete(table: keyof DemoStore, predicate: (row: any) => boolean): number {
  const s = getDemoStore();
  const before = (s[table] as any[]).length;
  (s as any)[table] = (s[table] as any[]).filter((r) => !predicate(r));
  return before - (s[table] as any[]).length;
}

export function demoUpdate(table: keyof DemoStore, predicate: (row: any) => boolean, patch: any): number {
  const s = getDemoStore();
  let count = 0;
  (s[table] as any[]).forEach((r) => {
    if (predicate(r)) {
      Object.assign(r, patch);
      count++;
    }
  });
  return count;
}
