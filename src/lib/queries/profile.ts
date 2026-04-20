import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { CauseTag, DonationScope, PrivacyTier } from "@/types";

import {
  orderSummariesByIds,
  type ProfileSummary,
} from "./profile-helpers";

export { orderSummariesByIds, type ProfileSummary };

export type ProfileStats = {
  total_donated: number;
  donation_count: number;
  organization_count: number;
  follower_count: number;
};

export type RecentDonation = {
  id: string;
  organization_name: string;
  amount: number;
  donation_date: string;
  cause_tag: CauseTag | null;
  scope: DonationScope;
  is_recurring: boolean;
};

export type ProfileHeader = {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  privacy_tier: PrivacyTier;
};

export type ProfilePageData = {
  user_id: string;
  user_email: string;
  profile: ProfileHeader;
  stats: ProfileStats;
  recent_donations: RecentDonation[];
  followers: ProfileSummary[];
  following: ProfileSummary[];
};

/**
 * Loads every piece of data the /profile page renders. All queries are
 * scoped to the current user (RLS also enforces this, but we pin user_id
 * on the query for clarity).
 */
export async function getProfilePageData(): Promise<ProfilePageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [
    profileRes,
    donationsRes,
    followersRes,
    recentRes,
    followerEdgesRes,
    followingEdgesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, bio, avatar_url, privacy_tier")
      .eq("id", user.id)
      .single(),
    supabase
      .from("donations")
      .select("amount, organization_name")
      .eq("user_id", user.id)
      .eq("status", "confirmed"),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id),
    supabase
      .from("donations")
      .select(
        "id, organization_name, amount, donation_date, cause_tag, scope, is_recurring"
      )
      .eq("user_id", user.id)
      .eq("status", "confirmed")
      .order("donation_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    // follows_select RLS lets the owner read both sides of their edges,
    // so these two queries don't need the service-role client.
    supabase
      .from("follows")
      .select("follower_id, created_at")
      .eq("following_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("follows")
      .select("following_id, created_at")
      .eq("follower_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const followerIds = (followerEdgesRes.data ?? []).map(
    (r) => r.follower_id as string
  );
  const followingIds = (followingEdgesRes.data ?? []).map(
    (r) => r.following_id as string
  );

  // Profile summaries go through the service-role client because a
  // `private`/`friends_only` follower's profile wouldn't be visible to
  // the owner under the tier-aware profiles_select policy (DP-046) —
  // yet the owner still needs to see who follows them. Scope is
  // minimal: id, display_name, avatar_url, bio, privacy_tier.
  const [followerSummaries, followingSummaries] = await Promise.all([
    fetchProfileSummariesByIds(followerIds),
    fetchProfileSummariesByIds(followingIds),
  ]);

  const profile: ProfileHeader = profileRes.data ?? {
    display_name: null,
    bio: null,
    avatar_url: null,
    privacy_tier: "private",
  };

  const donations = (donationsRes.data ?? []) as Array<{
    amount: number | string;
    organization_name: string;
  }>;

  const stats: ProfileStats = {
    total_donated: donations.reduce((sum, d) => sum + Number(d.amount), 0),
    donation_count: donations.length,
    organization_count: new Set(donations.map((d) => d.organization_name)).size,
    follower_count: followersRes.count ?? 0,
  };

  const recent_donations = ((recentRes.data ?? []) as RecentDonation[]).map(
    (d) => ({ ...d, amount: Number(d.amount) })
  );

  return {
    user_id: user.id,
    user_email: user.email ?? "",
    profile,
    stats,
    recent_donations,
    followers: orderSummariesByIds(followerIds, followerSummaries),
    following: orderSummariesByIds(followingIds, followingSummaries),
  };
}


/**
 * Service-role lookup for profile summaries by id. Bypasses RLS — use
 * only when the owner has a legitimate reason to see the info (e.g.
 * someone follows them, they follow someone). Returns `[]` for empty
 * input without round-tripping.
 */
async function fetchProfileSummariesByIds(
  ids: ReadonlyArray<string>
): Promise<ProfileSummary[]> {
  if (ids.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url, bio, privacy_tier")
    .in("id", ids);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    display_name: (row.display_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    privacy_tier: row.privacy_tier as PrivacyTier,
  }));
}

export {
  privacyTierMeta,
  type PrivacyTierMeta,
} from "@/lib/privacy-tier";
