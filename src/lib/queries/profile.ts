import { createClient } from "@/lib/supabase/server";
import type { CauseTag, DonationScope, PrivacyTier } from "@/types";

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

  const [profileRes, donationsRes, followersRes, recentRes] = await Promise.all([
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
  };
}

export {
  privacyTierMeta,
  type PrivacyTierMeta,
} from "@/lib/privacy-tier";
