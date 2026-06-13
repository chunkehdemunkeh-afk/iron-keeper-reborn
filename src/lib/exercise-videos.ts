// Mapping of exercise IDs to specific YouTube Shorts URLs
export const EXERCISE_VIDEOS: Record<string, string> = {
  // Power day
  pw1: "https://www.youtube.com/shorts/qgaEIQVyrf4", // Box Jumps
  pw2: "https://www.youtube.com/shorts/F7aUrzFurgI", // Depth Jumps
  pw3: "https://www.youtube.com/shorts/uuIJroNfvdQ", // Med Ball Slam
  pw4: "https://www.youtube.com/shorts/U1F5uebdUcw", // Single-Leg Broad Jump
  pw5: "https://www.youtube.com/shorts/2gXtvqLa_T8", // Kettlebell Swing
  pw7: "https://www.youtube.com/shorts/pTm9T-5f7go", // Lateral Bounds (power session)
  pw6: "https://www.youtube.com/shorts/QcAAKuEgYjw", // Plyo Push-Up

  // Agility day
  ag1: "https://www.youtube.com/shorts/mziPKITnPeQ", // Lateral Shuffle (using full video as short fallback)
  ag2: "https://www.youtube.com/shorts/cq4IKjEDo-I", // T-Drill
  ag3: "https://www.youtube.com/shorts/dUyeXRGqheU", // Ladder Drills
  ag4: "https://www.youtube.com/shorts/pTm9T-5f7go", // Lateral Bound
  ag5: "https://www.youtube.com/shorts/CxXGQm2iPzE", // Reactive Ball Drop
  ag6: "https://www.youtube.com/shorts/574s1aI8UYA", // Carioca / Grapevine

  // Strength day
  st1: "https://www.youtube.com/shorts/eLX_dyvooKQ", // Goblet Squat
  st2: "https://www.youtube.com/shorts/5rIqP63yWFg", // Romanian Deadlift (DB)
  st3: "https://www.youtube.com/shorts/lG3MsPmEQQk", // Bulgarian Split Squat
  st4: "https://www.youtube.com/shorts/PM23l_EVxYc", // Nordic Hamstring Curl
  st5: "https://www.youtube.com/shorts/tgK5r1no_BU", // Copenhagen Adductor
  st6: "https://www.youtube.com/shorts/EuGET6mZNQc", // Dead Bug

  // Reflexes day
  rf1: "https://www.youtube.com/shorts/PhxzbdElDnM", // Med Ball Chest Pass
  rf2: "https://www.youtube.com/shorts/i81dMdueu9k", // Face Pulls
  rf3: "https://www.youtube.com/shorts/1uOs1hP3u4A", // Farmer's Walk
  rf4: "https://www.youtube.com/shorts/q6pcmxeWELc", // Wrist Curls (DB)
  rf5: "https://www.youtube.com/shorts/OLePvpxQEGk", // Overhead DB Press
  rf6: "https://www.youtube.com/shorts/Ki-H6D3gvco", // Plank Shoulder Taps

  // Push day
  pu1: "https://www.youtube.com/shorts/PiJQPOiMua4", // 45° Incline Dumbbell Bench Press (65K views)
  pu2: "https://www.youtube.com/shorts/OLePvpxQEGk", // Dumbbell Lateral Raises (Davis Diley 4M views)
  pu3: "https://www.youtube.com/shorts/ou6s32mJgjU", // 15° Incline Dumbbell Bench Press
  pu4: "https://www.youtube.com/shorts/atcyT99YDeI", // Flat Dumbbell Flies (Mind Pump 518K views)
  pu5: "https://www.youtube.com/shorts/aHfbuBf1TJk", // X-Over Cable Tricep Extensions
  pu6: "https://www.youtube.com/shorts/NTk0Igxqcsk", // Single Arm Overhead Cable Tricep Extensions (DeltaBolic 3.4M views)

  // Pull day
  pl1: "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Row Machine
  pl2: "https://www.youtube.com/shorts/DgyslsszCQ0", // T-Bar Row
  pl3: "https://www.youtube.com/shorts/z-lxcsIN4T4", // Lat Pull Down - Pronated Grip (Davis Diley 2.7M views)
  pl4: "https://www.youtube.com/shorts/c44hwGS-peY", // Single Arm Cross Body Reverse Fly (DeltaBolic 177K views)
  pl5: "https://www.youtube.com/shorts/0y4tdUNPdlE", // Dumbbell Preacher Curls
  pl6: "https://www.youtube.com/shorts/NyW2fT2gQhM", // Dumbbell Preacher Hammer Curls

  // Legs day
  lg1: "https://www.youtube.com/shorts/pasQYajR_eI", // Seated Hamstring Curl (correct variation)
  lg2: "https://www.youtube.com/shorts/OVd1pq1cAvE", // Barbell RDL
  lg3: "https://www.youtube.com/shorts/uODWo4YqbT8", // Dumbbell Split Squat (Davis Diley 5.7M views)
  // lg4 Pendulum Squat — no verified Short yet, falls back to YouTube search (better than wrong video)
  lg5: "https://www.youtube.com/shorts/Tae3aeJe5Ks", // Leg Extension (DeltaBolic 309K views)
  lg6: "https://www.youtube.com/shorts/yQZDGjL-xT4", // Standing Calf Raise (correct variation)

  // Upper day
  up1: "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Cable Row - V Bar
  up2: "https://www.youtube.com/shorts/z-lxcsIN4T4", // Lat Pull Down - V Bar
  up3: "https://www.youtube.com/shorts/SidmT09GXz8", // Flat Dumbbell Bench Press
  up4: "https://www.youtube.com/shorts/dTe9CB9Zous", // Cable Flies To Thighs
  up5: "https://www.youtube.com/shorts/6v4nrRVySj0", // Converging Shoulder Press Machine (DeltaBolic 3.2M views)
  up6: "https://www.youtube.com/shorts/0y4tdUNPdlE", // Dumbbell Preacher Curls
  up7: "https://www.youtube.com/shorts/NyW2fT2gQhM", // Dumbbell Preacher Hammer Curls
  up8: "https://www.youtube.com/shorts/aHfbuBf1TJk", // Tricep Push Down - Rope

  // ── Substitute exercises ──

  // Power subs
  "sub-pw1a": "https://www.youtube.com/shorts/EY3bzgv2SYo", // Squat Jumps
  "sub-pw1b": "https://www.youtube.com/shorts/8hAAvGLLMcs", // Tuck Jumps
  "sub-pw2a": "https://www.youtube.com/shorts/F7aUrzFurgI", // Drop Jumps
  "sub-pw2b": "https://www.youtube.com/shorts/UO2GnmaJK10", // Hurdle Hops
  "sub-pw3a": "https://www.youtube.com/shorts/tieSjR7OkIg", // Med Ball Overhead Throw
  "sub-pw3b": "https://www.youtube.com/shorts/hbnfwP0Zr7U", // Battle Rope Slams
  "sub-pw4a": "https://www.youtube.com/shorts/EY3bzgv2SYo", // Single-Leg Box Jump
  "sub-pw4b": "https://www.youtube.com/shorts/UO2GnmaJK10", // Bounding
  "sub-pw7a": "https://www.youtube.com/shorts/IASI5JQsH6E", // Skater Jumps
  "sub-pw7b": "https://www.youtube.com/shorts/UO2GnmaJK10", // Lateral Hurdle Hops
  "sub-pw5a": "https://www.youtube.com/shorts/2gXtvqLa_T8", // Dumbbell Swing
  "sub-pw5b": "https://www.youtube.com/shorts/xW3FwDQ59ms", // Kettlebell Clean
  "sub-pw6a": "https://www.youtube.com/shorts/QcAAKuEgYjw", // Clap Push-Up
  "sub-pw6b": "https://www.youtube.com/shorts/QcAAKuEgYjw", // Med Ball Push-Up

  // Agility subs
  "sub-ag1a": "https://www.youtube.com/shorts/mziPKITnPeQ", // Defensive Slide
  "sub-ag1b": "https://www.youtube.com/shorts/6h3TVFPTSQo", // Lateral Band Walk
  "sub-ag2a": "https://www.youtube.com/shorts/cq4IKjEDo-I", // 5-10-5 Pro Agility
  "sub-ag2b": "https://www.youtube.com/shorts/cq4IKjEDo-I", // L-Drill
  "sub-ag3a": "https://www.youtube.com/shorts/Aw7F4FlDXek", // Quick Feet Taps
  "sub-ag3b": "https://www.youtube.com/shorts/dUyeXRGqheU", // Dot Drill
  "sub-ag4a": "https://www.youtube.com/shorts/IASI5JQsH6E", // Skater Jumps
  "sub-ag4b": "https://www.youtube.com/shorts/pTm9T-5f7go", // Single-Leg Lateral Hop
  "sub-ag5a": "https://www.youtube.com/shorts/CxXGQm2iPzE", // Reaction Light Drill
  "sub-ag5b": "https://www.youtube.com/shorts/CxXGQm2iPzE", // Mirror Drill
  "sub-ag6a": "https://www.youtube.com/shorts/574s1aI8UYA", // Side Shuffle with Cross-Over
  "sub-ag6b": "https://www.youtube.com/shorts/_Pe-FXjAc-s", // Hip Circle Walk

  // Strength subs
  "sub-st1a": "https://www.youtube.com/shorts/4n9HM7VabC0", // Dumbbell Front Squat
  "sub-st1b": "https://www.youtube.com/shorts/eLX_dyvooKQ", // Kettlebell Goblet Squat
  "sub-st2a": "https://www.youtube.com/shorts/MeV_WFmvBCU", // Single-Leg Dumbbell RDL
  "sub-st2b": "https://www.youtube.com/shorts/2VDjb79F1G4", // Dumbbell Stiff-Leg Deadlift
  "sub-st3a": "https://www.youtube.com/shorts/ljZA17b52FE", // Reverse Lunge (DB)
  "sub-st3b": "https://www.youtube.com/shorts/5ksu8nrdVIE", // Step-Up (DB)
  "sub-st4a": "https://www.youtube.com/shorts/wWBxI_lxeS0", // Slider Leg Curl
  "sub-st4b": "https://www.youtube.com/shorts/Lh3iMIcbkBQ", // Swiss Ball Hamstring Curl
  "sub-st5a": "https://www.youtube.com/shorts/Am2z100dcSA", // Side-Lying Adductor Raise
  "sub-st5b": "https://www.youtube.com/shorts/vzGnKI2PI78", // Cable Hip Adduction
  "sub-st6a": "https://www.youtube.com/shorts/wh2spJeDDQs", // Bird Dog
  "sub-st6b": "https://www.youtube.com/shorts/dHxa57kBAmc", // Pallof Press

  // Reflexes subs
  "sub-rf1a": "https://www.youtube.com/shorts/tieSjR7OkIg", // Med Ball Rotational Throw
  "sub-rf1b": "https://www.youtube.com/shorts/PhxzbdElDnM", // Med Ball Push Pass
  "sub-rf2a": "https://www.youtube.com/shorts/MpyEGXCLS8M", // Band Pull-Apart
  "sub-rf2b": "https://www.youtube.com/shorts/5TBjG5xuPa4", // Prone Y-Raise
  "sub-rf3a": "https://www.youtube.com/shorts/dOCQjaasbGs", // Dead Hang
  "sub-rf3b": "https://www.youtube.com/shorts/1uOs1hP3u4A", // Plate Pinch Walk
  "sub-rf4a": "https://www.youtube.com/shorts/shqAI51IP74", // Reverse Wrist Curls (DB)
  "sub-rf4b": "https://www.youtube.com/shorts/VWhOEXw-BM4", // Wrist Roller
  "sub-rf5a": "https://www.youtube.com/shorts/k6tzKisR3NY", // Arnold Press
  "sub-rf5b": "https://www.youtube.com/shorts/k6tzKisR3NY", // Seated Dumbbell Press
  "sub-rf6a": "https://www.youtube.com/shorts/fgSyNdEsqlM", // Renegade Row
  "sub-rf6b": "https://www.youtube.com/shorts/Ki-H6D3gvco", // Bear Crawl

  // Push subs
  "sub-pu1a": "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Barbell Bench Press
  "sub-pu1b": "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Smith Machine Press
  "sub-pu2a": "https://www.youtube.com/shorts/f_OGBg2KxgY", // Cable Lateral Raise
  "sub-pu2b": "https://www.youtube.com/shorts/dybxZJaWxCY", // Machine Lateral Raise
  "sub-pu3a": "https://www.youtube.com/shorts/98HWfiRonkE", // Low Incline Barbell Bench Press
  "sub-pu3b": "https://www.youtube.com/shorts/8fXfwG4ftaQ", // Incline Dumbbell Squeeze Press
  "sub-pu4a": "https://www.youtube.com/shorts/I-Ue34qLxc4", // Cable Crossover Flies
  "sub-pu4b": "https://www.youtube.com/shorts/a9vQ_hwIksU", // Pec Deck Machine
  "sub-pu5a": "https://www.youtube.com/shorts/7OF77JMEXhM", // Tricep Rope Pushdown
  "sub-pu5b": "https://www.youtube.com/shorts/bQuF1xOTIr0", // Straight Bar Pushdown
  "sub-pu6a": "https://www.youtube.com/shorts/b_r_LW4HEcM", // Overhead Dumbbell Tricep Extension
  "sub-pu6b": "https://www.youtube.com/shorts/sah-sHCZDS0", // Cable Kickback

  // Pull subs
  "sub-pl1a": "https://www.youtube.com/shorts/7PE3MlvGAts", // Cable Seated Row - Wide Grip
  "sub-pl1b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Chest-Supported Row Machine
  "sub-pl2a": "https://www.youtube.com/shorts/Nqh7q3zDCoQ", // Barbell Bent-Over Row
  "sub-pl2b": "https://www.youtube.com/shorts/DgyslsszCQ0", // Meadows Row
  "sub-pl3a": "https://www.youtube.com/shorts/z-lxcsIN4T4", // Lat Pull Down - Supinated Grip
  "sub-pl3b": "https://www.youtube.com/shorts/AMR2l17Sm6M", // Straight-Arm Pulldown
  "sub-pl4a": "https://www.youtube.com/shorts/QfDqL93fr3A", // Cable Reverse Fly
  "sub-pl4b": "https://www.youtube.com/shorts/JeSlI2s4XfM", // Bent-Over Dumbbell Reverse Fly
  "sub-pl5a": "https://www.youtube.com/shorts/0y4tdUNPdlE", // EZ Bar Preacher Curl
  "sub-pl5b": "https://www.youtube.com/shorts/0y4tdUNPdlE", // Machine Preacher Curl
  "sub-pl6a": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Cross-Body Hammer Curl
  "sub-pl6b": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Rope Hammer Curl (Cable)

  // Legs subs
  "sub-lg1a": "https://www.youtube.com/shorts/pasQYajR_eI", // Seated Hamstring Curl
  "sub-lg1b": "https://www.youtube.com/shorts/d6sg829PgNs", // Single-Leg Lying Curl
  "sub-lg2a": "https://www.youtube.com/shorts/5rIqP63yWFg", // Dumbbell RDL
  "sub-lg2b": "https://www.youtube.com/shorts/OVd1pq1cAvE", // Trap Bar RDL
  "sub-lg3a": "https://www.youtube.com/shorts/_lSFEA3uYYo", // Walking Lunges (DB)
  "sub-lg3b": "https://www.youtube.com/shorts/ljZA17b52FE", // Reverse Lunge (DB)
  "sub-lg4a": "https://www.youtube.com/shorts/lRYBbchqxtI", // Box Squat (DB/KB)
  "sub-lg4b": "https://www.youtube.com/shorts/nDh_BlnLCGc", // Leg Press (Narrow Stance)
  "sub-lg5a": "https://www.youtube.com/shorts/2SZfFBglqT0", // Sissy Squat
  "sub-lg5b": "https://www.youtube.com/shorts/Tae3aeJe5Ks", // Single-Leg Extension
  "sub-lg6a": "https://www.youtube.com/shorts/yQZDGjL-xT4", // Standing Calf Raise
  "sub-lg6b": "https://www.youtube.com/shorts/baEXLy09Ncc", // Single-Leg Calf Raise (DB)

  // Upper subs
  "sub-up1a": "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Cable Row - Wide Grip
  "sub-up1b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Chest-Supported Dumbbell Row
  "sub-up2a": "https://www.youtube.com/shorts/z-lxcsIN4T4", // Close-Grip Lat Pulldown
  "sub-up2b": "https://www.youtube.com/shorts/eKJUJ2eFPUY", // Single-Arm Cable Pulldown
  "sub-up3a": "https://www.youtube.com/shorts/hWbUlkb5Ms4", // Flat Barbell Bench Press
  "sub-up3b": "https://www.youtube.com/shorts/UBmpZ7l5Nlk", // Dumbbell Floor Press
  "sub-up4a": "https://www.youtube.com/shorts/atcyT99YDeI", // Decline Dumbbell Flies
  "sub-up4b": "https://www.youtube.com/shorts/dTe9CB9Zous", // Dip Machine (Chest Focus)
  "sub-up5a": "https://www.youtube.com/shorts/k6tzKisR3NY", // Dumbbell Shoulder Press
  "sub-up5b": "https://www.youtube.com/shorts/6v4nrRVySj0", // Smith Machine Shoulder Press
  "sub-up6a": "https://www.youtube.com/shorts/0y4tdUNPdlE", // EZ Bar Preacher Curl
  "sub-up6b": "https://www.youtube.com/shorts/0y4tdUNPdlE", // Machine Preacher Curl
  "sub-up7a": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Cross-Body Hammer Curl
  "sub-up7b": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Rope Hammer Curl (Cable)
  "sub-up8a": "https://www.youtube.com/shorts/mMVRVk0aPt4", // Tricep Push Down - V Bar
  "sub-up8b": "https://www.youtube.com/shorts/b_r_LW4HEcM", // Dumbbell Skull Crusher

  // Accessory — Abs
  "acc-abs1": "https://www.youtube.com/shorts/AV5PmrSBbUY", // Cable Crunches
  "acc-abs2": "https://www.youtube.com/shorts/wrBx6WHIAmU", // Oblique Leg Raises
  "sub-abs1a": "https://www.youtube.com/shorts/bP4PGEkuaYc", // Hanging Knee Raises
  "sub-abs1b": "https://www.youtube.com/shorts/rqiTPl09RoE", // Ab Wheel Rollouts
  "sub-abs2a": "https://www.youtube.com/shorts/9FGilxCbdz8", // Bicycle Crunches
  "sub-abs2b": "https://www.youtube.com/shorts/V4jedisxPRA", // Woodchoppers

  // Accessory — Grip
  "acc-grip1": "https://www.youtube.com/shorts/bfWzFmhB4BA", // Pinch Grip Plate Holds
  "acc-grip2": "https://www.youtube.com/shorts/2gXtvqLa_T8", // Farmer's Walk
  "sub-grip1a": "https://www.youtube.com/shorts/Uj1PxFfOfCA", // Towel Hang
  "sub-grip1b": "https://www.youtube.com/shorts/bfWzFmhB4BA", // Fat Gripz Holds
  "sub-grip2a": "https://www.youtube.com/shorts/dOCQjaasbGs", // Dead Hang
  "sub-grip2b": "https://www.youtube.com/shorts/AGx-t3wqmo8", // Plate Curls

  // ── Full Body workout ─────────────────────────────────────────────────────
  fb1: "https://www.youtube.com/shorts/PPmvh7gBTi0", // Barbell Back Squat (Jeff Nippard)
  fb2: "https://www.youtube.com/shorts/5rIqP63yWFg", // Romanian Deadlift (reuse st2)
  fb3: "https://www.youtube.com/shorts/0cXAp6WhSj4", // Flat Barbell Bench Press (Jeremy Ethier)
  fb4: "https://www.youtube.com/shorts/oNanBZu0lMk", // Barbell Row
  fb5: "https://www.youtube.com/shorts/zoN5EH50Dro", // Overhead Press (Jeremy Ethier)
  fb6: "https://www.youtube.com/shorts/OLePvpxQEGk", // Dumbbell Lateral Raises (reuse pu2)

  // ── 5/3/1 Squat Day ──────────────────────────────────────────────────────
  sq1: "https://www.youtube.com/shorts/PPmvh7gBTi0", // Barbell Back Squat (Jeff Nippard)
  sq2: "https://www.youtube.com/shorts/_qv0m3tPd3s", // Front Squat
  sq3: "https://www.youtube.com/shorts/nDh_BlnLCGc", // Leg Press (reuse sub-lg4b)
  sq4: "https://www.youtube.com/shorts/Tae3aeJe5Ks", // Leg Extension (reuse lg5)
  sq5: "https://www.youtube.com/shorts/_lSFEA3uYYo", // Walking Lunges (reuse sub-lg3a)
  sq6: "https://www.youtube.com/shorts/pasQYajR_eI", // Seated Hamstring Curl (reuse sub-lg1a)

  // ── 5/3/1 Bench Day ──────────────────────────────────────────────────────
  bn1: "https://www.youtube.com/shorts/0cXAp6WhSj4", // Flat Barbell Bench Press (Jeremy Ethier)
  bn2: "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Barbell Bench Press (reuse sub-pu1a)
  bn3: "https://www.youtube.com/shorts/PiJQPOiMua4", // 45° Incline DB Bench (reuse pu1)
  bn4: "https://www.youtube.com/shorts/dTe9CB9Zous", // Cable Fly (reuse up4)
  bn5: "https://www.youtube.com/shorts/nVo7WCDSNqQ", // Skull Crushers
  bn6: "https://www.youtube.com/shorts/aHfbuBf1TJk", // X-Over Cable Tricep Extensions (reuse pu5)

  // ── 5/3/1 Deadlift Day ───────────────────────────────────────────────────
  dl1: "https://www.youtube.com/shorts/xNwpvDuZJ3k", // Conventional Deadlift (Jeremy Ethier)
  dl2: "https://www.youtube.com/shorts/ZhHw9HZGezY", // Rack Pull
  dl3: "https://www.youtube.com/shorts/oNanBZu0lMk", // Barbell Row
  dl4: "https://www.youtube.com/shorts/z-lxcsIN4T4", // Lat Pull Down - Pronated (reuse pl3)
  dl5: "https://www.youtube.com/shorts/i9BJwVCK5VQ", // Single Arm Dumbbell Row
  dl6: "https://www.youtube.com/shorts/i81dMdueu9k", // Face Pulls (reuse rf2)

  // ── 5/3/1 Press Day ──────────────────────────────────────────────────────
  pr1: "https://www.youtube.com/shorts/zoN5EH50Dro", // Barbell Overhead Press (Jeremy Ethier)
  pr2: "https://www.youtube.com/shorts/6K_N9AGhItQ", // Arnold Press
  pr3: "https://www.youtube.com/shorts/OLePvpxQEGk", // Dumbbell Lateral Raises (reuse pu2)
  pr4: "https://www.youtube.com/shorts/h9xfpTrAvkE", // Dumbbell Front Raises
  pr5: "https://www.youtube.com/shorts/i81dMdueu9k", // Face Pulls (reuse rf2)
  pr6: "https://www.youtube.com/shorts/AWsGWt-VMl8", // Upright Row

  // ── Arnold Split — Chest & Back ──────────────────────────────────────────
  cb1: "https://www.youtube.com/shorts/0cXAp6WhSj4", // Flat Barbell Bench Press (Jeremy Ethier)
  cb2: "https://www.youtube.com/shorts/oNanBZu0lMk", // Barbell Row
  cb3: "https://www.youtube.com/shorts/8fXfwG4ftaQ", // Incline Dumbbell Press
  cb4: "https://www.youtube.com/shorts/z-lxcsIN4T4", // Lat Pull Down - Pronated (reuse pl3)
  cb5: "https://www.youtube.com/shorts/dTe9CB9Zous", // Cable Fly (reuse up4)
  cb6: "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Cable Row - V Bar (reuse pl1)

  // ── Arnold Split — Shoulders & Arms ──────────────────────────────────────
  sa1: "https://www.youtube.com/shorts/6K_N9AGhItQ", // Arnold Press
  sa2: "https://www.youtube.com/shorts/OLePvpxQEGk", // Dumbbell Lateral Raises (reuse pu2)
  sa3: "https://www.youtube.com/shorts/N6paU6TGFWU", // Barbell Curl (Davis Diley)
  sa4: "https://www.youtube.com/shorts/nVo7WCDSNqQ", // Skull Crushers
  sa5: "https://www.youtube.com/shorts/NyW2fT2gQhM", // Dumbbell Preacher Hammer Curls (reuse pl6)
  sa6: "https://www.youtube.com/shorts/aHfbuBf1TJk", // Tricep Push Down - Rope (reuse up8)

  // ── Bro Split — Chest Day ────────────────────────────────────────────────
  ch1: "https://www.youtube.com/shorts/0cXAp6WhSj4", // Flat Barbell Bench Press (Jeremy Ethier)
  ch2: "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Barbell Bench Press (reuse sub-pu1a)
  ch3: "https://www.youtube.com/shorts/PiJQPOiMua4", // 45° Incline DB Bench (reuse pu1)
  ch4: "https://www.youtube.com/shorts/atcyT99YDeI", // Flat Dumbbell Flies (reuse pu4)
  ch5: "https://www.youtube.com/shorts/dTe9CB9Zous", // Cable Fly (reuse up4)
  ch6: "https://www.youtube.com/shorts/ZDOrGNvRdM0", // Weighted Dips

  // ── Bro Split — Back Day ─────────────────────────────────────────────────
  bk1: "https://www.youtube.com/shorts/xNwpvDuZJ3k", // Conventional Deadlift (Jeremy Ethier)
  bk2: "https://www.youtube.com/shorts/oNanBZu0lMk", // Barbell Row
  bk3: "https://www.youtube.com/shorts/z-lxcsIN4T4", // Lat Pull Down - Pronated (reuse pl3)
  bk4: "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Cable Row - V Bar (reuse pl1)
  bk5: "https://www.youtube.com/shorts/i9BJwVCK5VQ", // Single Arm Dumbbell Row
  bk6: "https://www.youtube.com/shorts/i81dMdueu9k", // Face Pulls (reuse rf2)

  // ── Bro Split — Shoulders Day ─────────────────────────────────────────────
  sh1: "https://www.youtube.com/shorts/zoN5EH50Dro", // Barbell Overhead Press (Jeremy Ethier)
  sh2: "https://www.youtube.com/shorts/6K_N9AGhItQ", // Arnold Press
  sh3: "https://www.youtube.com/shorts/OLePvpxQEGk", // Dumbbell Lateral Raises (reuse pu2)
  sh4: "https://www.youtube.com/shorts/h9xfpTrAvkE", // Dumbbell Front Raises
  sh5: "https://www.youtube.com/shorts/c44hwGS-peY", // Single Arm Cross Body Reverse Fly (reuse pl4)
  sh6: "https://www.youtube.com/shorts/MlqHEfydPpE", // Barbell Shrugs

  // ── Bro Split — Arms Day ─────────────────────────────────────────────────
  am1: "https://www.youtube.com/shorts/N6paU6TGFWU", // Barbell Curl (Davis Diley)
  am2: "https://www.youtube.com/shorts/nVo7WCDSNqQ", // Skull Crushers
  am3: "https://www.youtube.com/shorts/XhIsIcjIbCw", // Incline Dumbbell Curl
  am4: "https://www.youtube.com/shorts/4yKLxOsrGfg", // Close-Grip Bench Press
  am5: "https://www.youtube.com/shorts/NyW2fT2gQhM", // Dumbbell Preacher Hammer Curls (reuse pl6)
  am6: "https://www.youtube.com/shorts/aHfbuBf1TJk", // Tricep Push Down - Rope (reuse up8)

  // ── Programme lib-* exercises (Upper/Lower A/B) ──────────────────────────
  "lib-29": "https://www.youtube.com/shorts/PM23l_EVxYc", // Nordic Hamstring Curl (reuse st4)
  "lib-61": "https://www.youtube.com/shorts/EhC6ejgDGF0", // Bayesian Curl
  "lib-65": "https://www.youtube.com/shorts/FlZh3CshfZQ", // Hex Bar Squat Jumps
  "lib-67": "https://www.youtube.com/shorts/v0yrBWA3eEs", // Broad Jumps
  lg4:      "https://www.youtube.com/shorts/RsSGq7aN_ww",  // Pendulum Squat
  "ua6":    "https://www.youtube.com/shorts/f_OGBg2KxgY", // Cable Lateral Raises (reuse sub-pu2a)
  "ub6":    "https://www.youtube.com/shorts/NyW2fT2gQhM", // Rope Hammer Curl (Cable) (reuse pl6)

  // ── New substitute videos ─────────────────────────────────────────────────
  // Full Body subs
  "sub-fb1a": "https://www.youtube.com/shorts/eLX_dyvooKQ", // Goblet Squat (reuse st1)
  "sub-fb1b": "https://www.youtube.com/shorts/nDh_BlnLCGc", // Leg Press (reuse sub-lg4b)
  "sub-fb2a": "https://www.youtube.com/shorts/MeV_WFmvBCU", // Single-Leg DB RDL (reuse sub-st2a)
  "sub-fb2b": "https://www.youtube.com/shorts/2VDjb79F1G4", // Good Morning (reuse sub-st2b style)
  "sub-fb3a": "https://www.youtube.com/shorts/SidmT09GXz8", // Flat DB Bench Press (reuse up3)
  "sub-fb3b": "https://www.youtube.com/shorts/QcAAKuEgYjw", // Push-Ups (reuse pw6)
  "sub-fb4a": "https://www.youtube.com/shorts/i9BJwVCK5VQ", // Single Arm DB Row
  "sub-fb4b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Cable Row V Bar (reuse pl1)
  "sub-fb5a": "https://www.youtube.com/shorts/k6tzKisR3NY", // DB Shoulder Press (reuse sub-rf5b)
  "sub-fb5b": "https://www.youtube.com/shorts/6K_N9AGhItQ", // Arnold Press
  "sub-fb6a": "https://www.youtube.com/shorts/f_OGBg2KxgY", // Cable Lateral Raise (reuse sub-pu2a)
  "sub-fb6b": "https://www.youtube.com/shorts/dybxZJaWxCY", // Machine Lateral Raise (reuse sub-pu2b)

  // Squat Day subs
  "sub-sq1a": "https://www.youtube.com/shorts/_qv0m3tPd3s", // Front Squat
  "sub-sq1b": "https://www.youtube.com/shorts/eLX_dyvooKQ", // Goblet Squat (reuse st1)
  "sub-sq2a": "https://www.youtube.com/shorts/PPmvh7gBTi0", // Barbell Back Squat (Jeff Nippard)
  "sub-sq2b": "https://www.youtube.com/shorts/2SZfFBglqT0", // Hack Squat (reuse sub-lg5a)
  "sub-sq3a": "https://www.youtube.com/shorts/eLX_dyvooKQ", // Goblet Squat (reuse st1)
  "sub-sq3b": "https://www.youtube.com/shorts/lG3MsPmEQQk", // Bulgarian Split Squat (reuse st3)
  "sub-sq4a": "https://www.youtube.com/shorts/2SZfFBglqT0", // Sissy Squat (reuse sub-lg5a)
  "sub-sq4b": "https://www.youtube.com/shorts/Tae3aeJe5Ks", // Single-Leg Extension (reuse lg5)
  "sub-sq5a": "https://www.youtube.com/shorts/ljZA17b52FE", // Reverse Lunge DB (reuse sub-st3a)
  "sub-sq5b": "https://www.youtube.com/shorts/lG3MsPmEQQk", // Bulgarian Split Squat (reuse st3)
  "sub-sq6a": "https://www.youtube.com/shorts/d6sg829PgNs", // Lying Hamstring Curl (reuse lg1)
  "sub-sq6b": "https://www.youtube.com/shorts/PM23l_EVxYc", // Nordic Hamstring Curl (reuse st4)

  // Bench Day subs
  "sub-bn1a": "https://www.youtube.com/shorts/SidmT09GXz8", // Flat DB Bench Press (reuse up3)
  "sub-bn1b": "https://www.youtube.com/shorts/hWbUlkb5Ms4", // Smith Machine Bench Press (reuse sub-up3a)
  "sub-bn2a": "https://www.youtube.com/shorts/PiJQPOiMua4", // 45° Incline DB Bench (reuse pu1)
  "sub-bn2b": "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Smith Machine (reuse sub-pu1b)
  "sub-bn3a": "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Barbell (reuse sub-pu1a)
  "sub-bn3b": "https://www.youtube.com/shorts/I-Ue34qLxc4", // Incline Cable Press (reuse sub-pu4a)
  "sub-bn4a": "https://www.youtube.com/shorts/atcyT99YDeI", // Flat DB Flies (reuse pu4)
  "sub-bn4b": "https://www.youtube.com/shorts/a9vQ_hwIksU", // Pec Deck (reuse sub-pu4b)
  "sub-bn5a": "https://www.youtube.com/shorts/b_r_LW4HEcM", // Overhead DB Extension (reuse sub-pu6a)
  "sub-bn5b": "https://www.youtube.com/shorts/4yKLxOsrGfg", // Close-Grip Bench Press
  "sub-bn6a": "https://www.youtube.com/shorts/7OF77JMEXhM", // Tricep Rope Pushdown (reuse sub-pu5a)
  "sub-bn6b": "https://www.youtube.com/shorts/sah-sHCZDS0", // Cable Kickback (reuse sub-pu6b)

  // Deadlift Day subs
  "sub-dl1a": "https://www.youtube.com/shorts/5rIqP63yWFg", // Romanian Deadlift (reuse st2)
  "sub-dl1b": "https://www.youtube.com/shorts/OVd1pq1cAvE", // Trap Bar Deadlift (reuse lg2)
  "sub-dl2a": "https://www.youtube.com/shorts/MlqHEfydPpE", // Barbell Shrugs
  "sub-dl2b": "https://www.youtube.com/shorts/ZhHw9HZGezY", // Deficit Deadlift (same as rack pull video)
  "sub-dl3a": "https://www.youtube.com/shorts/i9BJwVCK5VQ", // Single Arm DB Row
  "sub-dl3b": "https://www.youtube.com/shorts/DgyslsszCQ0", // T-Bar Row (reuse pl2)
  "sub-dl4a": "https://www.youtube.com/shorts/z-lxcsIN4T4", // Supinated Grip Pulldown (reuse pl3)
  "sub-dl4b": "https://www.youtube.com/shorts/AMR2l17Sm6M", // Straight-Arm Pulldown (reuse sub-pl3b)
  "sub-dl5a": "https://www.youtube.com/shorts/DgyslsszCQ0", // T-Bar Row (reuse pl2)
  "sub-dl5b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Cable Row V Bar (reuse pl1)
  "sub-dl6a": "https://www.youtube.com/shorts/MpyEGXCLS8M", // Band Pull-Apart (reuse sub-rf2a)
  "sub-dl6b": "https://www.youtube.com/shorts/JeSlI2s4XfM", // Bent-Over DB Reverse Fly (reuse sub-pl4b)

  // Press Day subs
  "sub-pr1a": "https://www.youtube.com/shorts/k6tzKisR3NY", // DB Shoulder Press (reuse sub-rf5b)
  "sub-pr1b": "https://www.youtube.com/shorts/6K_N9AGhItQ", // Arnold Press
  "sub-pr2a": "https://www.youtube.com/shorts/k6tzKisR3NY", // DB Overhead Press (reuse sub-rf5b)
  "sub-pr2b": "https://www.youtube.com/shorts/6v4nrRVySj0", // Shoulder Press Machine (reuse up5)
  "sub-pr3a": "https://www.youtube.com/shorts/f_OGBg2KxgY", // Cable Lateral Raise (reuse sub-pu2a)
  "sub-pr3b": "https://www.youtube.com/shorts/dybxZJaWxCY", // Machine Lateral Raise (reuse sub-pu2b)
  "sub-pr4a": "https://www.youtube.com/shorts/h9xfpTrAvkE", // Cable Front Raise (reuse pr4 video - close)
  "sub-pr4b": "https://www.youtube.com/shorts/AWsGWt-VMl8", // Barbell Front Raise (same as upright row channel)
  "sub-pr5a": "https://www.youtube.com/shorts/MpyEGXCLS8M", // Band Pull-Apart (reuse sub-rf2a)
  "sub-pr5b": "https://www.youtube.com/shorts/5TBjG5xuPa4", // Prone Y-Raise (reuse sub-rf2b)
  "sub-pr6a": "https://www.youtube.com/shorts/AWsGWt-VMl8", // Cable Upright Row (reuse pr6)
  "sub-pr6b": "https://www.youtube.com/shorts/OLePvpxQEGk", // Lateral Raises (reuse pu2)

  // Arnold Split — Chest & Back subs
  "sub-cb1a": "https://www.youtube.com/shorts/SidmT09GXz8", // Flat DB Bench (reuse up3)
  "sub-cb1b": "https://www.youtube.com/shorts/QcAAKuEgYjw", // Push-Ups (reuse pw6)
  "sub-cb2a": "https://www.youtube.com/shorts/DgyslsszCQ0", // T-Bar Row (reuse pl2)
  "sub-cb2b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Chest-Supported Row (reuse pl1 - close)
  "sub-cb3a": "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Barbell (reuse sub-pu1a)
  "sub-cb3b": "https://www.youtube.com/shorts/I-Ue34qLxc4", // Incline Cable Press (reuse sub-pu4a)
  "sub-cb4a": "https://www.youtube.com/shorts/z-lxcsIN4T4", // Supinated Grip Pulldown (reuse pl3)
  "sub-cb4b": "https://www.youtube.com/shorts/z-lxcsIN4T4", // Pull-Up (reuse lat pulldown - close)
  "sub-cb5a": "https://www.youtube.com/shorts/atcyT99YDeI", // Flat DB Flies (reuse pu4)
  "sub-cb5b": "https://www.youtube.com/shorts/a9vQ_hwIksU", // Pec Deck (reuse sub-pu4b)
  "sub-cb6a": "https://www.youtube.com/shorts/i9BJwVCK5VQ", // Single Arm DB Row
  "sub-cb6b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Machine Row (reuse pl1)

  // Arnold Split — Shoulders & Arms subs
  "sub-sa1a": "https://www.youtube.com/shorts/k6tzKisR3NY", // DB Overhead Press (reuse sub-rf5b)
  "sub-sa1b": "https://www.youtube.com/shorts/6v4nrRVySj0", // Shoulder Press Machine (reuse up5)
  "sub-sa2a": "https://www.youtube.com/shorts/f_OGBg2KxgY", // Cable Lateral Raise (reuse sub-pu2a)
  "sub-sa2b": "https://www.youtube.com/shorts/dybxZJaWxCY", // Machine Lateral Raise (reuse sub-pu2b)
  "sub-sa3a": "https://www.youtube.com/shorts/0y4tdUNPdlE", // EZ Bar Curl (reuse pl5)
  "sub-sa3b": "https://www.youtube.com/shorts/0y4tdUNPdlE", // DB Preacher Curl (reuse pl5)
  "sub-sa4a": "https://www.youtube.com/shorts/b_r_LW4HEcM", // Overhead DB Extension (reuse sub-pu6a)
  "sub-sa4b": "https://www.youtube.com/shorts/4yKLxOsrGfg", // Close-Grip Bench
  "sub-sa5a": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Cross-Body Hammer Curl (reuse pl6)
  "sub-sa5b": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Rope Hammer Curl (reuse pl6)
  "sub-sa6a": "https://www.youtube.com/shorts/mMVRVk0aPt4", // V-Bar Pushdown (reuse sub-up8a)
  "sub-sa6b": "https://www.youtube.com/shorts/nVo7WCDSNqQ", // Skull Crushers

  // Bro Split — Chest Day subs
  "sub-ch1a": "https://www.youtube.com/shorts/SidmT09GXz8", // Flat DB Bench (reuse up3)
  "sub-ch1b": "https://www.youtube.com/shorts/hWbUlkb5Ms4", // Smith Machine Bench (reuse sub-up3a)
  "sub-ch2a": "https://www.youtube.com/shorts/PiJQPOiMua4", // Incline DB Press (reuse pu1)
  "sub-ch2b": "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Smith Machine (reuse sub-pu1a)
  "sub-ch3a": "https://www.youtube.com/shorts/98HWfiRonkE", // Incline Barbell (reuse sub-pu1a)
  "sub-ch3b": "https://www.youtube.com/shorts/I-Ue34qLxc4", // Incline Cable Fly (reuse sub-pu4a)
  "sub-ch4a": "https://www.youtube.com/shorts/I-Ue34qLxc4", // Cable Crossover (reuse sub-pu4a)
  "sub-ch4b": "https://www.youtube.com/shorts/a9vQ_hwIksU", // Pec Deck (reuse sub-pu4b)
  "sub-ch5a": "https://www.youtube.com/shorts/atcyT99YDeI", // Flat DB Flies (reuse pu4)
  "sub-ch5b": "https://www.youtube.com/shorts/a9vQ_hwIksU", // Pec Deck (reuse sub-pu4b)
  "sub-ch6a": "https://www.youtube.com/shorts/ZDOrGNvRdM0", // Machine Dip (same as weighted dips video)
  "sub-ch6b": "https://www.youtube.com/shorts/QcAAKuEgYjw", // Decline Push-Ups (reuse pw6)

  // Bro Split — Back Day subs
  "sub-bk1a": "https://www.youtube.com/shorts/5rIqP63yWFg", // Romanian Deadlift (reuse st2)
  "sub-bk1b": "https://www.youtube.com/shorts/OVd1pq1cAvE", // Trap Bar Deadlift (reuse lg2)
  "sub-bk2a": "https://www.youtube.com/shorts/i9BJwVCK5VQ", // Single Arm DB Row
  "sub-bk2b": "https://www.youtube.com/shorts/DgyslsszCQ0", // T-Bar Row (reuse pl2)
  "sub-bk3a": "https://www.youtube.com/shorts/z-lxcsIN4T4", // Supinated Pulldown (reuse pl3)
  "sub-bk3b": "https://www.youtube.com/shorts/z-lxcsIN4T4", // Pull-Up (reuse lat pulldown)
  "sub-bk4a": "https://www.youtube.com/shorts/7PE3MlvGAts", // Wide Grip Row (reuse pl1)
  "sub-bk4b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Chest-Supported DB Row (reuse pl1)
  "sub-bk5a": "https://www.youtube.com/shorts/DgyslsszCQ0", // T-Bar Row (reuse pl2)
  "sub-bk5b": "https://www.youtube.com/shorts/7PE3MlvGAts", // Seated Cable Row V Bar (reuse pl1)
  "sub-bk6a": "https://www.youtube.com/shorts/MpyEGXCLS8M", // Band Pull-Apart (reuse sub-rf2a)
  "sub-bk6b": "https://www.youtube.com/shorts/JeSlI2s4XfM", // Bent-Over DB Reverse Fly (reuse sub-pl4b)

  // Bro Split — Shoulders Day subs
  "sub-sh1a": "https://www.youtube.com/shorts/k6tzKisR3NY", // DB Shoulder Press (reuse sub-rf5b)
  "sub-sh1b": "https://www.youtube.com/shorts/6K_N9AGhItQ", // Arnold Press
  "sub-sh2a": "https://www.youtube.com/shorts/k6tzKisR3NY", // DB Overhead Press (reuse sub-rf5b)
  "sub-sh2b": "https://www.youtube.com/shorts/6v4nrRVySj0", // Shoulder Press Machine (reuse up5)
  "sub-sh3a": "https://www.youtube.com/shorts/f_OGBg2KxgY", // Cable Lateral Raise (reuse sub-pu2a)
  "sub-sh3b": "https://www.youtube.com/shorts/dybxZJaWxCY", // Machine Lateral Raise (reuse sub-pu2b)
  "sub-sh4a": "https://www.youtube.com/shorts/h9xfpTrAvkE", // Cable Front Raise
  "sub-sh4b": "https://www.youtube.com/shorts/AWsGWt-VMl8", // Barbell Front Raise (reuse pr6)
  "sub-sh5a": "https://www.youtube.com/shorts/JeSlI2s4XfM", // Bent-Over DB Reverse Fly (reuse sub-pl4b)
  "sub-sh5b": "https://www.youtube.com/shorts/QfDqL93fr3A", // Cable Reverse Fly (reuse sub-pl4a)
  "sub-sh6a": "https://www.youtube.com/shorts/MlqHEfydPpE", // DB Shrugs (reuse sh6 barbell shrug video)
  "sub-sh6b": "https://www.youtube.com/shorts/MlqHEfydPpE", // Cable Shrug (reuse sh6)

  // Bro Split — Arms Day subs
  "sub-am1a": "https://www.youtube.com/shorts/0y4tdUNPdlE", // EZ Bar Curl (reuse pl5)
  "sub-am1b": "https://www.youtube.com/shorts/0y4tdUNPdlE", // DB Preacher Curl (reuse pl5)
  "sub-am2a": "https://www.youtube.com/shorts/b_r_LW4HEcM", // Overhead DB Extension (reuse sub-pu6a)
  "sub-am2b": "https://www.youtube.com/shorts/4yKLxOsrGfg", // Close-Grip Bench
  "sub-am3a": "https://www.youtube.com/shorts/0y4tdUNPdlE", // Spider Curl (reuse preacher curl - similar)
  "sub-am3b": "https://www.youtube.com/shorts/0y4tdUNPdlE", // Cable Curl (reuse pl5)
  "sub-am4a": "https://www.youtube.com/shorts/ci5tcFgIntI", // Tricep Dips (reuse ch6 weighted dips)
  "sub-am4b": "https://www.youtube.com/shorts/b_r_LW4HEcM", // Overhead Cable Extension (reuse sub-pu6a)
  "sub-am5a": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Cross-Body Hammer Curl (reuse pl6)
  "sub-am5b": "https://www.youtube.com/shorts/NyW2fT2gQhM", // Rope Hammer Curl (reuse pl6)
  "sub-am6a": "https://www.youtube.com/shorts/mMVRVk0aPt4", // V-Bar Pushdown (reuse sub-up8a)
  "sub-am6b": "https://www.youtube.com/shorts/nVo7WCDSNqQ", // Skull Crushers
};

