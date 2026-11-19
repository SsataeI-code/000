/**
 * Training module (add-on brief §4.1). Canonical exercise library — the ~150
 * common exercises shipped pre-loaded. Pure data so it feeds the DB seed
 * (migration 0031), the app, and tests from one source of truth. Reference
 * tags only (muscle groups, movement pattern, equipment, tracking type); no
 * invented numbers. Coaches add their own custom exercises on top (CMS/§4.1).
 */

/** How a set for an exercise is measured (§4.1 tracking type). */
export type TrackingType =
  | "weight_reps" // load × reps (most lifts)
  | "bodyweight_reps" // calisthenics, optional added load
  | "time" // holds / carries (plank, dead hang)
  | "distance_time" // runs, rows, rides
  | "reps"; // reps only, no load (e.g. jumping jacks)

export const TRACKING_TYPES: TrackingType[] = ["weight_reps", "bodyweight_reps", "time", "distance_time", "reps"];

export interface SeedExercise {
  name: string;
  muscles: string[]; // primary muscle groups
  pattern: string; // movement pattern
  equipment: string; // primary equipment
  tracking: TrackingType;
}

const W: TrackingType = "weight_reps";
const BW: TrackingType = "bodyweight_reps";
const T: TrackingType = "time";
const DT: TrackingType = "distance_time";
const R: TrackingType = "reps";

