import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CauseTag, DonationScope, PrivacyTier } from "@/types";

import { shouldShowAmount } from "@/lib/actions/feed-helpers";

const FEED_PAGE_SIZE = 50;

export type FeedItem = {
  id: string;
  user_id: string;
  user: {
    display_name: string | null;
    avatar_url: string | null;
    privacy_tier: PrivacyTier;
  };
  donation_date: string;
  organization_name: string;
  /** Null when the viewer is not allowed to see the amount. */
  amount: number | null;
  cause_tag: CauseTag | null;
  scope: DonationScope;
  notes: string | null;
  created_at: string;
  likes_count: number;
  user_has_liked: boolean;
};

export type FeedPageData = {
  items: FeedItem[];
  followsCount: number;
};

/**
 * Assembles the signed-in user's feed: donations from followed users
 * only, sorted by donation_date desc then created_at desc. RLS enforces
 * the visibility contract end-to-end (tier + hide_from_feed); this
 * query explicitly restricts to the follows set on top of RLS so the
 * feed reads "from people I follow" rather than "anything RLS permits."
 *
 * Returns `null` for unauthenticated callers so the page can redirect
 * without threading an error through.
 */
export async function getFeedPageData(): Promise<FeedPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // ── Who do I follow? ──────────────────────────────────
  const { data: followRows, error: followErr } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  if (followErr) {
    throw new Error(`Failed to load follows: ${followErr.message}`);
  }

  const followingIds = (followRows ?? []).map(
    (r) => r.following_id as string
  );

  if (followingIds.length === 0) {
    return { items: [], followsCount: 0 };
  }

  // ── Donations from followed users ─────────────────────
  // `hide_from_feed = false` is also enforced by RLS (DP-046), but we
  // include it here so the SQL plan can use the index hint and so the
  // query stays correct even if the RLS contract is ever loosened.
  const { data: donationRows, error: donationErr } = await supabase
    .from("donations")
    .select(
      "id, user_id, organization_name, amount, donation_date, scope, cause_tag, notes, hide_from_feed, created_at"
    )
    .in("user_id", followingIds)
    .eq("hide_from_feed", false)
    .eq("status", "confirmed")
    .order("donation_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (donationErr) {
    throw new Error(`Failed to load feed donations: ${donationErr.message}`);
  }
  const donations = donationRows ?? [];

  if (donations.length === 0) {
    return { items: [], followsCount: followingIds.length };
  }

  // ── Enrichment: posters' profiles + likes (counts + own) ──
  // Dedup the poster-id set before fanning out. profileRes + likesRes
  // + ownLikesRes are independent and run in parallel.
  const posterIds = Array.from(
    new Set(donations.map((d) => d.user_id as string))
  );
  const donationIds = donations.map((d) => d.id as string);

  const [profileRes, likesRes, ownLikesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, privacy_tier, show_amounts_to_friends")
      .in("id", posterIds),
    supabase
      .from("likes")
      .select("donation_id")
      .in("donation_id", donationIds),
    supabase
      .from("likes")
      .select("donation_id")
      .eq("user_id", user.id)
      .in("donation_id", donationIds),
  ]);

  if (profileRes.error) {
    throw new Error(`Failed to load feed profiles: ${profileRes.error.message}`);
  }

  type PosterProfile = {
    display_name: string | null;
    avatar_url: string | null;
    privacy_tier: PrivacyTier;
    show_amounts_to_friends: boolean;
  };
  const profileById = new Map<string, PosterProfile>();
  for (const p of profileRes.data ?? []) {
    profileById.set(p.id as string, {
      display_name: (p.display_name as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
      privacy_tier: p.privacy_tier as PrivacyTier,
      show_amounts_to_friends: Boolean(p.show_amounts_to_friends),
    });
  }

  const likeCountById = new Map<string, number>();
  for (const row of likesRes.data ?? []) {
    const id = row.donation_id as string;
    likeCountById.set(id, (likeCountById.get(id) ?? 0) + 1);
  }

  const ownLikeSet = new Set(
    (ownLikesRes.data ?? []).map((r) => r.donation_id as string)
  );

  const items: FeedItem[] = donations.map((d) => {
    const userId = d.user_id as string;
    const poster = profileById.get(userId) ?? {
      display_name: null,
      avatar_url: null,
      privacy_tier: "open_giver" as PrivacyTier,
      show_amounts_to_friends: false,
    };
    const amountVisible = shouldShowAmount(
      poster.privacy_tier,
      poster.show_amounts_to_friends,
      true // feed is by definition restricted to followed users
    );
    return {
      id: d.id as string,
      user_id: userId,
      user: {
        display_name: poster.display_name,
        avatar_url: poster.avatar_url,
        privacy_tier: poster.privacy_tier,
      },
      donation_date: d.donation_date as string,
      organization_name: d.organization_name as string,
      amount: amountVisible ? Number(d.amount) : null,
      cause_tag: (d.cause_tag as CauseTag | null) ?? null,
      scope: d.scope as DonationScope,
      notes: (d.notes as string | null) ?? null,
      created_at: d.created_at as string,
      likes_count: likeCountById.get(d.id as string) ?? 0,
      user_has_liked: ownLikeSet.has(d.id as string),
    };
  });

  return { items, followsCount: followingIds.length };
}
