import type { PrivacyTier } from "@/types";

export type SettingsUpdate = {
  display_name?: string;
  bio?: string | null;
  salary?: number | null;
  privacy_tier?: PrivacyTier;
  /** Visibility toggle enforced in feed/public-profile queries. */
  show_amounts_to_friends?: boolean;
  /** Visibility toggle for the derived giving percentage. */
  show_percentage_publicly?: boolean;
  /** Opt-out gate for the pending-donation digest email (DP-055). */
  email_notifications?: boolean;
};

const VALID_TIERS: readonly PrivacyTier[] = [
  "private",
  "friends_only",
  "open_giver",
];

export function validateSettings(data: SettingsUpdate): string | null {
  if (
    data.display_name !== undefined &&
    data.display_name.trim().length === 0
  ) {
    return "Display name cannot be empty.";
  }
  if (
    data.display_name !== undefined &&
    data.display_name.length > 60
  ) {
    return "Display name must be 60 characters or fewer.";
  }
  if (data.bio !== undefined && data.bio !== null && data.bio.length > 280) {
    return "Bio must be 280 characters or fewer.";
  }
  if (
    data.salary !== undefined &&
    data.salary !== null &&
    (data.salary <= 0 || !Number.isFinite(data.salary))
  ) {
    return "Salary must be a positive number.";
  }
  if (
    data.privacy_tier !== undefined &&
    !VALID_TIERS.includes(data.privacy_tier)
  ) {
    return "Invalid privacy tier.";
  }
  // Server actions receive untrusted input at runtime — reject anything
  // that isn't a plain boolean for the toggle fields.
  if (
    data.show_amounts_to_friends !== undefined &&
    typeof data.show_amounts_to_friends !== "boolean"
  ) {
    return "Invalid visibility setting.";
  }
  if (
    data.show_percentage_publicly !== undefined &&
    typeof data.show_percentage_publicly !== "boolean"
  ) {
    return "Invalid visibility setting.";
  }
  if (
    data.email_notifications !== undefined &&
    typeof data.email_notifications !== "boolean"
  ) {
    return "Invalid notification setting.";
  }
  return null;
}
