// ============================================================
// Enums
// ============================================================

export type PrivacyTier = "private" | "friends_only" | "open_giver";

export type DonationScope = "local" | "national" | "global";

export type CauseTag =
  | "education"
  | "health"
  | "environment"
  | "poverty"
  | "animal_welfare"
  | "arts_culture"
  | "disaster_relief"
  | "human_rights"
  | "community"
  | "religious";

export type RecurringFrequency = "weekly" | "monthly" | "quarterly" | "annually";

export type DonationStatus = "confirmed" | "pending" | "skipped";

// ============================================================
// Database row types
// ============================================================

export interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  salary_encrypted: string | null; // bytea, handled server-side only
  salary_range: string | null;
  privacy_tier: PrivacyTier;
  salary_updated_at: string | null;
  onboarding_completed: boolean;
  is_admin: boolean;
  show_amounts_to_friends: boolean;
  show_percentage_publicly: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  user_id: string;
  organization_name: string;
  amount: number;
  currency: string;
  donation_date: string;
  scope: DonationScope;
  cause_tag: CauseTag | null;
  custom_tag: string | null;
  notes: string | null;
  is_tax_deductible: boolean;
  is_recurring: boolean;
  recurring_schedule_id: string | null;
  status: DonationStatus;
  is_private_override: boolean;
  hide_from_feed: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringSchedule {
  id: string;
  user_id: string;
  organization_name: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  cause_tag: CauseTag | null;
  custom_tag: string | null;
  scope: DonationScope;
  next_due_date: string;
  is_active: boolean;
  is_auto_confirm: boolean;
  consecutive_confirmations: number;
  created_at: string;
  updated_at: string;
}

export interface PrivacyOverride {
  id: string;
  user_id: string;
  field_name: string;
  is_visible: boolean;
  created_at: string;
}

// ============================================================
// Form / input types (subset of DB types used in UI)
// ============================================================

export interface DonationFormData {
  organization_name: string;
  amount: number;
  donation_date: string;
  scope: DonationScope;
  is_recurring: boolean;
  frequency?: RecurringFrequency;
  cause_tag?: CauseTag | null;
  custom_tag?: string;
  notes?: string;
  is_tax_deductible: boolean;
  is_private_override: boolean;
}

// ============================================================
// Dashboard aggregation types
// ============================================================

export interface DashboardSummary {
  ytd_total: number;
  ytd_count: number;
  pending_count: number;
  streak_months: number;
  salary_percentage: number | null; // null when salary not set
  salary_milestone_target: number | null;
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  total: number;
}

export interface ScopeBreakdown {
  scope: DonationScope;
  total: number;
  count: number;
}

export interface CauseBreakdown {
  cause_tag: CauseTag | "uncategorized";
  total: number;
  count: number;
}

export interface MoMComparison {
  current_month_total: number;
  previous_month_total: number;
  percentage_change: number | null; // null if no previous data
}