/** [name, muscles, pattern, equipment, tracking] — kept terse; one row per exercise. */
const ROWS: [string, string[], string, string, TrackingType][] = [
  // ---- Chest (horizontal/incline push) ----
  ["Barbell Bench Press", ["chest", "triceps", "front_delts"], "horizontal_push", "barbell", W],
  ["Incline Barbell Bench Press", ["chest", "front_delts", "triceps"], "horizontal_push", "barbell", W],
  ["Decline Barbell Bench Press", ["chest", "triceps"], "horizontal_push", "barbell", W],
  ["Dumbbell Bench Press", ["chest", "triceps", "front_delts"], "horizontal_push", "dumbbell", W],
  ["Incline Dumbbell Bench Press", ["chest", "front_delts", "triceps"], "horizontal_push", "dumbbell", W],
  ["Dumbbell Fly", ["chest"], "horizontal_push", "dumbbell", W],
  ["Incline Dumbbell Fly", ["chest"], "horizontal_push", "dumbbell", W],
  ["Cable Crossover", ["chest"], "horizontal_push", "cable", W],
  ["Pec Deck Machine", ["chest"], "horizontal_push", "machine", W],
  ["Machine Chest Press", ["chest", "triceps"], "horizontal_push", "machine", W],
  ["Push-Up", ["chest", "triceps", "core"], "horizontal_push", "bodyweight", BW],
  ["Incline Push-Up", ["chest", "triceps"], "horizontal_push", "bodyweight", BW],
  ["Decline Push-Up", ["chest", "front_delts"], "horizontal_push", "bodyweight", BW],
  ["Dip", ["chest", "triceps"], "vertical_push", "dip_bars", BW],
  ["Smith Machine Bench Press", ["chest", "triceps"], "horizontal_push", "smith", W],
  ["Svend Press", ["chest"], "horizontal_push", "plate", W],

  // ---- Back (vertical/horizontal pull) ----
  ["Deadlift", ["back", "hamstrings", "glutes"], "hinge", "barbell", W],
  ["Pull-Up", ["lats", "upper_back", "biceps"], "vertical_pull", "pullup_bar", BW],
  ["Chin-Up", ["lats", "biceps"], "vertical_pull", "pullup_bar", BW],
  ["Lat Pulldown", ["lats", "biceps"], "vertical_pull", "cable", W],
  ["Close-Grip Lat Pulldown", ["lats", "biceps"], "vertical_pull", "cable", W],
  ["Barbell Row", ["back", "lats", "rear_delts"], "horizontal_pull", "barbell", W],
  ["Pendlay Row", ["back", "lats"], "horizontal_pull", "barbell", W],
  ["Dumbbell Row", ["lats", "upper_back", "biceps"], "horizontal_pull", "dumbbell", W],
  ["Seated Cable Row", ["back", "lats", "rear_delts"], "horizontal_pull", "cable", W],
  ["T-Bar Row", ["back", "lats"], "horizontal_pull", "barbell", W],
  ["Chest-Supported Row", ["upper_back", "lats"], "horizontal_pull", "machine", W],
  ["Machine Row", ["back", "lats"], "horizontal_pull", "machine", W],
  ["Straight-Arm Pulldown", ["lats"], "vertical_pull", "cable", W],
  ["Inverted Row", ["back", "lats", "biceps"], "horizontal_pull", "bodyweight", BW],
  ["Rack Pull", ["back", "glutes", "hamstrings"], "hinge", "barbell", W],
  ["Barbell Shrug", ["traps"], "isolation", "barbell", W],
  ["Dumbbell Shrug", ["traps"], "isolation", "dumbbell", W],
  ["Face Pull", ["rear_delts", "upper_back"], "horizontal_pull", "cable", W],

  // ---- Shoulders ----
  ["Overhead Press", ["shoulders", "triceps"], "vertical_push", "barbell", W],
  ["Seated Dumbbell Shoulder Press", ["shoulders", "triceps"], "vertical_push", "dumbbell", W],
  ["Arnold Press", ["shoulders", "triceps"], "vertical_push", "dumbbell", W],
  ["Push Press", ["shoulders", "triceps"], "vertical_push", "barbell", W],
  ["Machine Shoulder Press", ["shoulders", "triceps"], "vertical_push", "machine", W],
  ["Dumbbell Lateral Raise", ["side_delts"], "isolation", "dumbbell", W],
  ["Cable Lateral Raise", ["side_delts"], "isolation", "cable", W],
  ["Dumbbell Front Raise", ["front_delts"], "isolation", "dumbbell", W],
  ["Reverse Pec Deck", ["rear_delts"], "isolation", "machine", W],
  ["Bent-Over Reverse Fly", ["rear_delts"], "isolation", "dumbbell", W],
  ["Upright Row", ["side_delts", "traps"], "vertical_pull", "barbell", W],
  ["Landmine Press", ["shoulders", "chest"], "vertical_push", "barbell", W],

  // ---- Biceps ----
  ["Barbell Curl", ["biceps"], "isolation", "barbell", W],
  ["EZ-Bar Curl", ["biceps"], "isolation", "ez_bar", W],
  ["Dumbbell Curl", ["biceps"], "isolation", "dumbbell", W],
  ["Hammer Curl", ["biceps", "forearms"], "isolation", "dumbbell", W],
  ["Incline Dumbbell Curl", ["biceps"], "isolation", "dumbbell", W],
  ["Preacher Curl", ["biceps"], "isolation", "ez_bar", W],
  ["Cable Curl", ["biceps"], "isolation", "cable", W],
  ["Concentration Curl", ["biceps"], "isolation", "dumbbell", W],
  ["Spider Curl", ["biceps"], "isolation", "dumbbell", W],

  // ---- Triceps ----
  ["Close-Grip Bench Press", ["triceps", "chest"], "horizontal_push", "barbell", W],
  ["Triceps Pushdown", ["triceps"], "isolation", "cable", W],
  ["Rope Pushdown", ["triceps"], "isolation", "cable", W],
  ["Overhead Cable Extension", ["triceps"], "isolation", "cable", W],
  ["Skull Crusher", ["triceps"], "isolation", "ez_bar", W],
  ["Dumbbell Overhead Extension", ["triceps"], "isolation", "dumbbell", W],
  ["Bench Dip", ["triceps"], "isolation", "bodyweight", BW],
  ["Diamond Push-Up", ["triceps", "chest"], "horizontal_push", "bodyweight", BW],
  ["Kickback", ["triceps"], "isolation", "dumbbell", W],

  // ---- Quads (squat) ----
  ["Back Squat", ["quads", "glutes"], "squat", "barbell", W],
  ["Front Squat", ["quads", "core"], "squat", "barbell", W],
  ["High-Bar Squat", ["quads", "glutes"], "squat", "barbell", W],
  ["Box Squat", ["quads", "glutes"], "squat", "barbell", W],
  ["Goblet Squat", ["quads", "glutes"], "squat", "dumbbell", W],
  ["Hack Squat", ["quads"], "squat", "machine", W],
  ["Leg Press", ["quads", "glutes"], "squat", "machine", W],
  ["Leg Extension", ["quads"], "isolation", "machine", W],
  ["Bulgarian Split Squat", ["quads", "glutes"], "lunge", "dumbbell", W],
  ["Walking Lunge", ["quads", "glutes"], "lunge", "dumbbell", W],
  ["Reverse Lunge", ["quads", "glutes"], "lunge", "dumbbell", W],
  ["Step-Up", ["quads", "glutes"], "lunge", "dumbbell", W],
  ["Smith Machine Squat", ["quads", "glutes"], "squat", "smith", W],
  ["Pistol Squat", ["quads", "glutes"], "squat", "bodyweight", BW],
  ["Wall Sit", ["quads"], "squat", "bodyweight", T],

  // ---- Hamstrings / Glutes (hinge) ----
  ["Romanian Deadlift", ["hamstrings", "glutes"], "hinge", "barbell", W],
  ["Stiff-Leg Deadlift", ["hamstrings", "glutes"], "hinge", "barbell", W],
  ["Dumbbell Romanian Deadlift", ["hamstrings", "glutes"], "hinge", "dumbbell", W],
  ["Trap Bar Deadlift", ["glutes", "hamstrings", "quads"], "hinge", "trap_bar", W],
  ["Sumo Deadlift", ["glutes", "hamstrings", "adductors"], "hinge", "barbell", W],
  ["Hip Thrust", ["glutes", "hamstrings"], "hinge", "barbell", W],
  ["Glute Bridge", ["glutes"], "hinge", "bodyweight", BW],
  ["Lying Leg Curl", ["hamstrings"], "isolation", "machine", W],
  ["Seated Leg Curl", ["hamstrings"], "isolation", "machine", W],
  ["Nordic Hamstring Curl", ["hamstrings"], "isolation", "bodyweight", BW],
  ["Good Morning", ["hamstrings", "back"], "hinge", "barbell", W],
  ["Cable Pull-Through", ["glutes", "hamstrings"], "hinge", "cable", W],
  ["Kettlebell Swing", ["glutes", "hamstrings"], "hinge", "kettlebell", W],
  ["Back Extension", ["glutes", "hamstrings", "back"], "hinge", "bodyweight", BW],
  ["Cable Kickback", ["glutes"], "isolation", "cable", W],
  ["Hip Abduction Machine", ["abductors", "glutes"], "isolation", "machine", W],
  ["Hip Adduction Machine", ["adductors"], "isolation", "machine", W],

  // ---- Calves ----
  ["Standing Calf Raise", ["calves"], "isolation", "machine", W],
  ["Seated Calf Raise", ["calves"], "isolation", "machine", W],
  ["Dumbbell Calf Raise", ["calves"], "isolation", "dumbbell", W],
  ["Leg Press Calf Raise", ["calves"], "isolation", "machine", W],

  // ---- Core / Abs ----
  ["Plank", ["core", "abs"], "core", "bodyweight", T],
  ["Side Plank", ["obliques", "core"], "core", "bodyweight", T],
  ["Hanging Leg Raise", ["abs", "hip_flexors"], "core", "pullup_bar", BW],
  ["Hanging Knee Raise", ["abs"], "core", "pullup_bar", BW],
  ["Cable Crunch", ["abs"], "core", "cable", W],
  ["Crunch", ["abs"], "core", "bodyweight", R],
  ["Sit-Up", ["abs", "hip_flexors"], "core", "bodyweight", R],
  ["Russian Twist", ["obliques"], "rotation", "bodyweight", R],
  ["Bicycle Crunch", ["abs", "obliques"], "core", "bodyweight", R],
  ["Ab Wheel Rollout", ["abs", "core"], "core", "bodyweight", R],
  ["Dead Bug", ["core", "abs"], "core", "bodyweight", R],
  ["Mountain Climber", ["core", "hip_flexors"], "core", "bodyweight", T],
  ["Hollow Body Hold", ["abs", "core"], "core", "bodyweight", T],
  ["Pallof Press", ["core", "obliques"], "rotation", "cable", W],
  ["Captain's Chair Leg Raise", ["abs"], "core", "machine", BW],

  // ---- Olympic / power / full-body ----
  ["Power Clean", ["full_body", "traps", "glutes"], "olympic", "barbell", W],
  ["Hang Clean", ["full_body", "traps"], "olympic", "barbell", W],
  ["Clean and Jerk", ["full_body"], "olympic", "barbell", W],
  ["Snatch", ["full_body"], "olympic", "barbell", W],
  ["Clean Pull", ["back", "traps", "glutes"], "olympic", "barbell", W],
  ["Thruster", ["quads", "shoulders"], "squat", "barbell", W],
  ["Dumbbell Thruster", ["quads", "shoulders"], "squat", "dumbbell", W],
  ["Medicine Ball Slam", ["full_body", "core"], "conditioning", "medicine_ball", R],
  ["Box Jump", ["quads", "glutes"], "conditioning", "box", R],
  ["Burpee", ["full_body"], "conditioning", "bodyweight", R],
  ["Kettlebell Clean", ["full_body", "glutes"], "olympic", "kettlebell", W],
  ["Kettlebell Snatch", ["full_body", "shoulders"], "olympic", "kettlebell", W],
  ["Turkish Get-Up", ["full_body", "core"], "conditioning", "kettlebell", W],

  // ---- Carries / conditioning / cardio ----
  ["Farmer's Carry", ["traps", "forearms", "core"], "carry", "dumbbell", T],
  ["Suitcase Carry", ["obliques", "forearms", "core"], "carry", "dumbbell", T],
  ["Sled Push", ["quads", "glutes", "full_body"], "conditioning", "sled", DT],
  ["Sled Pull", ["back", "hamstrings"], "conditioning", "sled", DT],
  ["Battle Ropes", ["shoulders", "core"], "conditioning", "band", T],
  ["Jump Rope", ["calves", "full_body"], "conditioning", "jump_rope", T],
  ["Rowing Machine", ["full_body", "back"], "conditioning", "rower", DT],
  ["Assault Bike", ["full_body"], "conditioning", "bike", DT],
  ["Treadmill Run", ["full_body"], "gait", "treadmill", DT],
  ["Outdoor Run", ["full_body"], "gait", "bodyweight", DT],
  ["Stationary Bike", ["quads", "full_body"], "conditioning", "bike", DT],
  ["Incline Treadmill Walk", ["glutes", "calves"], "gait", "treadmill", DT],
  ["Stair Climber", ["glutes", "quads"], "conditioning", "machine", DT],
  ["Elliptical", ["full_body"], "conditioning", "machine", DT],
  ["Jumping Jacks", ["full_body"], "conditioning", "bodyweight", R],
  ["High Knees", ["hip_flexors", "calves"], "conditioning", "bodyweight", T],

  // ---- Forearms / misc isolation ----
  ["Wrist Curl", ["forearms"], "isolation", "barbell", W],
  ["Reverse Wrist Curl", ["forearms"], "isolation", "barbell", W],
  ["Reverse Curl", ["forearms", "biceps"], "isolation", "ez_bar", W],
  ["Dead Hang", ["forearms", "lats"], "core", "pullup_bar", T],
];

export const EXERCISE_LIBRARY: SeedExercise[] = ROWS.map(([name, muscles, pattern, equipment, tracking]) => ({
  name,
  muscles,
  pattern,
  equipment,
  tracking,
}));
