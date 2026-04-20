import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CauseTag, DonationScope, PrivacyTier } from "@/types";

import {
  resolvePublicProfileVisibility,
  resolveShowAmounts,
} from "./public-profile-helpers";

export type PublicRecentDonation = {
  id: string;
  organization_name: string;
  amount: number;
  donation_date: string;
  cause_tag: CauseTag | null;
  scope: DonationScope;
  is_recurring: boolean;
};

export type PublicProfileStats = {
  total_donated: number;
  donation_count: number;
  organization_count: number;
  follower_count: number;
  /**
   * When false, the total_donated / per-donation amounts should not be
   * rendered — the target is `friends_only` and hasn't opted in via
   * `show_amounts_to_friends`. Counts are still safe to show.
   */
  show_amounts: boolean;
};

export type PublicProfileHeader = {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  privacy_tier: PrivacyTier;
};

export type PublicProfileResult =
  | { status: "self"; user_id: string }
  | { status: "not_found" }
  | {
      status: "hidden";
      header: PublicProfileHeader;
      /**
       * Whether the viewer has an outstanding follow_request to the
       * target. Drives the button state on the private-card view.
       */
      hasPendingRequest: boolean;
    }
  | {
      status: "visible";
      header: PublicProfileHeader;
      stats: PublicProfileStats;
      recent_donations: PublicRecentDonation[];
      viewer: {
        is_following: boolean;
        has_pending_request: boolean;
      };
    };

/**
 * Loads the public view of another user's profile. Handles the three
 * visibility outcomes from FIGMA_PORT_PLAN.md §7:
 *
 *   - `self`      → caller is viewing their own id; caller redirects
 *                   to `/profile` (the private, owner-only page).
 *   - `visible`   → viewer is allowed to see the profile. Includes
 *                   stats + 5 most-recent donations. Stats' amounts
 *                   are masked when target is `friends_only` and the
 *                   viewer hasn't been granted amounts via
 *                   `show_amounts_to_friends`.
 *   - `hidden`    → target exists but is private to this viewer. The
 *                   header (name / avatar / tier) is returned via
 *                   service-role so the UI can show a friendly
 *                   "This profile is private" card without leaking
 *                   giving data.
 *   - `not_found` → no profile row for the given id.
 *
 * Donation rows use the viewer-scoped client so DP-046's tier-aware
 * RLS does the real gatekeeping — `hide_from_feed` rows and donations
 * from non-followed friends_only profiles are filtered server-side.
 *
 * Returns `null` when the caller is unauthenticated; the page
 * redirects to login in that case.
 */
export async function getPublicProfileData(
  targetUserId: string
): Promise<PublicProfileResult | null> {
  if (!targetUserId) return { status: "not_found" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (user.id === targetUserId) {
    return { status: "self", user_id: user.id };
  }

  // Target metadata via service-role so we can distinguish "doesn't
  // exist" from "hidden by RLS" and can drive the private-card view.
  const admin = createServiceRoleClient();
  const { data: targetRow } = await admin
    .from("profiles")
    .select(
      "id, display_name, bio, avatar_url, privacy_tier, show_amounts_to_friends"
    )
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetRow) return { status: "not_found" };

  const header: PublicProfileHeader = {
    user_id: targetRow.id as string,
    display_name: (targetRow.display_name as string | null) ?? null,
    bio: (targetRow.bio as string | null) ?? null,
    avatar_url: (targetRow.avatar_url as string | null) ?? null,
    privacy_tier: targetRow.privacy_tier as PrivacyTier,
  };

  const [followRes, requestRes] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId),
    supabase
      .from("follow_requests")
      .select("id", { count: "exact", head: true })
      .eq("from_user_id", user.id)
      .eq("to_user_id", targetUserId)
      .eq("status", "pending"),
  ]);

  const isFollowing = (followRes.count ?? 0) > 0;
  const hasPendingRequest = (requestRes.count ?? 0) > 0;

  const visibility = resolvePublicProfileVisibility({
    tier: header.privacy_tier,
    isFollowing,
  });

  if (visibility === "hidden") {
    return { status: "hidden", header, hasPendingRequest };
  }

  // From here on, the viewer is allowed to see the profile.
  const [donationsRes, followerRes, recentRes] = await Promise.all([
    supabase
      .from("donations")
      .select("amount, organization_name")
      .eq("user_id", targetUserId)
      .eq("status", "confirmed"),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", targetUserId),
    supabase
      .from("donations")
      .select(
        "id, organization_name, amount, donation_date, cause_tag, scope, is_recurring"
      )
      .eq("user_id", targetUserId)
      .eq("status", "confirmed")
      .order("donation_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const donationRows = (donationsRes.data ?? []) as Array<{
    amount: number | string;
    organization_name: string;
  }>;

  const total = donationRows.reduce((sum, d) => sum + Number(d.amount), 0);
  const showAmounts = resolveShowAmounts({
    tier: header.privacy_tier,
    isFollowing,
    showAmountsToFriends: Boolean(targetRow.show_amounts_to_friends),
  });

  const stats: PublicProfileStats = {
    total_donated: total,
    donation_count: donationRows.length,
    organization_count: new Set(donationRows.map((d) => d.organization_name))
      .size,
    follower_count: followerRes.count ?? 0,
    show_amounts: showAmounts,
  };

  const recent_donations = ((recentRes.data ?? []) as PublicRecentDonation[])
    .map((d) => ({ ...d, amount: Number(d.amount) }));

  return {
    status: "visible",
    header,
    stats,
    recent_donations,
    viewer: {
      is_following: isFollowing,
      has_pending_request: hasPendingRequest,
    },
  };
}