// Get YouTube Short URL for an exercise, with fallback to search
export function getExerciseVideoUrl(exerciseId: string, exerciseName: string): string {
  if (EXERCISE_VIDEOS[exerciseId]) {
    return EXERCISE_VIDEOS[exerciseId];
  }
  // Fallback for custom exercises: YouTube search
  const query = encodeURIComponent(`${exerciseName} exercise form tutorial short`);
  return `https://www.youtube.com/results?search_query=${query}&sp=EgIYAQ%253D%253D`;
}

const GITHUB_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

// Maps custom exercise IDs to free-exercise-db folder names
const EXERCISE_DB_FOLDERS: Record<string, string> = {
  // ── Programme lib-* exercises — verified folder names from existing mappings ──
  "lib-1":  "Barbell_Bench_Press_-_Medium_Grip",       // Upper A: Barbell Bench Press
  "lib-13": "Face_Pull",                               // Upper B: Face Pulls
  "lib-18": "Alternate_Incline_Dumbbell_Curl",         // Upper B: Incline Dumbbell Curl
  "lib-19": "Triceps_Pushdown_-_Rope_Attachment",      // Upper B: Tricep Pushdown
  "lib-54": "Lateral_Box_Jump",                        // Lower B: Lateral Bound
  "lib-62": "Dips_-_Triceps_Version",                  // Upper A: Plate Loaded Dip Machine (closest match)
  "lib-64": "Seated_Cable_Rows",                       // Upper A: Mag Grip Seated Cable Row (closest match)
  "lib-66": "Box_Jump_Multiple_Response",              // Lower A: Box Jumps with Drop Jump

  // Power day
  pw1: "Box_Jump_Multiple_Response",
  pw2: "Depth_Jump_Leap",
  pw3: "One-Arm_Medicine_Ball_Slam",
  pw5: "One-Arm_Kettlebell_Swings",
  pw6: "Plyo_Kettlebell_Pushups",
  pw7: "Lateral_Box_Jump",

  // Agility day
  ag4: "Lateral_Box_Jump",
  ag6: "Carioca_Quick_Step",

  // Strength day
  st2: "Romanian_Deadlift_from_Deficit",
  st3: "Split_Squat_with_Dumbbells",

  // Reflexes day
  rf1: "Medicine_Ball_Chest_Pass",
  rf2: "Face_Pull",
  rf4: "Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench",
  rf5: "Dumbbell_Shoulder_Press",

  // Push day
  pu1: "Incline_Dumbbell_Bench_With_Palms_Facing_In",
  pu2: "Side_Lateral_Raise",
  pu3: "Incline_Dumbbell_Bench_With_Palms_Facing_In",
  pu4: "Dumbbell_Flyes",
  pu5: "Kneeling_Cable_Triceps_Extension",
  pu6: "Cable_One_Arm_Tricep_Extension",

  // Pull day
  pl1: "Seated_Cable_Rows",
  pl2: "T-Bar_Row_with_Handle",
  pl3: "Wide-Grip_Lat_Pulldown",
  pl4: "Face_Pull",
  pl5: "Two-Arm_Dumbbell_Preacher_Curl",
  pl6: "Preacher_Hammer_Dumbbell_Curl",

  // Legs day
  lg1: "Seated_Leg_Curl",
  lg2: "Romanian_Deadlift_from_Deficit",
  lg3: "Split_Squat_with_Dumbbells",
  lg5: "Leg_Extensions",
  lg6: "Standing_Calf_Raises",

  // Upper day
  up1: "Seated_Cable_Rows",
  up2: "Wide-Grip_Lat_Pulldown",
  up3: "Dumbbell_Bench_Press",
  up4: "Low_Cable_Crossover",
  up5: "Dumbbell_Shoulder_Press",
  up6: "Two-Arm_Dumbbell_Preacher_Curl",
  up7: "Preacher_Hammer_Dumbbell_Curl",
  up8: "Triceps_Pushdown_-_Rope_Attachment",

  // Full Body
  fb1: "Barbell_Squat",
  fb2: "Romanian_Deadlift_from_Deficit",
  fb3: "Barbell_Bench_Press_-_Medium_Grip",
  fb4: "Bent_Over_Barbell_Row",
  fb5: "Barbell_Shoulder_Press",
  fb6: "Side_Lateral_Raise",

  // 5/3/1 Squat Day
  sq1: "Barbell_Squat",
  sq2: "Front_Barbell_Squat",
  sq3: "Narrow_Stance_Leg_Press",
  sq4: "Leg_Extensions",
  sq5: "Bodyweight_Walking_Lunge",
  sq6: "Seated_Leg_Curl",

  // 5/3/1 Bench Day
  bn1: "Barbell_Bench_Press_-_Medium_Grip",
  bn2: "Barbell_Incline_Bench_Press_-_Medium_Grip",
  bn3: "Incline_Dumbbell_Bench_With_Palms_Facing_In",
  bn4: "Cable_Crossover",
  bn5: "EZ-Bar_Skullcrusher",
  bn6: "Kneeling_Cable_Triceps_Extension",

  // 5/3/1 Deadlift Day
  dl1: "Barbell_Deadlift",
  dl2: "Rack_Pulls",
  dl3: "Bent_Over_Barbell_Row",
  dl4: "Wide-Grip_Lat_Pulldown",
  dl5: "One-Arm_Dumbbell_Row",
  dl6: "Face_Pull",

  // 5/3/1 Press Day
  pr1: "Barbell_Shoulder_Press",
  pr2: "Arnold_Dumbbell_Press",
  pr3: "Side_Lateral_Raise",
  pr4: "Front_Incline_Dumbbell_Raise",
  pr5: "Face_Pull",
  pr6: "Upright_Barbell_Row",

  // Arnold Split — Chest & Back
  cb1: "Barbell_Bench_Press_-_Medium_Grip",
  cb2: "Bent_Over_Barbell_Row",
  cb3: "Incline_Dumbbell_Bench_With_Palms_Facing_In",
  cb4: "Wide-Grip_Lat_Pulldown",
  cb5: "Cable_Crossover",
  cb6: "Seated_Cable_Rows",

  // Arnold Split — Shoulders & Arms
  sa1: "Arnold_Dumbbell_Press",
  sa2: "Side_Lateral_Raise",
  sa3: "Wide-Grip_Standing_Barbell_Curl",
  sa4: "EZ-Bar_Skullcrusher",
  sa5: "Preacher_Hammer_Dumbbell_Curl",
  sa6: "Triceps_Pushdown_-_Rope_Attachment",

  // Bro Split — Chest Day
  ch1: "Barbell_Bench_Press_-_Medium_Grip",
  ch2: "Barbell_Incline_Bench_Press_-_Medium_Grip",
  ch3: "Incline_Dumbbell_Bench_With_Palms_Facing_In",
  ch4: "Dumbbell_Flyes",
  ch5: "Cable_Crossover",
  ch6: "Dips_-_Triceps_Version",

  // Bro Split — Back Day
  bk1: "Barbell_Deadlift",
  bk2: "Bent_Over_Barbell_Row",
  bk3: "Wide-Grip_Lat_Pulldown",
  bk4: "Seated_Cable_Rows",
  bk5: "One-Arm_Dumbbell_Row",
  bk6: "Face_Pull",

  // Bro Split — Shoulders Day
  sh1: "Barbell_Shoulder_Press",
  sh2: "Arnold_Dumbbell_Press",
  sh3: "Side_Lateral_Raise",
  sh4: "Front_Incline_Dumbbell_Raise",
  sh5: "Dumbbell_Lying_One-Arm_Rear_Lateral_Raise",
  sh6: "Barbell_Shrug",

  // Bro Split — Arms Day
  am1: "Wide-Grip_Standing_Barbell_Curl",
  am2: "EZ-Bar_Skullcrusher",
  am3: "Alternate_Incline_Dumbbell_Curl",
  am4: "Close-Grip_Barbell_Bench_Press",
  am5: "Preacher_Hammer_Dumbbell_Curl",
  am6: "Triceps_Pushdown_-_Rope_Attachment",
};

// Returns start/end form images for lib-db-* exercises and mapped custom exercises
export function getExerciseImages(exerciseId: string): { frame0: string; frame1: string } | null {
  let folder: string | null = null;
  if (exerciseId.startsWith("lib-db-")) {
    folder = exerciseId.replace("lib-db-", "");
  } else {
    folder = EXERCISE_DB_FOLDERS[exerciseId] ?? null;
  }
  if (!folder) return null;
  return {
    frame0: `${GITHUB_BASE}/${folder}/0.jpg`,
    frame1: `${GITHUB_BASE}/${folder}/1.jpg`,
  };
}
