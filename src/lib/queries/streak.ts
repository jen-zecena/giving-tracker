/**
 * Standalone streak calculation query.
 *
 * Returns the current consecutive-month streak, the longest ever streak,
 * and the most recent donation date. Used by both the Dashboard (DP-010)
 * and the Badges engine (DP-032).
 */

import { createClient } from "@/lib/supabase/server";
import {
  calculateStreak,
  calculateLongestStreak,
  getMonthKey,
} from "./dashboard-helpers";

export type StreakResult = {
  current: number;
  longest: number;
  lastDonationDate: string | null;
};

const EMPTY: StreakResult = { current: 0, longest: 0, lastDonationDate: null };

/**
 * Computes streak data for the given user. Fetches all confirmed donation
 * dates (lightweight — only the date column) and derives both the current
 * and longest consecutive-month streaks.
 */
export async function getStreak(userId: string): Promise<StreakResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("donations")
    .select("donation_date")
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .order("donation_date", { ascending: false });

  if (error || !data || data.length === 0) return EMPTY;

  const lastDonationDate = data[0].donation_date;

  const monthsSet = new Set(data.map((d) => getMonthKey(d.donation_date)));

  const current = calculateStreak(monthsSet);
  const longest = calculateLongestStreak(monthsSet);

  return { current, longest, lastDonationDate };
}
