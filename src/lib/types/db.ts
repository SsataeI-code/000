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
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
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
    };
    CompositeTypes: Record<never, never>;
  };
};
