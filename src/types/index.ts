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

export type FollowRequestStatus = "pending" | "accepted" | "rejected";

export type GoalType = "amount" | "count" | "organizations" | "causes";

export type GoalTimeframe = "month" | "year" | "ongoing";

export type NotificationType =
  | "like"
  | "follow"
  | "follow_request"
  | "badge"
  | "milestone"
  | "pending_donation";

export type NonprofitFlagReason =
  | "fraud"
  | "outdated"
  | "duplicate"
  | "inappropriate"
  | "other";

export type NonprofitFlagStatus =
  | "pending"
  | "reviewed"
  | "resolved"
  | "dismissed";

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
  welcome_email_sent_at: string | null;
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

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FollowRequestStatus;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  donation_id: string;
  donation_user_id: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: GoalType;
  target: number;
  current: number;
  timeframe: GoalTimeframe;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Nonprofit {
  id: string;
  ein: string;
  name: string;
  mission: string | null;
  category: string[];
  location: string | null;
  website: string | null;
  donation_url: string | null;
  verified: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  founded: number | null;
  size: string | null;
  revenue: number | null;
  tags: string[];
  synced_at: string | null;
  created_at: string;
}

export interface NonprofitFlag {
  id: string;
  nonprofit_id: string;
  user_id: string;
  reason: NonprofitFlagReason;
  description: string | null;
  status: NonprofitFlagStatus;
  admin_notes: string | null;
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
  hide_from_feed?: boolean;
}

// ============================================================
// Dashboard aggregation types
// ============================================================

export interface DashboardSummary {
  ytd_total: number;
  ytd_count: number;
  this_month_total: number;
  organizations_count: number;
  pending_count: number;
  streak_current: number;
  streak_longest: number;
  earned_badges_count: number;
  total_badges_count: number;
  salary_percentage: number | null; // null when salary not set
  salary_milestone_target: number | null;
}

export interface MonthlyTotal {
  month: string; // YYYY-MM
  total: number;
}

/**
 * A single point on the dashboard trend chart. `date` is the bucket's start
 * (ISO `yyyy-MM-dd` for day/week buckets, or a month's first day); `label`
 * is a pre-formatted axis label chosen for the current granularity.
 */
export interface TrendPoint {
  date: string;
  label: string;
  total: number;
}

/** Timeframe-scoped headline totals shown on the metric cards. */
export interface RangeTotals {
  total: number;
  count: number;
  organizations: number;
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

export interface DashboardData {
  summary: DashboardSummary;
  /** Timeframe-scoped totals for the headline metric cards. */
  range: RangeTotals;
  /** Timeframe-scoped trend series (granularity varies with span). */
  trend: TrendPoint[];
  scope: ScopeBreakdown[];
  cause: CauseBreakdown[];
  mom: MoMComparison;
  recent: Donation[];
}
