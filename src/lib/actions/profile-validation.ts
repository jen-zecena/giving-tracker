import type { PrivacyTier } from "@/types";

export type SettingsUpdate = {
  display_name?: string;
  bio?: string | null;
  salary?: number | null;
  privacy_tier?: PrivacyTier;
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
  return null;
}
