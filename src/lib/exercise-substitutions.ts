/**
 * Exercise substitution map.
 * Each key is an exercise ID from workout-data.ts.
 * Values are arrays of substitute exercises (at least 2 per exercise).
 * Substitutes hit the same muscle groups and use similar equipment.
 */

import type { Exercise } from "./workout-data";

export type SubstituteExercise = Omit<Exercise, "sets" | "reps"> & {
  description: string;
};

// Substitutes inherit the sets/reps of the exercise they replace.
export const EXERCISE_SUBSTITUTIONS: Record<string, SubstituteExercise[]> = {
  // ── Explosive Power ──
  pw1: [ // Box Jumps
    { id: "sub-pw1a", name: "Squat Jumps", targetMuscle: "Explosive Power", notes: "Full squat then jump max height, soft landing", trackWeight: false, repLabel: "Reps", description: "Bodyweight squat to max height jump" },
    { id: "sub-pw1b", name: "Tuck Jumps", targetMuscle: "Explosive Power", notes: "Jump high, tuck knees to chest at peak", trackWeight: false, repLabel: "Reps", description: "Jump and tuck knees to chest" },
  ],
  pw2: [ // Depth Jumps
    { id: "sub-pw2a", name: "Drop Jumps", targetMuscle: "Reactive Power", notes: "Step off lower box, immediately rebound max height", trackWeight: false, repLabel: "Reps", description: "Lower box reactive jump variation" },
    { id: "sub-pw2b", name: "Hurdle Hops", targetMuscle: "Reactive Power", notes: "Consecutive hops over low hurdles, minimise ground contact", trackWeight: false, repLabel: "Reps", description: "Consecutive plyometric hurdle hops" },
  ],
  pw3: [ // Med Ball Slam
    { id: "sub-pw3a", name: "Med Ball Overhead Throw", targetMuscle: "Core Power", notes: "Throw ball overhead backwards for distance", description: "Explosive overhead backward throw" },
    { id: "sub-pw3b", name: "Battle Rope Slams", targetMuscle: "Core Power", notes: "Alternating or double arm slams, max intensity", trackWeight: false, repLabel: "Reps", description: "High-intensity rope slams" },
  ],
  pw4: [ // Single-Leg Broad Jump
    { id: "sub-pw4a", name: "Single-Leg Box Jump", targetMuscle: "Unilateral Power", notes: "Jump onto box from one leg, step down", trackWeight: false, repLabel: "Reps", description: "Single-leg explosive box jump" },
    { id: "sub-pw4b", name: "Bounding", targetMuscle: "Unilateral Power", notes: "Exaggerated running leaps, max distance per stride", trackWeight: false, repLabel: "Reps", description: "Alternating exaggerated leaps for distance" },
  ],
  pw7: [ // Lateral Bounds
    { id: "sub-pw7a", name: "Skater Jumps", targetMuscle: "Lateral Power", notes: "Side-to-side jumps, reach across with opposite hand", trackWeight: false, repLabel: "Reps", description: "Dynamic lateral skater-style jumps" },
    { id: "sub-pw7b", name: "Lateral Hurdle Hops", targetMuscle: "Lateral Power", notes: "Hop sideways over low hurdle, stick landing", trackWeight: false, repLabel: "Reps", description: "Lateral plyometric hurdle hops" },
  ],
  pw5: [ // Kettlebell Swing
    { id: "sub-pw5a", name: "Dumbbell Swing", targetMuscle: "Hip Power", notes: "Same hip-hinge pattern as KB swing, use single dumbbell", description: "Dumbbell hip-snap swing" },
    { id: "sub-pw5b", name: "Kettlebell Clean", targetMuscle: "Hip Power", notes: "Explosive hip drive, catch at rack position", description: "Explosive kettlebell clean" },
  ],
  pw6: [ // Plyo Push-Up
    { id: "sub-pw6a", name: "Clap Push-Up", targetMuscle: "Upper Body Reactive", notes: "Explosive push, clap hands, land soft", trackWeight: false, repLabel: "Reps", description: "Explosive clapping push-up" },
    { id: "sub-pw6b", name: "Med Ball Push-Up", targetMuscle: "Upper Body Reactive", notes: "Hands on med ball, alternate hands each rep", trackWeight: false, repLabel: "Reps", description: "Push-up with hands on medicine ball" },
  ],

  // ── Agility ──
  ag1: [ // Lateral Shuffle
    { id: "sub-ag1a", name: "Defensive Slide", targetMuscle: "Lateral Speed", notes: "Low athletic stance, stay in quarter squat", trackWeight: false, repLabel: "Sec", description: "Basketball-style defensive slide drill" },
    { id: "sub-ag1b", name: "Lateral Band Walk", targetMuscle: "Lateral Speed", notes: "Mini band above knees, stay low, constant tension", trackWeight: false, repLabel: "Sec", description: "Resistance band lateral walk" },
  ],
  ag2: [ // T-Drill
    { id: "sub-ag2a", name: "5-10-5 Pro Agility", targetMuscle: "Change of Direction", notes: "Sprint 5yd, turn, 10yd, turn, 5yd", trackWeight: false, repLabel: "Sec", description: "Pro agility shuttle drill" },
    { id: "sub-ag2b", name: "L-Drill", targetMuscle: "Change of Direction", notes: "Sprint, change direction in L-shape pattern", trackWeight: false, repLabel: "Sec", description: "L-shaped change of direction drill" },
  ],
  ag3: [ // Ladder Drills
    { id: "sub-ag3a", name: "Quick Feet Taps", targetMuscle: "Foot Speed", notes: "Rapid alternating toe taps on step or ball", trackWeight: false, repLabel: "Rounds", description: "Rapid foot taps on low platform" },
    { id: "sub-ag3b", name: "Dot Drill", targetMuscle: "Foot Speed", notes: "Jump between dots in specific pattern, max speed", trackWeight: false, repLabel: "Rounds", description: "5-dot pattern foot speed drill" },
  ],
  ag4: [ // Lateral Bound
    { id: "sub-ag4a", name: "Skater Jumps", targetMuscle: "Lateral Power", notes: "Side-to-side jumps, reach across with opposite hand", trackWeight: false, repLabel: "Reps", description: "Dynamic lateral skater-style jumps" },
    { id: "sub-ag4b", name: "Single-Leg Lateral Hop", targetMuscle: "Lateral Power", notes: "Hop sideways on one leg, stick each landing 1s", trackWeight: false, repLabel: "Reps", description: "Single-leg sideways hops" },
  ],
  ag5: [ // Reactive Ball Drop
    { id: "sub-ag5a", name: "Reaction Light Drill", targetMuscle: "Reaction Time", notes: "React to visual cue, tap light as fast as possible", trackWeight: false, repLabel: "Reps", description: "Visual stimulus reaction drill" },
    { id: "sub-ag5b", name: "Mirror Drill", targetMuscle: "Reaction Time", notes: "Partner leads, you mirror their movements", trackWeight: false, repLabel: "Reps", description: "Partner mirror reaction drill" },
  ],
  ag6: [ // Carioca
    { id: "sub-ag6a", name: "Side Shuffle with Cross-Over", targetMuscle: "Hip Mobility", notes: "Shuffle with high-knee crossover step every 3rd step", trackWeight: false, repLabel: "Metres", description: "Shuffle with crossover step" },
    { id: "sub-ag6b", name: "Hip Circle Walk", targetMuscle: "Hip Mobility", notes: "Walk forward, circle each leg outward with each step", trackWeight: false, repLabel: "Metres", description: "Walking hip circles for mobility" },
  ],

  // ── GK Strength ──
  st1: [ // Goblet Squat
    { id: "sub-st1a", name: "Dumbbell Front Squat", targetMuscle: "Quads/Glutes", notes: "Dumbbells on shoulders, squat deep", description: "Front-loaded dumbbell squat" },
    { id: "sub-st1b", name: "Kettlebell Goblet Squat", targetMuscle: "Quads/Glutes", notes: "Kettlebell at chest, sit deep into squat", description: "Kettlebell goblet squat variation" },
  ],
  st2: [ // Romanian Deadlift (DB)
    { id: "sub-st2a", name: "Single-Leg Dumbbell RDL", targetMuscle: "Hamstrings", notes: "One leg, hinge forward, slow 3s negative", description: "Unilateral dumbbell Romanian deadlift" },
    { id: "sub-st2b", name: "Dumbbell Stiff-Leg Deadlift", targetMuscle: "Hamstrings", notes: "Legs straighter than RDL, deep stretch", description: "Stiff-leg deadlift with dumbbells" },
  ],
  st3: [ // Bulgarian Split Squat
    { id: "sub-st3a", name: "Reverse Lunge (DB)", targetMuscle: "Single-Leg Strength", notes: "Step back into lunge, drive through front heel", description: "Dumbbell reverse lunge" },
    { id: "sub-st3b", name: "Step-Up (DB)", targetMuscle: "Single-Leg Strength", notes: "Step onto bench, drive up, control descent", description: "Dumbbell step-up on bench" },
  ],
  st4: [ // Nordic Hamstring Curl
    { id: "sub-st4a", name: "Slider Leg Curl", targetMuscle: "Hamstring Resilience", notes: "Lie on back, curl heels in on sliders", trackWeight: false, repLabel: "Reps", description: "Supine hamstring slider curl" },
    { id: "sub-st4b", name: "Swiss Ball Hamstring Curl", targetMuscle: "Hamstring Resilience", notes: "Feet on ball, hips up, curl ball toward glutes", trackWeight: false, repLabel: "Reps", description: "Stability ball hamstring curl" },
  ],
  st5: [ // Copenhagen Adductor
    { id: "sub-st5a", name: "Side-Lying Adductor Raise", targetMuscle: "Groin/Adductors", notes: "Lie on side, raise bottom leg, squeeze adductors", trackWeight: false, repLabel: "Reps", description: "Side-lying bottom leg raise" },
    { id: "sub-st5b", name: "Cable Hip Adduction", targetMuscle: "Groin/Adductors", notes: "Ankle strap, pull leg inward across body", description: "Cable adductor pull" },
  ],
  st6: [ // Dead Bug
    { id: "sub-st6a", name: "Bird Dog", targetMuscle: "Core Stability", notes: "Opposite arm/leg extension, keep hips level", trackWeight: false, repLabel: "Reps", description: "Quadruped opposite limb extension" },
    { id: "sub-st6b", name: "Pallof Press", targetMuscle: "Core Stability", notes: "Anti-rotation cable press, hold 2s extended", description: "Cable anti-rotation press" },
  ],

  // ── Reflexes & Upper Body ──
  rf1: [ // Med Ball Chest Pass
    { id: "sub-rf1a", name: "Med Ball Rotational Throw", targetMuscle: "Throwing Power", notes: "Side-on to wall, rotate and throw at chest height", description: "Rotational medicine ball wall throw" },
    { id: "sub-rf1b", name: "Med Ball Push Pass", targetMuscle: "Throwing Power", notes: "Kneeling chest pass, explosive from chest", description: "Kneeling explosive chest pass" },
  ],
  rf2: [ // Face Pulls
    { id: "sub-rf2a", name: "Band Pull-Apart", targetMuscle: "Rear Delts/Posture", notes: "Pull band apart at chest height, squeeze shoulder blades", trackWeight: false, repLabel: "Reps", description: "Resistance band horizontal pull-apart" },
    { id: "sub-rf2b", name: "Prone Y-Raise", targetMuscle: "Rear Delts/Posture", notes: "Lie face down on incline bench, raise arms in Y shape", description: "Incline bench prone Y-raise" },
  ],
  rf3: [ // Farmer's Walk
    { id: "sub-rf3a", name: "Dead Hang", targetMuscle: "Grip Strength", notes: "Hang from pull-up bar, max time, squeeze hard", repLabel: "Sec", description: "Pull-up bar dead hang for grip" },
    { id: "sub-rf3b", name: "Plate Pinch Walk", targetMuscle: "Grip Strength", notes: "Pinch two plates together, walk for distance", repLabel: "Metres", description: "Walk while pinching weight plates" },
  ],
  rf4: [ // Wrist Curls (DB)
    { id: "sub-rf4a", name: "Reverse Wrist Curls (DB)", targetMuscle: "Wrist Strength", notes: "Palms down, curl wrists up for extensors", description: "Dumbbell reverse wrist curl" },
    { id: "sub-rf4b", name: "Wrist Roller", targetMuscle: "Wrist Strength", notes: "Roll weight up and down with wrist rotation", description: "Wrist roller for forearm strength" },
  ],
  rf5: [ // Overhead DB Press
    { id: "sub-rf5a", name: "Arnold Press", targetMuscle: "Shoulders", notes: "Rotating press — palms in to palms out at top", description: "Rotating dumbbell shoulder press" },
    { id: "sub-rf5b", name: "Seated Dumbbell Press", targetMuscle: "Shoulders", notes: "Seated, press dumbbells to full lockout", description: "Seated overhead dumbbell press" },
  ],
  rf6: [ // Plank Shoulder Taps
    { id: "sub-rf6a", name: "Renegade Row", targetMuscle: "Core/Stability", notes: "Plank position, row dumbbell each side, resist rotation", description: "Plank with alternating dumbbell rows" },
    { id: "sub-rf6b", name: "Bear Crawl", targetMuscle: "Core/Stability", notes: "Crawl forward/backward, knees 1 inch off ground", trackWeight: false, repLabel: "Reps", description: "Low bear crawl for core stability" },
  ],

  // ── Push ──
  pu1: [ // 45° Incline DB Bench Press
    { id: "sub-pu1a", name: "Incline Barbell Bench Press", targetMuscle: "Upper Chest", notes: "45° incline, barbell variation", description: "Barbell press at 45° incline" },
    { id: "sub-pu1b", name: "Incline Smith Machine Press", targetMuscle: "Upper Chest", notes: "45° incline on Smith machine, controlled reps", description: "Smith machine incline press" },
  ],
  pu2: [ // Dumbbell Lateral Raises
    { id: "sub-pu2a", name: "Cable Lateral Raise", targetMuscle: "Side Delts", notes: "Single arm, constant tension from cable", description: "Cable single-arm lateral raise" },
    { id: "sub-pu2b", name: "Machine Lateral Raise", targetMuscle: "Side Delts", notes: "Machine variation, focus on contraction at top", description: "Machine lateral raise" },
  ],
  pu3: [ // 15° Incline DB Bench Press
    { id: "sub-pu3a", name: "Low Incline Barbell Bench Press", targetMuscle: "Upper Chest", notes: "15° incline, barbell variation", description: "Low incline barbell bench press" },
    { id: "sub-pu3b", name: "Incline Dumbbell Squeeze Press", targetMuscle: "Upper Chest", notes: "15° incline, press dumbbells together throughout", description: "Incline squeeze press for inner chest" },
  ],
  pu4: [ // Flat Dumbbell Flies
    { id: "sub-pu4a", name: "Cable Crossover Flies", targetMuscle: "Chest", notes: "Cables from high position, cross at bottom", description: "High-to-low cable crossover flies" },
    { id: "sub-pu4b", name: "Pec Deck Machine", targetMuscle: "Chest", notes: "Machine fly, squeeze and hold at peak contraction", description: "Pec deck machine fly" },
  ],
  pu5: [ // X-Over Cable Tricep Extensions
    { id: "sub-pu5a", name: "Tricep Pushdown", targetMuscle: "Triceps", notes: "Rope attachment, spread at the bottom", description: "Cable rope tricep pushdown" },
    { id: "sub-pu5b", name: "Tricep Pushdown", targetMuscle: "Triceps", notes: "Straight or EZ bar attachment, strict elbows", description: "Cable straight bar tricep pushdown" },
  ],
  pu6: [ // Single Arm Overhead Cable Tricep Extensions
    { id: "sub-pu6a", name: "Overhead Dumbbell Tricep Extension", targetMuscle: "Triceps", notes: "Single arm, lower behind head, full stretch", description: "Single-arm overhead dumbbell extension" },
    { id: "sub-pu6b", name: "Cable Kickback", targetMuscle: "Triceps", notes: "Hinge forward, extend arm back, squeeze at top", description: "Single-arm cable tricep kickback" },
  ],

  // ── Pull ──
  pl1: [ // Seated Row Machine
    { id: "sub-pl1a", name: "Cable Seated Row - Wide Grip", targetMuscle: "Mid Back", notes: "Wide grip bar, pull to lower chest", description: "Wide-grip cable seated row" },
    { id: "sub-pl1b", name: "Chest-Supported Row Machine", targetMuscle: "Mid Back", notes: "Chest pad supported, isolate back muscles", description: "Chest-supported machine row" },
  ],
  pl2: [ // T-Bar Row
    { id: "sub-pl2a", name: "Barbell Bent-Over Row", targetMuscle: "Back Thickness", notes: "Overhand grip, row to lower chest", description: "Classic barbell bent-over row" },
    { id: "sub-pl2b", name: "Meadows Row", targetMuscle: "Back Thickness", notes: "Single arm landmine row, squeeze at top", description: "Landmine single-arm Meadows row" },
  ],
  pl3: [ // Lat Pull Down - Pronated
    { id: "sub-pl3a", name: "Lat Pull Down - Supinated Grip", targetMuscle: "Lats", notes: "Underhand grip, pull to upper chest, squeeze lats", description: "Supinated (underhand) lat pulldown" },
    { id: "sub-pl3b", name: "Straight-Arm Pulldown", targetMuscle: "Lats", notes: "Arms straight, pull bar to thighs, feel lats stretch", description: "Cable straight-arm lat pulldown" },
  ],
  "lib-13": [ // Face Pulls with Rope
    { id: "sub-pl4a", name: "Band Pull-Apart", targetMuscle: "Rear Delts", notes: "Pull band apart at chest height, squeeze shoulder blades", trackWeight: false, repLabel: "Reps", description: "Resistance band horizontal pull-apart" },
    { id: "sub-pl4b", name: "Single Arm Cross Body Reverse Fly", targetMuscle: "Rear Delts", notes: "Cable at mid height, pull across body to rear delt", description: "Single-arm cable cross-body reverse fly" },
  ],
  pl5: [ // Dumbbell Preacher Curls
    { id: "sub-pl5a", name: "EZ Bar Preacher Curl", targetMuscle: "Biceps", notes: "EZ bar on preacher bench, full range of motion", description: "EZ bar preacher curl" },
    { id: "sub-pl5b", name: "Machine Preacher Curl", targetMuscle: "Biceps", notes: "Preacher curl machine, controlled eccentric", description: "Machine preacher curl" },
  ],
  pl6: [ // Dumbbell Preacher Hammer Curls
    { id: "sub-pl6a", name: "Cross-Body Hammer Curl", targetMuscle: "Biceps", notes: "Curl dumbbell across body, neutral grip", description: "Cross-body dumbbell hammer curl" },
    { id: "sub-pl6b", name: "Cable Hammer Curl", targetMuscle: "Biceps", notes: "Rope attachment on low cable, hammer grip curl", description: "Cable rope hammer curl" },
  ],

  // ── Legs ──
  lg1: [ // Laying Hamstring Curl
    { id: "sub-lg1a", name: "Seated Hamstring Curl", targetMuscle: "Hamstrings", notes: "Seated machine curl, squeeze at bottom", description: "Seated machine hamstring curl" },
    { id: "sub-lg1b", name: "Single-Leg Lying Curl", targetMuscle: "Hamstrings", notes: "One leg at a time, focus on contraction", description: "Single-leg lying hamstring curl" },
  ],
  lg2: [ // Barbell RDL
    { id: "sub-lg2a", name: "Dumbbell RDL", targetMuscle: "Hamstrings/Glutes", notes: "Dumbbells along legs, hinge at hips", description: "Romanian deadlift with dumbbells" },
    { id: "sub-lg2b", name: "Trap Bar RDL", targetMuscle: "Hamstrings/Glutes", notes: "Trap/hex bar, hinge pattern, neutral grip", description: "Trap bar Romanian deadlift" },
  ],
  lg3: [ // Bulgarian Split Squats
    { id: "sub-lg3a", name: "Walking Lunges (DB)", targetMuscle: "Quads/Glutes", notes: "Step forward alternating, dumbbells at sides", description: "Dumbbell walking lunges" },
    { id: "sub-lg3b", name: "Reverse Lunge (DB)", targetMuscle: "Quads/Glutes", notes: "Step back into lunge, drive through front heel", description: "Dumbbell reverse lunge" },
  ],
  lg4: [ // Goblet Squat - To Bench
    { id: "sub-lg4a", name: "Box Squat (DB/KB)", targetMuscle: "Quads", notes: "Squat to box/bench height, pause, drive up", description: "Dumbbell or kettlebell box squat" },
    { id: "sub-lg4b", name: "Leg Press (Narrow Stance)", targetMuscle: "Quads", notes: "Feet close together on leg press, quad focus", description: "Narrow stance leg press" },
  ],
  lg5: [ // Leg Extension
    { id: "sub-lg5a", name: "Sissy Squat", targetMuscle: "Quads", notes: "Lean back, bend knees, isolate quads", trackWeight: false, repLabel: "Reps", description: "Bodyweight sissy squat for quad isolation" },
    { id: "sub-lg5b", name: "Single-Leg Extension", targetMuscle: "Quads", notes: "One leg at a time for balanced development", description: "Unilateral machine leg extension" },
  ],
  lg6: [ // Seated Calf Raise
    { id: "sub-lg6a", name: "Standing Calf Raise", targetMuscle: "Calves", notes: "Standing machine or Smith machine, full range", description: "Standing machine calf raise" },
    { id: "sub-lg6b", name: "Single-Leg Calf Raise (DB)", targetMuscle: "Calves", notes: "One leg on step, hold dumbbell, full stretch at bottom", description: "Single-leg dumbbell calf raise" },
  ],

  // ── Upper ──
  up1: [ // Seated Cable Row
    { id: "sub-up1a", name: "Seated Cable Row - Wide Grip", targetMuscle: "Mid Back", notes: "Wide grip bar, pull to lower chest", description: "Wide-grip cable seated row" },
    { id: "sub-up1b", name: "Chest-Supported Dumbbell Row", targetMuscle: "Mid Back", notes: "Lie chest down on incline bench, row dumbbells", description: "Incline chest-supported dumbbell row" },
  ],
  up2: [ // Lat Pull Down - V Bar
    { id: "sub-up2a", name: "Close-Grip Lat Pulldown", targetMuscle: "Lats", notes: "Supinated close grip, focus on lat squeeze", description: "Close-grip lat pulldown variation" },
    { id: "sub-up2b", name: "Single-Arm Cable Pulldown", targetMuscle: "Lats", notes: "One arm at a time, full stretch and squeeze", description: "Unilateral cable lat pulldown" },
  ],
  up3: [ // Flat DB Bench Press
    { id: "sub-up3a", name: "Flat Barbell Bench Press", targetMuscle: "Chest", notes: "Classic barbell bench, moderate grip width", description: "Barbell flat bench press" },
    { id: "sub-up3b", name: "Dumbbell Floor Press", targetMuscle: "Chest", notes: "Lie on floor, press dumbbells, limited ROM protects shoulders", description: "Floor dumbbell press" },
  ],
  up4: [ // Cable Flies To Thighs
    { id: "sub-up4a", name: "Decline Dumbbell Flies", targetMuscle: "Lower Chest", notes: "Slight decline bench, fly motion targeting lower chest", description: "Decline bench dumbbell flies" },
    { id: "sub-up4b", name: "Dip Machine (Chest Focus)", targetMuscle: "Lower Chest", notes: "Lean forward on assisted dip machine, lower chest focus", description: "Machine dip targeting lower chest" },
  ],
  up5: [ // Converging Shoulder Press Machine
    { id: "sub-up5a", name: "Dumbbell Shoulder Press", targetMuscle: "Shoulders", notes: "Seated or standing, press to full lockout", description: "Dumbbell overhead shoulder press" },
    { id: "sub-up5b", name: "Smith Machine Shoulder Press", targetMuscle: "Shoulders", notes: "Seated Smith machine press, controlled reps", description: "Smith machine overhead press" },
  ],
  up6: [ // Dumbbell Preacher Curls (same subs as pl5)
    { id: "sub-up6a", name: "EZ Bar Preacher Curl", targetMuscle: "Biceps", notes: "EZ bar on preacher bench, full range of motion", description: "EZ bar preacher curl" },
    { id: "sub-up6b", name: "Machine Preacher Curl", targetMuscle: "Biceps", notes: "Preacher curl machine, controlled eccentric", description: "Machine preacher curl" },
  ],
  up7: [ // Dumbbell Preacher Hammer Curls (same subs as pl6)
    { id: "sub-up7a", name: "Cross-Body Hammer Curl", targetMuscle: "Biceps", notes: "Curl dumbbell across body, neutral grip", description: "Cross-body dumbbell hammer curl" },
    { id: "sub-up7b", name: "Cable Hammer Curl", targetMuscle: "Biceps", notes: "Rope attachment on low cable, hammer grip curl", description: "Cable rope hammer curl" },
  ],
  up8: [ // Tricep Push Down - Rope
    { id: "sub-up8a", name: "Tricep Pushdown", targetMuscle: "Triceps", notes: "V-bar attachment, lock elbows, squeeze at bottom", description: "V-bar cable tricep pushdown" },
    { id: "sub-up8b", name: "Dumbbell Skull Crusher", targetMuscle: "Triceps", notes: "Lie flat, lower dumbbells to forehead, extend", description: "Lying dumbbell skull crushers" },
  ],

  // ── Full Body ─────────────────────────────────────────────────────────────
  fb1: [ // Barbell Back Squat
    { id: "sub-fb1a", name: "Goblet Squat", targetMuscle: "Quads/Glutes", notes: "Dumbbell or kettlebell at chest, squat deep — great if no barbell available", description: "Front-loaded goblet squat" },
    { id: "sub-fb1b", name: "Leg Press", targetMuscle: "Quads/Glutes", notes: "Medium foot placement, full range of motion, don't lock knees", description: "Leg press machine" },
  ],
  fb2: [ // Romanian Deadlift
    { id: "sub-fb2a", name: "Single-Leg Dumbbell RDL", targetMuscle: "Hamstrings/Glutes", notes: "Same hinge pattern, one leg — great for balance and unilateral strength", description: "Unilateral dumbbell Romanian deadlift" },
    { id: "sub-fb2b", name: "Good Morning", targetMuscle: "Hamstrings/Glutes", notes: "Barbell on back, hinge at hips until bar feels heavy — keep spine neutral", description: "Barbell good morning" },
  ],
  fb3: [ // Flat Barbell Bench Press
    { id: "sub-fb3a", name: "Flat Dumbbell Bench Press", targetMuscle: "Chest", notes: "Dumbbells allow more range of motion at the bottom — great if no barbell", description: "Flat bench dumbbell press" },
    { id: "sub-fb3b", name: "Push-Ups", targetMuscle: "Chest", notes: "Bodyweight variation — add weight vest or elevate feet to increase difficulty", trackWeight: false, repLabel: "Reps", description: "Weighted or bodyweight push-ups" },
  ],
  fb4: [ // Barbell Row
    { id: "sub-fb4a", name: "Single Arm Dumbbell Row", targetMuscle: "Back", notes: "Brace on bench, pull dumbbell to hip — great unilateral alternative", description: "Single-arm dumbbell row" },
    { id: "sub-fb4b", name: "Seated Cable Row", targetMuscle: "Back", notes: "Cable row with V-bar, pull to lower chest, squeeze shoulder blades", description: "Cable seated row with V-bar" },
  ],
  fb5: [ // Overhead Press
    { id: "sub-fb5a", name: "Dumbbell Shoulder Press", targetMuscle: "Shoulders", notes: "Seated or standing, press to full lockout — easier to balance than barbell", description: "Dumbbell overhead shoulder press" },
    { id: "sub-fb5b", name: "Arnold Press", targetMuscle: "Shoulders", notes: "Rotating press from neutral to pronated — hits all three delt heads", description: "Arnold rotating dumbbell press" },
  ],
  fb6: [ // Dumbbell Lateral Raises
    { id: "sub-fb6a", name: "Cable Lateral Raise", targetMuscle: "Side Delts", notes: "Single arm, low pulley — constant tension throughout the movement", description: "Single-arm cable lateral raise" },
    { id: "sub-fb6b", name: "Machine Lateral Raise", targetMuscle: "Side Delts", notes: "Machine variation — great for feeling the contraction at the top", description: "Lateral raise machine" },
  ],

  // ── 5/3/1 Squat Day ──────────────────────────────────────────────────────
  sq1: [ // Barbell Back Squat
    { id: "sub-sq1a", name: "Front Squat", targetMuscle: "Quads/Glutes", notes: "Barbell in front rack — more upright torso, great quad emphasis", description: "Barbell front squat" },
    { id: "sub-sq1b", name: "Goblet Squat", targetMuscle: "Quads/Glutes", notes: "Dumbbell at chest — perfect if lower back is fatigued from main work", description: "Goblet squat with dumbbell" },
  ],
  sq2: [ // Front Squat
    { id: "sub-sq2a", name: "Barbell Back Squat", targetMuscle: "Quads", notes: "Switch to back squat if front rack position is uncomfortable", description: "Classic barbell back squat" },
    { id: "sub-sq2b", name: "Hack Squat Machine", targetMuscle: "Quads", notes: "Machine hack squat — upright torso, excellent quad isolation", description: "Hack squat machine" },
  ],
  sq3: [ // Leg Press
    { id: "sub-sq3a", name: "Goblet Squat", targetMuscle: "Quads/Glutes", notes: "Bodyweight-friendly alternative, sit deep with upright torso", description: "Goblet squat" },
    { id: "sub-sq3b", name: "Bulgarian Split Squat", targetMuscle: "Quads/Glutes", notes: "Rear foot elevated, front leg drives — great unilateral quad strength", description: "Bulgarian split squat" },
  ],
  sq4: [ // Leg Extension
    { id: "sub-sq4a", name: "Sissy Squat", targetMuscle: "Quads", notes: "Lean back on toes, lower toward ground — advanced quad isolation", trackWeight: false, repLabel: "Reps", description: "Bodyweight sissy squat" },
    { id: "sub-sq4b", name: "Single-Leg Extension", targetMuscle: "Quads", notes: "One leg at a time for equal development on both sides", description: "Unilateral leg extension" },
  ],
  sq5: [ // Walking Lunges
    { id: "sub-sq5a", name: "Reverse Lunge (DB)", targetMuscle: "Quads/Glutes", notes: "Step back instead of forward — easier on knees, same muscles", description: "Dumbbell reverse lunge" },
    { id: "sub-sq5b", name: "Bulgarian Split Squat", targetMuscle: "Quads/Glutes", notes: "Rear foot elevated on bench — maximum single-leg strength stimulus", description: "Bulgarian split squat" },
  ],
  sq6: [ // Seated Hamstring Curl
    { id: "sub-sq6a", name: "Lying Hamstring Curl", targetMuscle: "Hamstrings", notes: "Prone machine curl — slightly different hamstring activation angle", description: "Lying machine hamstring curl" },
    { id: "sub-sq6b", name: "Nordic Hamstring Curl", targetMuscle: "Hamstrings", notes: "Eccentric-only — anchor feet, lower body toward ground under control", trackWeight: false, repLabel: "Reps", description: "Nordic hamstring curl" },
  ],

  // ── 5/3/1 Bench Day ──────────────────────────────────────────────────────
  bn1: [ // Flat Barbell Bench Press
    { id: "sub-bn1a", name: "Flat Dumbbell Bench Press", targetMuscle: "Chest", notes: "Dumbbells allow greater ROM at the bottom — great if no spotter available", description: "Flat dumbbell bench press" },
    { id: "sub-bn1b", name: "Smith Machine Bench Press", targetMuscle: "Chest", notes: "Fixed path press — useful if training alone without a spotter", description: "Smith machine flat bench press" },
  ],
  bn2: [ // Incline Barbell Bench Press
    { id: "sub-bn2a", name: "45° Incline Dumbbell Bench Press", targetMuscle: "Upper Chest", notes: "Dumbbell variation allows more natural shoulder rotation", description: "Incline dumbbell press at 45°" },
    { id: "sub-bn2b", name: "Incline Smith Machine Press", targetMuscle: "Upper Chest", notes: "Controlled path — solid if no spotter", description: "Incline Smith machine press" },
  ],
  bn3: [ // 45° Incline Dumbbell Bench Press
    { id: "sub-bn3a", name: "Incline Barbell Bench Press", targetMuscle: "Upper Chest", notes: "Barbell variation — allows heavier loads for progressive overload", description: "Incline barbell bench press" },
    { id: "sub-bn3b", name: "Incline Cable Press", targetMuscle: "Upper Chest", notes: "Cable provides constant tension through full ROM", description: "Incline cable chest press" },
  ],
  bn4: [ // Cable Fly
    { id: "sub-bn4a", name: "Flat Dumbbell Flies", targetMuscle: "Chest", notes: "Classic dumbbell fly — great stretch at the bottom", description: "Flat dumbbell chest fly" },
    { id: "sub-bn4b", name: "Pec Deck Machine", targetMuscle: "Chest", notes: "Machine fly — squeeze and hold at peak contraction", description: "Pec deck fly machine" },
  ],
  bn5: [ // Skull Crushers
    { id: "sub-bn5a", name: "Overhead Dumbbell Tricep Extension", targetMuscle: "Triceps", notes: "Single or double arm overhead — great long head stretch", description: "Overhead dumbbell tricep extension" },
    { id: "sub-bn5b", name: "Close-Grip Bench Press", targetMuscle: "Triceps", notes: "Hands shoulder-width, same pressing mechanics — heavier alternative", description: "Close-grip barbell bench press" },
  ],
  bn6: [ // X-Over Cable Tricep Extensions
    { id: "sub-bn6a", name: "Tricep Pushdown", targetMuscle: "Triceps", notes: "Rope attachment, spread rope at the bottom for extra contraction", description: "Cable rope tricep pushdown" },
    { id: "sub-bn6b", name: "Cable Kickback", targetMuscle: "Triceps", notes: "Hinge forward, extend arm back fully, squeeze at top", description: "Single-arm cable tricep kickback" },
  ],

  // ── 5/3/1 Deadlift Day ───────────────────────────────────────────────────
  dl1: [ // Conventional Deadlift
    { id: "sub-dl1a", name: "Romanian Deadlift", targetMuscle: "Full Posterior Chain", notes: "Hinge-focused variation — less quad, more hamstring and glute", description: "Romanian deadlift" },
    { id: "sub-dl1b", name: "Trap Bar Deadlift", targetMuscle: "Full Posterior Chain", notes: "More upright torso, easier on lower back — great for high reps", description: "Trap bar (hex bar) deadlift" },
  ],
  dl2: [ // Rack Pull
    { id: "sub-dl2a", name: "Barbell Shrugs", targetMuscle: "Upper Back/Traps", notes: "Isolate the traps — heavy shrugs with 1s hold at top", description: "Heavy barbell shrug" },
    { id: "sub-dl2b", name: "Deficit Deadlift", targetMuscle: "Upper Back/Traps", notes: "Stand on plates, additional range of motion — builds off-the-floor strength", description: "Deficit deadlift for increased ROM" },
  ],
  dl3: [ // Barbell Row
    { id: "sub-dl3a", name: "Single Arm Dumbbell Row", targetMuscle: "Mid Back", notes: "Each side independently — brace on bench, pull to hip", description: "Single-arm dumbbell row" },
    { id: "sub-dl3b", name: "T-Bar Row", targetMuscle: "Mid Back", notes: "Landmine or T-bar machine — great for thickness with heavy loads", description: "T-bar row" },
  ],
  dl4: [ // Lat Pull Down - Pronated Grip
    { id: "sub-dl4a", name: "Lat Pull Down - Supinated Grip", targetMuscle: "Lats", notes: "Underhand grip — can feel stronger and more natural for some", description: "Supinated grip lat pulldown" },
    { id: "sub-dl4b", name: "Straight-Arm Pulldown", targetMuscle: "Lats", notes: "Arms straight, isolate lats — great as a finisher", description: "Cable straight-arm lat pulldown" },
  ],
  dl5: [ // Single Arm Dumbbell Row
    { id: "sub-dl5a", name: "T-Bar Row", targetMuscle: "Lats/Mid Back", notes: "Both arms — load heavier with the T-bar for volume work", description: "T-bar row" },
    { id: "sub-dl5b", name: "Seated Cable Row", targetMuscle: "Lats/Mid Back", notes: "Good mid-back alternative with constant cable tension", description: "Seated cable row with V-bar" },
  ],
  dl6: [ // Face Pulls
    { id: "sub-dl6a", name: "Band Pull-Apart", targetMuscle: "Rear Delts", notes: "Pull band apart at chest height — great warm-up or finisher", trackWeight: false, repLabel: "Reps", description: "Resistance band pull-apart" },
    { id: "sub-dl6b", name: "Bent-Over Dumbbell Reverse Fly", targetMuscle: "Rear Delts", notes: "Hinge forward, raise dumbbells to sides — isolate rear delts", description: "Bent-over dumbbell rear fly" },
  ],

  // ── 5/3/1 Press Day ──────────────────────────────────────────────────────
  pr1: [ // Barbell Overhead Press
    { id: "sub-pr1a", name: "Dumbbell Shoulder Press", targetMuscle: "Shoulders", notes: "Seated or standing — each arm works independently", description: "Dumbbell overhead press" },
    { id: "sub-pr1b", name: "Arnold Press", targetMuscle: "Shoulders", notes: "Rotating press from neutral grip upward — hits all three delt heads", description: "Arnold rotating dumbbell press" },
  ],
  pr2: [ // Arnold Press
    { id: "sub-pr2a", name: "Dumbbell Overhead Press", targetMuscle: "Full Delts", notes: "Classic press without the rotation — go slightly heavier", description: "Seated dumbbell overhead press" },
    { id: "sub-pr2b", name: "Converging Shoulder Press Machine", targetMuscle: "Full Delts", notes: "Machine arc mimics natural pressing path — great for higher reps", description: "Converging shoulder press machine" },
  ],
  pr3: [ // Dumbbell Lateral Raises
    { id: "sub-pr3a", name: "Cable Lateral Raise", targetMuscle: "Side Delts", notes: "Low pulley, single arm — constant tension throughout", description: "Single-arm cable lateral raise" },
    { id: "sub-pr3b", name: "Machine Lateral Raise", targetMuscle: "Side Delts", notes: "Bilateral machine — feel the contraction at shoulder height", description: "Machine lateral raise" },
  ],
  pr4: [ // Dumbbell Front Raises
    { id: "sub-pr4a", name: "Cable Front Raise", targetMuscle: "Front Delts", notes: "Low cable, raise to eye level — constant tension vs dumbbell", description: "Cable front raise" },
    { id: "sub-pr4b", name: "Barbell Front Raise", targetMuscle: "Front Delts", notes: "Both arms together — slightly heavier load possible", description: "Barbell front raise" },
  ],
  pr5: [ // Face Pulls
    { id: "sub-pr5a", name: "Band Pull-Apart", targetMuscle: "Rear Delts/Rotator Cuff", notes: "Pull band at chest height — great warm-up or substitute without cables", trackWeight: false, repLabel: "Reps", description: "Resistance band pull-apart" },
    { id: "sub-pr5b", name: "Prone Y-Raise", targetMuscle: "Rear Delts/Rotator Cuff", notes: "Face down on incline bench, raise arms in Y — targets external rotation", description: "Prone incline bench Y-raise" },
  ],
  pr6: [ // Upright Row
    { id: "sub-pr6a", name: "Cable Upright Row", targetMuscle: "Traps/Side Delts", notes: "Cable version provides more consistent tension than barbell", description: "Cable upright row" },
    { id: "sub-pr6b", name: "Lateral Raises", targetMuscle: "Traps/Side Delts", notes: "If upright row causes shoulder discomfort, replace with laterals for side delts", description: "Dumbbell lateral raises" },
  ],

  // ── Arnold Split — Chest & Back ──────────────────────────────────────────
  cb1: [ // Flat Barbell Bench Press
    { id: "sub-cb1a", name: "Flat Dumbbell Bench Press", targetMuscle: "Chest", notes: "Greater ROM at the bottom — excellent if supersets are causing fatigue", description: "Flat dumbbell bench press" },
    { id: "sub-cb1b", name: "Push-Ups", targetMuscle: "Chest", notes: "High-rep finisher or if equipment is occupied — add weight vest to progress", trackWeight: false, repLabel: "Reps", description: "Push-ups" },
  ],
  cb2: [ // Barbell Row
    { id: "sub-cb2a", name: "T-Bar Row", targetMuscle: "Mid Back", notes: "Great for thickness — superset with incline press for antagonist training", description: "T-bar row" },
    { id: "sub-cb2b", name: "Chest-Supported Dumbbell Row", targetMuscle: "Mid Back", notes: "Chest on incline bench removes lower back fatigue — isolate the back", description: "Chest-supported dumbbell row" },
  ],
  cb3: [ // Incline Dumbbell Press
    { id: "sub-cb3a", name: "Incline Barbell Bench Press", targetMuscle: "Upper Chest", notes: "Heavier load possible — same upper chest angle", description: "Incline barbell bench press" },
    { id: "sub-cb3b", name: "Incline Cable Press", targetMuscle: "Upper Chest", notes: "Constant tension — pair with pulldown for Arnold superset feel", description: "Incline cable press" },
  ],
  cb4: [ // Lat Pull Down - Pronated Grip
    { id: "sub-cb4a", name: "Lat Pull Down - Supinated Grip", targetMuscle: "Lats", notes: "Underhand grip — many find this easier to feel the lats", description: "Supinated lat pulldown" },
    { id: "sub-cb4b", name: "Pull-Up", targetMuscle: "Lats", notes: "Bodyweight pull-up — use band assistance if needed", trackWeight: false, repLabel: "Reps", description: "Bodyweight pull-up" },
  ],
  cb5: [ // Cable Fly
    { id: "sub-cb5a", name: "Flat Dumbbell Flies", targetMuscle: "Chest", notes: "Classic dumbbell fly — good stretch at bottom", description: "Flat dumbbell fly" },
    { id: "sub-cb5b", name: "Pec Deck Machine", targetMuscle: "Chest", notes: "Machine fly — squeeze and hold at peak contraction", description: "Pec deck machine" },
  ],
  cb6: [ // Seated Cable Row
    { id: "sub-cb6a", name: "Single Arm Dumbbell Row", targetMuscle: "Mid Back", notes: "Unilateral — each side works independently", description: "Single-arm dumbbell row" },
    { id: "sub-cb6b", name: "Machine Row", targetMuscle: "Mid Back", notes: "Chest-supported machine — removes lower back involvement", description: "Chest-supported machine row" },
  ],

  // ── Arnold Split — Shoulders & Arms ──────────────────────────────────────
  sa1: [ // Arnold Press
    { id: "sub-sa1a", name: "Dumbbell Overhead Press", targetMuscle: "Full Delts", notes: "Standard press without the rotation — go slightly heavier", description: "Seated dumbbell overhead press" },
    { id: "sub-sa1b", name: "Converging Shoulder Press Machine", targetMuscle: "Full Delts", notes: "Machine arc mimics pressing path — great for volume", description: "Converging shoulder press machine" },
  ],
  sa2: [ // Dumbbell Lateral Raises
    { id: "sub-sa2a", name: "Cable Lateral Raise", targetMuscle: "Side Delts", notes: "Low pulley single arm — constant tension throughout", description: "Single-arm cable lateral raise" },
    { id: "sub-sa2b", name: "Machine Lateral Raise", targetMuscle: "Side Delts", notes: "Both arms — great for feeling the contraction", description: "Machine lateral raise" },
  ],
  sa3: [ // Barbell Curl
    { id: "sub-sa3a", name: "EZ Bar Curl", targetMuscle: "Biceps", notes: "Angled grip reduces wrist strain — same stimulus as barbell", description: "EZ bar bicep curl" },
    { id: "sub-sa3b", name: "Dumbbell Preacher Curl", targetMuscle: "Biceps", notes: "Preacher pad isolates the bicep — great for peak contraction", description: "Dumbbell preacher curl" },
  ],
  sa4: [ // Skull Crushers
    { id: "sub-sa4a", name: "Overhead Dumbbell Tricep Extension", targetMuscle: "Triceps", notes: "Single or double arm — long head stretch is excellent", description: "Overhead dumbbell tricep extension" },
    { id: "sub-sa4b", name: "Close-Grip Bench Press", targetMuscle: "Triceps", notes: "Compound alternative — allows heavier loading", description: "Close-grip bench press" },
  ],
  sa5: [ // Dumbbell Preacher Hammer Curls
    { id: "sub-sa5a", name: "Cross-Body Hammer Curl", targetMuscle: "Biceps", notes: "Curl dumbbell across body to opposite shoulder — neutral grip", description: "Cross-body dumbbell hammer curl" },
    { id: "sub-sa5b", name: "Cable Hammer Curl", targetMuscle: "Biceps", notes: "Rope on low cable, neutral grip — constant tension", description: "Cable rope hammer curl" },
  ],
  sa6: [ // Tricep Push Down - Rope
    { id: "sub-sa6a", name: "Tricep Pushdown", targetMuscle: "Triceps", notes: "V-bar attachment — slight overhand grip, lock elbows in", description: "V-bar cable tricep pushdown" },
    { id: "sub-sa6b", name: "Skull Crushers", targetMuscle: "Triceps", notes: "Barbell or dumbbell — great compound tricep movement", description: "Skull crushers" },
  ],

  // ── Bro Split — Chest Day ────────────────────────────────────────────────
  ch1: [ // Flat Barbell Bench Press
    { id: "sub-ch1a", name: "Flat Dumbbell Bench Press", targetMuscle: "Chest", notes: "Dumbbells allow greater ROM and natural shoulder rotation", description: "Flat dumbbell bench press" },
    { id: "sub-ch1b", name: "Smith Machine Bench Press", targetMuscle: "Chest", notes: "Controlled path — solid if training alone without spotter", description: "Smith machine bench press" },
  ],
  ch2: [ // Incline Barbell Bench Press
    { id: "sub-ch2a", name: "45° Incline Dumbbell Bench Press", targetMuscle: "Upper Chest", notes: "More natural shoulder rotation, greater ROM", description: "Incline dumbbell press" },
    { id: "sub-ch2b", name: "Incline Smith Machine Press", targetMuscle: "Upper Chest", notes: "Fixed path — safe to go heavy without spotter", description: "Incline Smith machine press" },
  ],
  ch3: [ // 45° Incline DB Bench Press
    { id: "sub-ch3a", name: "Incline Barbell Bench Press", targetMuscle: "Upper Chest", notes: "Barbell allows heavier loading for progressive overload", description: "Incline barbell bench press" },
    { id: "sub-ch3b", name: "Incline Cable Fly", targetMuscle: "Upper Chest", notes: "Cable provides constant tension — great as a volume finisher", description: "Incline cable fly" },
  ],
  ch4: [ // Flat Dumbbell Flies
    { id: "sub-ch4a", name: "Cable Crossover Flies", targetMuscle: "Chest", notes: "Cables from high position — constant tension, no dead zone at top", description: "High-to-low cable crossover" },
    { id: "sub-ch4b", name: "Pec Deck Machine", targetMuscle: "Chest", notes: "Machine fly — hold at peak contraction for extra stimulus", description: "Pec deck fly" },
  ],
  ch5: [ // Cable Fly
    { id: "sub-ch5a", name: "Flat Dumbbell Flies", targetMuscle: "Inner Chest", notes: "Classic dumbbell fly — great stretch at the bottom", description: "Flat dumbbell fly" },
    { id: "sub-ch5b", name: "Pec Deck Machine", targetMuscle: "Inner Chest", notes: "Machine version — excellent for isolation and peak squeeze", description: "Pec deck machine" },
  ],
  ch6: [ // Weighted Dips
    { id: "sub-ch6a", name: "Machine Dip", targetMuscle: "Lower Chest/Triceps", notes: "Assisted dip machine — lean forward to bias chest", description: "Assisted dip machine" },
    { id: "sub-ch6b", name: "Decline Push-Ups", targetMuscle: "Lower Chest/Triceps", notes: "Feet elevated on bench — lower chest emphasis without equipment", trackWeight: false, repLabel: "Reps", description: "Decline push-ups for lower chest" },
  ],

  // ── Bro Split — Back Day ─────────────────────────────────────────────────
  bk2: [ // Pull-Ups
    { id: "sub-bk2-a", name: "Lat Pull Down - Pronated Grip", targetMuscle: "Lats", notes: "Wide grip, pull to upper chest — use if unable to do pull-ups", description: "Cable lat pulldown as pull-up substitute" },
    { id: "sub-bk2-b", name: "Assisted Pull-Up", targetMuscle: "Lats", notes: "Use band or machine assistance — reduce assistance each week", trackWeight: false, repLabel: "Reps", description: "Band or machine assisted pull-up" },
  ],
  bk1: [ // Conventional Deadlift
    { id: "sub-bk1a", name: "Romanian Deadlift", targetMuscle: "Full Back", notes: "Hinge focus — great if lower back is fatigued from heavy pulls", description: "Romanian deadlift" },
    { id: "sub-bk1b", name: "Trap Bar Deadlift", targetMuscle: "Full Back", notes: "More upright torso, neutral grip — easier on the lower back", description: "Trap bar deadlift" },
  ],
  bk3: [ // Barbell Row
    { id: "sub-bk3a", name: "Single Arm Dumbbell Row", targetMuscle: "Mid Back", notes: "Unilateral — great for addressing strength imbalances", description: "Single-arm dumbbell row" },
    { id: "sub-bk3b", name: "T-Bar Row", targetMuscle: "Mid Back", notes: "Great for back thickness — handle options allow different grips", description: "T-bar row" },
  ],
  bk4: [ // Seated Cable Row
    { id: "sub-bk4a", name: "Wide Grip Seated Cable Row", targetMuscle: "Mid Back", notes: "Wide bar flares elbows — targets upper back and rhomboids more", description: "Wide-grip cable seated row" },
    { id: "sub-bk4b", name: "Chest-Supported Dumbbell Row", targetMuscle: "Mid Back", notes: "Chest on incline bench — fully removes lower back from the equation", description: "Incline chest-supported dumbbell row" },
  ],
  bk5: [ // Single Arm Dumbbell Row
    { id: "sub-bk5a", name: "T-Bar Row", targetMuscle: "Lats/Mid Back", notes: "Both arms — load heavier for volume", description: "T-bar row" },
    { id: "sub-bk5b", name: "Seated Cable Row", targetMuscle: "Lats/Mid Back", notes: "Cable provides constant tension unlike dumbbell", description: "Seated cable row with V-bar" },
  ],
  bk6: [ // Face Pulls
    { id: "sub-bk6a", name: "Band Pull-Apart", targetMuscle: "Rear Delts", notes: "Pull band apart at chest height — great without cable machine", trackWeight: false, repLabel: "Reps", description: "Resistance band pull-apart" },
    { id: "sub-bk6b", name: "Bent-Over Dumbbell Reverse Fly", targetMuscle: "Rear Delts", notes: "Hinge forward, raise dumbbells to sides — isolates rear delts", description: "Bent-over dumbbell rear fly" },
  ],

  // ── Bro Split — Shoulders Day ─────────────────────────────────────────────
  sh1: [ // Barbell Overhead Press
    { id: "sub-sh1a", name: "Dumbbell Shoulder Press", targetMuscle: "Front Delts/Overall", notes: "Independent arms — easier on the shoulders for many lifters", description: "Seated dumbbell overhead press" },
    { id: "sub-sh1b", name: "Arnold Press", targetMuscle: "Front Delts/Overall", notes: "Rotating press — engages all three delt heads through the movement", description: "Arnold rotating dumbbell press" },
  ],
  sh2: [ // Arnold Press
    { id: "sub-sh2a", name: "Dumbbell Overhead Press", targetMuscle: "Full Delts", notes: "No rotation — focus on vertical press for heavy sets", description: "Seated dumbbell overhead press" },
    { id: "sub-sh2b", name: "Converging Shoulder Press Machine", targetMuscle: "Full Delts", notes: "Machine arc — great for accumulating shoulder volume safely", description: "Converging shoulder press machine" },
  ],
  sh3: [ // Dumbbell Lateral Raises
    { id: "sub-sh3a", name: "Cable Lateral Raise", targetMuscle: "Side Delts", notes: "Low pulley, single arm — constant tension vs dumbbells", description: "Single-arm cable lateral raise" },
    { id: "sub-sh3b", name: "Machine Lateral Raise", targetMuscle: "Side Delts", notes: "Both arms simultaneously — good for controlled volume work", description: "Machine lateral raise" },
  ],
  sh4: [ // Dumbbell Front Raises
    { id: "sub-sh4a", name: "Cable Front Raise", targetMuscle: "Front Delts", notes: "Low cable — constant tension throughout vs dumbbell dead spot at bottom", description: "Cable front raise" },
    { id: "sub-sh4b", name: "Barbell Front Raise", targetMuscle: "Front Delts", notes: "Both arms together — can load slightly heavier", description: "Barbell front raise" },
  ],
  sh5: [ // Single Arm Cross Body Reverse Fly
    { id: "sub-sh5a", name: "Bent-Over Dumbbell Reverse Fly", targetMuscle: "Rear Delts", notes: "Both arms — hinge forward 45°, raise to sides", description: "Bent-over dumbbell rear fly" },
    { id: "sub-sh5b", name: "Cable Reverse Fly", targetMuscle: "Rear Delts", notes: "Cables crossed, pull out to sides — great at any angle", description: "Cable rear delt fly" },
  ],
  sh6: [ // Barbell Shrugs
    { id: "sub-sh6a", name: "Dumbbell Shrugs", targetMuscle: "Traps", notes: "Dumbbells allow more freedom of movement — hold 1s at top", description: "Dumbbell shrugs" },
    { id: "sub-sh6b", name: "Cable Shrug", targetMuscle: "Traps", notes: "Cable provides constant tension — useful for high-rep trap work", description: "Cable shrug" },
  ],

  // ── Bro Split — Arms Day ─────────────────────────────────────────────────
  am1: [ // Barbell Curl
    { id: "sub-am1a", name: "EZ Bar Curl", targetMuscle: "Biceps", notes: "Angled grip reduces wrist strain — same bicep stimulus", description: "EZ bar bicep curl" },
    { id: "sub-am1b", name: "Dumbbell Preacher Curl", targetMuscle: "Biceps", notes: "Preacher pad isolates the bicep — excellent for peak contraction", description: "Dumbbell preacher curl" },
  ],
  am2: [ // Skull Crushers
    { id: "sub-am2a", name: "Overhead Dumbbell Tricep Extension", targetMuscle: "Triceps", notes: "Single or double arm overhead — great long head stretch", description: "Overhead dumbbell tricep extension" },
    { id: "sub-am2b", name: "Close-Grip Bench Press", targetMuscle: "Triceps", notes: "Compound pressing — allows heavier tricep loading", description: "Close-grip bench press" },
  ],
  "lib-18": [ // Incline Dumbbell Curl
    { id: "sub-am3a", name: "Spider Curl", targetMuscle: "Biceps", notes: "Lie chest-down on incline bench, curl from fully stretched — hits long head hard", description: "Incline bench spider curl" },
    { id: "sub-am3b", name: "Cable Curl", targetMuscle: "Biceps", notes: "Low cable, constant tension — great for the stretched position", description: "Cable bicep curl" },
  ],
  am4: [ // Overhead Tricep Extension
    { id: "sub-am4a", name: "Overhead Cable Tricep Extension", targetMuscle: "Triceps", notes: "Cable overhead — constant tension, excellent long head stretch", description: "Overhead cable tricep extension" },
    { id: "sub-am4b", name: "Tricep Dips", targetMuscle: "Triceps", notes: "Upright torso to bias triceps — add weight between legs to progress", description: "Bodyweight or weighted tricep dips" },
  ],
  am5: [ // Dumbbell Preacher Hammer Curls
    { id: "sub-am5a", name: "Cross-Body Hammer Curl", targetMuscle: "Brachialis", notes: "Curl across body to opposite shoulder — neutral grip trains brachialis hard", description: "Cross-body dumbbell hammer curl" },
    { id: "sub-am5b", name: "Cable Hammer Curl", targetMuscle: "Brachialis", notes: "Rope on low cable, neutral grip — constant tension variation", description: "Cable rope hammer curl" },
  ],
  am6: [ // Tricep Push Down - Rope
    { id: "sub-am6a", name: "Tricep Pushdown", targetMuscle: "Triceps", notes: "V-bar attachment, slight overhand grip — great for heavy sets", description: "V-bar cable tricep pushdown" },
    { id: "sub-am6b", name: "Skull Crushers", targetMuscle: "Triceps", notes: "Barbell or dumbbell — great compound tricep movement to swap in", description: "Skull crushers" },
  ],

  // ── Upper/Lower A/B additions ────────────────────────────────────────────
  "lib-64": [ // Mag Grip Seated Cable Row
    { id: "sub-pl64a", name: "Chest-Supported Machine Row", targetMuscle: "Mid Back", notes: "Chest pad supported — isolates back, removes lower-back fatigue", description: "Chest-supported machine row" },
    { id: "sub-pl64b", name: "Barbell Bent-Over Row", targetMuscle: "Back Thickness", notes: "Overhand grip, hinge 45°, row to lower chest — heavier loading", description: "Classic barbell bent-over row" },
  ],
  "lib-65": [ // Hex Bar Squat Jumps
    { id: "sub-pl65a", name: "Squat Jumps", targetMuscle: "Quads/Power", notes: "Bodyweight full squat to max height jump, soft landing, reset each rep", trackWeight: false, repLabel: "Reps", description: "Bodyweight explosive squat jump" },
    { id: "sub-pl65b", name: "Kettlebell Swing", targetMuscle: "Hip Power", notes: "Hip-snap driven swing — low impact alternative when hex bar unavailable", description: "Explosive kettlebell hip-snap swing" },
  ],
  "lib-66": [ // Box Jumps with Drop Jump
    { id: "sub-pl66a", name: "Depth Jumps", targetMuscle: "Power/Reactive", notes: "Step off lower box, immediately rebound max height — minimise ground contact", trackWeight: false, repLabel: "Reps", description: "Reactive depth jump from low box" },
    { id: "sub-pl66b", name: "Tuck Jumps", targetMuscle: "Power/Reactive", notes: "Jump max height, tuck knees to chest at peak, soft landing", trackWeight: false, repLabel: "Reps", description: "Vertical tuck jump for reactive power" },
  ],
  "lib-67": [ // Broad Jumps
    { id: "sub-pl67a", name: "Single-Leg Broad Jump", targetMuscle: "Power/Horizontal", notes: "One-leg takeoff for max horizontal distance, stick the landing", trackWeight: false, repLabel: "Reps", description: "Unilateral horizontal broad jump" },
    { id: "sub-pl67b", name: "Med Ball Forward Throw", targetMuscle: "Power/Horizontal", notes: "Squat, explosive triple extension, throw ball forward for distance", repLabel: "Reps", description: "Med ball forward projection throw" },
  ],
  la6: [ // Core Finisher (rotation slot) — primary picks first, then alternates
    { id: "sub-la6-cable", name: "Cable Crunches", targetMuscle: "Core", notes: "Kneel below rope, pull with abs only — round spine, no hip flexion", description: "Cable rope crunch — pick attachment below" },
    { id: "sub-la6-decline", name: "Decline Bench Crunches", targetMuscle: "Core", notes: "Controlled, full crunch — hold a plate on chest to add load", repLabel: "Reps", description: "Decline bench weighted crunch" },
    { id: "sub-la6-machine", name: "Ab Crunch Machine", targetMuscle: "Core", notes: "Full ROM, squeeze hard at the bottom, slow eccentric", description: "Plate-loaded or selectorized ab crunch machine" },
    { id: "sub-la6a", name: "Hanging Knee Raises", targetMuscle: "Core", notes: "Controlled raise — no swinging, pause at top, lower with control", trackWeight: false, repLabel: "Reps", description: "Hanging knee raise for lower abs" },
    { id: "sub-la6b", name: "Ab Wheel Rollouts", targetMuscle: "Core", notes: "Full extension, keep hips tucked, squeeze back to start", trackWeight: false, repLabel: "Reps", description: "Progressive core stability rollout" },
  ],
};
