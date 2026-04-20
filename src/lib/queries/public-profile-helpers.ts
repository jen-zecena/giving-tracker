import type { PrivacyTier } from "@/types";

/**
 * Pure visibility resolver for the public profile page.
 *
 *   - `open_giver`    → always visible.
 *   - `friends_only`  → visible only to viewers who already follow the
 *                       target. Non-followers see the private card.
 *   - `private`       → always hidden to non-owners.
 *
 * Extracted from the server query so it can be unit-tested without a
 * Supabase client. The DP-046 RLS policy is the real gate — this
 * helper only decides which UI branch to render.
 */
export function resolvePublicProfileVisibility(params: {
  tier: PrivacyTier;
  isFollowing: boolean;
}): "visible" | "hidden" {
  switch (params.tier) {
    case "open_giver":
      return "visible";
    case "friends_only":
      return params.isFollowing ? "visible" : "hidden";
    case "private":
      return "hidden";
  }
}

/**
 * Pure amount-visibility rule: "should the viewer see monetary amounts
 * for this target?" The DP-004 product decision is that `friends_only`
 * profiles can separately opt in to sharing amounts with approved
 * followers (`show_amounts_to_friends`). `open_giver` always shows
 * amounts; `private` profiles never reach this helper because the
 * whole page is hidden upstream.
 */
export function resolveShowAmounts(params: {
  tier: PrivacyTier;
  isFollowing: boolean;
  showAmountsToFriends: boolean;
}): boolean {
  if (params.tier === "open_giver") return true;
  if (params.tier === "friends_only") {
    return params.isFollowing && params.showAmountsToFriends;
  }
  return false;
}

/**
 * Button state for the Follow / Requested / Following control on the
 * public profile header. Mirrors `getFollowButtonState` from the
 * Discover helpers but includes the `private` terminal state so the
 * header can be rendered for hidden profiles too.
 */
export type PublicFollowButtonState =
  | "follow"
  | "request"
  | "pending"
  | "following"
  | "private";

export function getPublicFollowButtonState(params: {
  tier: PrivacyTier;
  isFollowing: boolean;
  hasPendingRequest: boolean;
}): PublicFollowButtonState {
  if (params.isFollowing) return "following";
  if (params.hasPendingRequest) return "pending";
  switch (params.tier) {
    case "open_giver":
      return "follow";
    case "friends_only":
      return "request";
    case "private":
      return "private";
  }
}
