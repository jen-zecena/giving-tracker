import "server-only";

import { getPendingRequests, type PendingRequest } from "@/lib/actions/follow-requests";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { PrivacyTier } from "@/types";

export type DiscoverUser = {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** Only two followable tiers reach the Discover page — `private` is filtered out. */
  privacy_tier: Exclude<PrivacyTier, "private">;
};

export type DiscoverPageData = {
  currentUserId: string;
  users: DiscoverUser[];
  /** User ids the current user already follows. */
  followingIds: string[];
  /** User ids the current user has a pending outgoing request to. */
  pendingOutgoingIds: string[];
  incomingRequests: PendingRequest[];
};

/**
 * Loads everything the Discover page needs in one round trip's worth of
 * parallel queries.
 *
 * The user list uses the service-role client because the Discover use
 * case is "find someone you don't yet follow" — and the authenticated
 * `profiles_select` RLS hides `friends_only` rows from non-followers,
 * which would defeat the feature. Private profiles are filtered out
 * before they leave the server. Only a minimal, public-ish field set
 * leaves (id, display_name, bio, avatar_url, privacy_tier) — never
 * salary, never encrypted columns.
 *
 * Returns `null` when the caller is unauthenticated so the page can
 * redirect to login without threading an error through.
 */
export async function getDiscoverPageData(): Promise<DiscoverPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createServiceRoleClient();

  const [usersRes, followsRes, outgoingRes, incomingResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, bio, avatar_url, privacy_tier")
      .neq("id", user.id)
      .neq("privacy_tier", "private")
      .order("display_name", { ascending: true, nullsFirst: false }),
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id),
    supabase
      .from("follow_requests")
      .select("to_user_id")
      .eq("from_user_id", user.id)
      .eq("status", "pending"),
    getPendingRequests(),
  ]);

  if (usersRes.error) {
    throw new Error(`Failed to load discover users: ${usersRes.error.message}`);
  }

  const users: DiscoverUser[] = (usersRes.data ?? []).map((row) => ({
    id: row.id as string,
    display_name: (row.display_name as string | null) ?? null,
    bio: (row.bio as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    privacy_tier: row.privacy_tier as Exclude<PrivacyTier, "private">,
  }));

  const followingIds = (followsRes.data ?? []).map(
    (r) => r.following_id as string
  );
  const pendingOutgoingIds = (outgoingRes.data ?? []).map(
    (r) => r.to_user_id as string
  );

  return {
    currentUserId: user.id,
    users,
    followingIds,
    pendingOutgoingIds,
    incomingRequests: incomingResult.data ?? [],
  };
}
