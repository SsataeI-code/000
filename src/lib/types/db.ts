/**
 * Database types — kept in sync with supabase/migrations.
 * When Supabase is connected you can regenerate with:
 *   supabase gen types typescript --project-id <ref> > src/lib/types/db.ts
 * Until then this hand-written shape is the contract the app codes against.
 * The shape mirrors Supabase's generated `GenericSchema` so the typed client
 * resolves rows/args correctly.
 */

/** The role model. Multi-coach-ready from day one (CLAUDE.md §1, §16). */
export type AppRole = "owner" | "coach" | "client";

/** Lifecycle of a coach↔client relationship. */
export type CoachClientStatus = "active" | "archived";

// NB: these are `type` aliases, not `interface`s — an interface is not
// assignable to Record<string, unknown>, which Supabase's GenericSchema
// requires, and using interfaces here silently degrades the typed client to
// `never`. Supabase's own generated types use `type` for the same reason.
export type Profile = {
  id: string;
  role: AppRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Coach = {
  id: string;
  coach_code: string;
  bio: string | null;
  created_at: string;
};

export type CoachClient = {
  id: string;
  coach_id: string;
  client_id: string;
  status: CoachClientStatus;
  consent_given_at: string;
  referred_by: string | null;
  created_at: string;
};

// --- Phase 1: nutrition / food logging ---

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "athlete";
export type Goal = "lose" | "maintain" | "recomp" | "gain" | "habits_only";
export type DietPreference = "balanced" | "low_carb" | "low_fat";
export type FoodLogSource = "scan" | "search" | "manual";

export type ClientProfile = {
  id: string;
  sex: Sex | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: ActivityLevel | null;
  goal: Goal;
  diet_preference: DietPreference;
  water_goal_ml: number;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WaterLog = {
  id: string;
  client_id: string;
  log_date: string;
  ml: number;
  created_at: string;
};

export type BodyMeasurement = {
  id: string;
  client_id: string;
  log_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  notes: string | null;
  created_at: string;
};

export type NutritionTargetRow = {
  id: string;
  client_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  method: string;
  computed_at: string;
};

export type FoodProduct = {
  barcode: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  serving_size_g: number | null;
  nutriments: Record<string, number>;
  updated_by: string | null;
  updated_at: string;
};

export type FoodLog = {
  id: string;
  client_id: string;
  log_date: string;
  logged_at: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutriments: Record<string, number> | null;
  source: FoodLogSource;
  created_at: string;
};

export type MealItem = {
  name: string;
  grams: number;
  nutrimentsPer100g: Record<string, number>;
};

export type Meal = {
  id: string;
  owner_id: string;
  name: string;
  items: MealItem[];
  created_at: string;
  updated_at: string;
};

// --- Phase 2: habits ---

export type HabitCategory =
  | "nutrition"
  | "movement"
  | "sleep"
  | "mindfulness"
  | "hydration"
  | "recovery";
export type HabitType = "checkbox" | "counter" | "duration" | "quantity";
export type HabitCadence = "daily" | "weekly_count" | "specific_days";

export type Habit = {
  id: string;
  client_id: string;
  name: string;
  category: HabitCategory;
  type: HabitType;
  target: number | null;
  unit: string | null;
  cadence: HabitCadence;
  times_per_week: number | null;
  days_of_week: number[] | null;
  reminder_time: string | null;
  why: string | null;
  anchor: string | null;
  position: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  client_id: string;
  log_date: string;
  value: number;
  completed: boolean;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      coaches: {
        Row: Coach;
        Insert: Partial<Coach> & { id: string; coach_code: string };
        Update: Partial<Coach>;
        Relationships: [];
      };
      coach_clients: {
        Row: CoachClient;
        Insert: Partial<CoachClient> & { coach_id: string; client_id: string };
        Update: Partial<CoachClient>;
        Relationships: [];
      };
      client_profiles: {
        Row: ClientProfile;
        Insert: Partial<ClientProfile> & { id: string };
        Update: Partial<ClientProfile>;
        Relationships: [];
      };
      nutrition_targets: {
        Row: NutritionTargetRow;
        Insert: Partial<NutritionTargetRow> & {
          client_id: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        };
        Update: Partial<NutritionTargetRow>;
        Relationships: [];
      };
      food_products: {
        Row: FoodProduct;
        Insert: Partial<FoodProduct> & { barcode: string };
        Update: Partial<FoodProduct>;
        Relationships: [];
      };
      food_logs: {
        Row: FoodLog;
        Insert: Partial<FoodLog> & { client_id: string; name: string };
        Update: Partial<FoodLog>;
        Relationships: [];
      };
      meals: {
        Row: Meal;
        Insert: Partial<Meal> & { owner_id: string; name: string };
        Update: Partial<Meal>;
        Relationships: [];
      };
      habits: {
        Row: Habit;
        Insert: Partial<Habit> & { client_id: string; name: string };
        Update: Partial<Habit>;
        Relationships: [];
      };
      habit_logs: {
        Row: HabitLog;
        Insert: Partial<HabitLog> & { habit_id: string; client_id: string; log_date: string };
        Update: Partial<HabitLog>;
        Relationships: [];
      };
      water_logs: {
        Row: WaterLog;
        Insert: Partial<WaterLog> & { client_id: string; ml: number };
        Update: Partial<WaterLog>;
        Relationships: [];
      };
      body_measurements: {
        Row: BodyMeasurement;
        Insert: Partial<BodyMeasurement> & { client_id: string; log_date: string };
        Update: Partial<BodyMeasurement>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      resolve_signup: {
        Args: {
          p_coach_code: string | null;
          p_consent: boolean;
          p_referral_code: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: AppRole;
      coach_client_status: CoachClientStatus;
      sex: Sex;
      activity_level: ActivityLevel;
      goal: Goal;
      diet_preference: DietPreference;
      food_log_source: FoodLogSource;
      habit_category: HabitCategory;
      habit_type: HabitType;
      habit_cadence: HabitCadence;
    };
    CompositeTypes: Record<never, never>;
  };
};
