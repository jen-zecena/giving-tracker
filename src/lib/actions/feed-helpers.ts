import type { PrivacyTier } from "@/types";

/**
 * Whether the feed card should display the donation amount.
 *
 *   - Private donors never appear in the feed at all; we still return
 *     `false` defensively so an accidental leak through RLS can't paint
 *     a dollar number on screen.
 *   - Open-giver amounts are public.
 *   - Friends-only amounts require BOTH the viewer to follow the donor
 *     AND the donor's `show_amounts_to_friends` flag. In the Feed page
 *     today the first predicate is always true (feed is constrained to
 *     followed users), but it's still threaded so the helper is reusable
 *     by the public UserProfile page (DP-045).
 */
export function shouldShowAmount(
  donorPrivacyTier: PrivacyTier,
  donorShowAmountsToFriends: boolean,
  viewerFollowsDonor: boolean
): boolean {
  if (donorPrivacyTier === "private") return false;
  if (donorPrivacyTier === "open_giver") return true;
  return viewerFollowsDonor && donorShowAmountsToFriends;
}

/**
 * The Figma spec has two distinct empty states:
 *   - no follows yet       → prompt the user to discover people
 *   - follows, but nothing → show "no recent activity" with a refresh hint
 *
 * Consolidated here so the page can stay declarative.
 */
export type FeedEmptyStateKind = "no-follows" | "no-activity";

export function resolveEmptyStateKind(
  followsCount: number
): FeedEmptyStateKind {
  return followsCount === 0 ? "no-follows" : "no-activity";
}

// ── Own-post visibility ───────────────────────────────────

export type OwnVisibility = "only_you" | "friends" | "everyone";

/**
 * What OTHER people can see of one of your own feed items — powers the
 * visibility badge on your own cards ("your feed shows what theirs
 * would"). Mirrors the real visibility contract:
 *
 *   - hide_from_feed / per-gift private override / private tier
 *     → nobody else sees it at all
 *   - friends_only → followers you approved (amounts still gated
 *     separately by show_amounts_to_friends)
 *   - open_giver → anyone
 */
export function ownVisibility(
  tier: PrivacyTier,
  hideFromFeed: boolean,
  isPrivateOverride: boolean
): OwnVisibility {
  if (hideFromFeed || isPrivateOverride || tier === "private") {
    return "only_you";
  }
  return tier === "friends_only" ? "friends" : "everyone";
}
