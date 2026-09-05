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
  referral_code: string | null;
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
  quiet_start: number | null;
  quiet_end: number | null;
  timezone: string | null;
  onboarded_at: string | null;
  strictness: string;
  diet_pattern: string;
  food_avoid: string;
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

export type LiftLog = {
  id: string;
  client_id: string;
  log_date: string;
  exercise: string;
  weight: number;
  unit: "lb" | "kg";
  reps: number;
  sets: number;
  note: string | null;
  created_at: string;
};

export type JournalEntry = {
  id: string;
  client_id: string;
  entry_date: string;
  body: string | null;
  mood: number | null;
  storage_path: string | null;
  created_at: string;
};

export type CheckIn = {
  id: string;
  client_id: string;
  week_start: string;
  weight_kg: number | null;
  energy: number | null;
  win: string | null;
  focus: string | null;
  created_at: string;
  updated_at: string;
};

export type BodyPhoto = {
  id: string;
  client_id: string;
  storage_path: string;
  taken_on: string;
  note: string | null;
  created_at: string;
};

export type WearableProviderId = "oura" | "fitbit" | "garmin" | "whoop";
export type WearableDaily = {
  id: string;
  client_id: string;
  provider: WearableProviderId;
  day: string;
  steps: number | null;
  sleep_minutes: number | null;
  resting_hr: number | null;
  updated_at: string;
};
export type WearableConnection = {
  id: string;
  client_id: string;
  provider: WearableProviderId;
  status: string;
  access_token: string | null;
  refresh_token: string | null;
  scope: string | null;
  external_user_id: string | null;
  expires_at: string | null;
  last_synced_at: string | null;
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
  photo_path: string | null;
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

// --- Phase 3: coach dashboard preferences ---

export type DashboardTilePref = { id: string; visible: boolean };
/** A client Today-screen section preference (same shape as a dashboard tile). */
export type ClientSectionPref = { id: string; visible: boolean };

export type CoachPrefs = {
  coach_id: string;
  dashboard: DashboardTilePref[];
  client_today: ClientSectionPref[];
  updated_at: string;
};

/** A per-client override of the Today-screen layout (else the coach default). */
export type ClientScreenOverride = {
  client_id: string;
  layout: ClientSectionPref[];
  updated_at: string;
};

// --- Phase 4: messaging ---

export type MessageKind = "coach" | "client" | "nudge";

export type Message = {
  id: string;
  coach_id: string;
  client_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type EngagementStateRow = {
  client_id: string;
  last_activity_on: string | null;
  coach_alerted: boolean;
  emailed_threshold: number;
  last_nudge_on: string | null;
  last_report_on: string | null;
  updated_at: string;
};

export type NotificationKind = "nudge" | "message" | "system" | "report";

export type Notification = {
  id: string;
  recipient_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

// --- Phase 6: growth (referrals + CMS) ---

export type ContentOverride = {
  key: string;
  value: string;
  updated_by: string | null;
  updated_at: string;
};

export type ReferralStatus = "joined" | "rewarded" | "declined";

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  coach_id: string;
  status: ReferralStatus;
  reward_note: string | null;
  created_at: string;
  processed_at: string | null;
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
      body_photos: {
        Row: BodyPhoto;
        Insert: Partial<BodyPhoto> & { client_id: string; storage_path: string };
        Update: Partial<BodyPhoto>;
        Relationships: [];
      };
      wearable_connections: {
        Row: WearableConnection;
        Insert: Partial<WearableConnection> & { client_id: string; provider: WearableProviderId };
        Update: Partial<WearableConnection>;
        Relationships: [];
      };
      wearable_daily: {
        Row: WearableDaily;
        Insert: Partial<WearableDaily> & { client_id: string; provider: WearableProviderId; day: string };
        Update: Partial<WearableDaily>;
        Relationships: [];
      };
      body_measurements: {
        Row: BodyMeasurement;
        Insert: Partial<BodyMeasurement> & { client_id: string; log_date: string };
        Update: Partial<BodyMeasurement>;
        Relationships: [];
      };
      lift_logs: {
        Row: LiftLog;
        Insert: Partial<LiftLog> & { client_id: string; exercise: string };
        Update: Partial<LiftLog>;
        Relationships: [];
      };
      journal_entries: {
        Row: JournalEntry;
        Insert: Partial<JournalEntry> & { client_id: string };
        Update: Partial<JournalEntry>;
        Relationships: [];
      };
      check_ins: {
        Row: CheckIn;
        Insert: Partial<CheckIn> & { client_id: string; week_start: string };
        Update: Partial<CheckIn>;
        Relationships: [];
      };
      coach_prefs: {
        Row: CoachPrefs;
        Insert: Partial<CoachPrefs> & { coach_id: string };
        Update: Partial<CoachPrefs>;
        Relationships: [];
      };
      client_screen_overrides: {
        Row: ClientScreenOverride;
        Insert: Partial<ClientScreenOverride> & { client_id: string };
        Update: Partial<ClientScreenOverride>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Partial<Message> & { coach_id: string; client_id: string; sender_id: string; body: string };
        Update: Partial<Message>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { recipient_id: string; title: string };
        Update: Partial<Notification>;
        Relationships: [];
      };
      engagement_state: {
        Row: EngagementStateRow;
        Insert: Partial<EngagementStateRow> & { client_id: string };
        Update: Partial<EngagementStateRow>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> & { user_id: string; endpoint: string; p256dh: string; auth: string };
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      referrals: {
        Row: Referral;
        Insert: Partial<Referral> & { referrer_id: string; referred_id: string; coach_id: string };
        Update: Partial<Referral>;
        Relationships: [];
      };
      content_overrides: {
        Row: ContentOverride;
        Insert: Partial<ContentOverride> & { key: string; value: string };
        Update: Partial<ContentOverride>;
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
      ensure_referral_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      process_referral: {
        Args: { p_id: string; p_status: ReferralStatus; p_note: string | null };
        Returns: undefined;
      };
      client_screen_layout: {
        Args: Record<string, never>;
        Returns: ClientSectionPref[];
      };
      delete_client: {
        Args: { p_client: string };
        Returns: undefined;
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
      message_kind: MessageKind;
      notification_kind: NotificationKind;
      referral_status: ReferralStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
