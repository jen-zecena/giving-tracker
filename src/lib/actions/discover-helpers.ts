import type { PrivacyTier } from "@/types";

/**
 * Button state for a Discover user card. Private profiles are excluded
 * upstream so they never reach this helper — hence only the two
 * followable tiers are accepted.
 */
export type FollowButtonState = "follow" | "request" | "pending" | "following";

export function getFollowButtonState(
  targetTier: Exclude<PrivacyTier, "private">,
  isFollowing: boolean,
  hasPendingOutgoing: boolean
): FollowButtonState {
  if (isFollowing) return "following";
  if (hasPendingOutgoing) return "pending";
  return targetTier === "open_giver" ? "follow" : "request";
}

export type DiscoverSearchable = {
  display_name: string | null;
  bio: string | null;
};

/**
 * Case-insensitive includes filter. Matches on display_name or bio.
 * Empty / whitespace-only query returns every input row unchanged —
 * the caller doesn't need to special-case the empty-search path.
 */
export function filterDiscoverUsers<T extends DiscoverSearchable>(
  users: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter((u) => {
    const name = (u.display_name ?? "").toLowerCase();
    const bio = (u.bio ?? "").toLowerCase();
    return name.includes(q) || bio.includes(q);
  });
}
