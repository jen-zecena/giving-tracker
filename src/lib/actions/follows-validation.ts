import type { PrivacyTier } from "@/types";

/**
 * Pure validation for `follow(targetId)`. Extracted so the rules can be
 * unit-tested without loading the Supabase client. Returns an error
 * message or `null` if the input is OK.
 */
export function validateFollowInput(
  currentUserId: string | null | undefined,
  targetId: string | null | undefined
): string | null {
  if (!currentUserId) return "You must be signed in.";
  if (!targetId) return "Missing target user id.";
  if (currentUserId === targetId) return "You can't follow yourself.";
  return null;
}

export type FollowBranch = "follow" | "request" | "blocked";

/**
 * Maps a target profile's privacy tier to the action the caller should
 * take. Keeps the branching logic centralized so tests can pin the
 * privacy contract without going through the DB.
 */
export function branchFollowByTier(tier: PrivacyTier): FollowBranch {
  switch (tier) {
    case "open_giver":
      return "follow";
    case "friends_only":
      return "request";
    case "private":
      return "blocked";
  }
}
