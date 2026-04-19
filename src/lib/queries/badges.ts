/**
 * Derived badges layer.
 *
 * Follows the Figma port decision from FIGMA_PORT_PLAN.md §3 — badges
 * are computed from donations + profile on every render. There is no
 * `badges` table, no earned_at timestamps persisted. This keeps the
 * schema simple and lets us change badge criteria without migrations.
 *
 * Layering mirrors the dashboard module: `computeBadges(params)` is a
 * pure function for unit testing; `getBadges()` is a server query that
 * reads the authenticated user's rows and calls the pure helper.
 */

import { cache } from "react";

import { calculateDonationPercentage } from "@/lib/salary";
import { createClient } from "@/lib/supabase/server";
import type { CauseTag, Donation, DonationScope } from "@/types";

import { calculateStreak, getMonthKey } from "./dashboard-helpers";

// ── Types ─────────────────────────────────────────────────

export type BadgeCategory =
  | "milestone"
  | "consistency"
  | "impact"
  | "social"
  | "cause";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji — component layer renders as-is
  category: BadgeCategory;
  earned: boolean;
  earnedDate?: string; // ISO date (YYYY-MM-DD) when available
  progress?: number;
  target?: number;
}

export type BadgeRow = Pick<
  Donation,
  | "amount"
  | "donation_date"
  | "cause_tag"
  | "scope"
  | "is_recurring"
  | "status"
>;

export interface ComputeBadgesParams {
  /**
   * All confirmed donations for the user, newest-first. Non-confirmed
   * rows are filtered inside `computeBadges` — callers can pass the raw
   * set without pre-filtering.
   */
  rows: ReadonlyArray<BadgeRow>;
  /**
   * Year-to-date total used for the salary-percentage badges.
   * `null` when salary is not set — salary badges then show as
   * unearned with progress 0.
   */
  salaryPercentage: number | null;
  /**
   * Current month streak (consecutive months with at least one
   * confirmed donation, ending within 31 days of `now`). Drives the
   * consistency badges.
   */
  streakMonths: number;
  /**
   * Reference "now" for date math. Defaults to the process clock —
   * tests pin this for determinism.
   */
  now?: Date;
}

// ── Pure helpers ──────────────────────────────────────────

function lastDonationDate(rows: ReadonlyArray<BadgeRow>): string | undefined {
  // Rows may arrive unsorted — scan for the max ISO date string.
  let max: string | undefined;
  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    if (!max || r.donation_date > max) max = r.donation_date;
  }
  return max;
}

function firstConfirmedDate(
  rows: ReadonlyArray<BadgeRow>
): string | undefined {
  let min: string | undefined;
  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    if (!min || r.donation_date < min) min = r.donation_date;
  }
  return min;
}

function countByScope(
  rows: ReadonlyArray<BadgeRow>,
  scope: DonationScope
): number {
  return rows.filter(
    (r) => (!r.status || r.status === "confirmed") && r.scope === scope
  ).length;
}

function countRecurring(rows: ReadonlyArray<BadgeRow>): number {
  return rows.filter(
    (r) => (!r.status || r.status === "confirmed") && r.is_recurring
  ).length;
}

function countByCause(
  rows: ReadonlyArray<BadgeRow>,
  tag: CauseTag
): number {
  return rows.filter(
    (r) => (!r.status || r.status === "confirmed") && r.cause_tag === tag
  ).length;
}

function distinctCauses(rows: ReadonlyArray<BadgeRow>): number {
  const set = new Set<CauseTag>();
  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    if (r.cause_tag) set.add(r.cause_tag);
  }
  return set.size;
}

// ── Compute ───────────────────────────────────────────────

export function computeBadges(params: ComputeBadgesParams): Badge[] {
  const { rows, salaryPercentage, streakMonths } = params;
  const confirmed = rows.filter((r) => !r.status || r.status === "confirmed");

  const totalCount = confirmed.length;
  const firstDate = firstConfirmedDate(confirmed);
  const pct = salaryPercentage ?? 0;
  // Salary badges report the raw percentage as progress (same as
  // Figma). The UI is responsible for clamping any progress bar.
  const salaryProgress = salaryPercentage === null ? 0 : pct;

  const badges: Badge[] = [
    // ── Milestones ─────────────────────────────────────
    {
      id: "first-donation",
      name: "First Steps",
      description: "Made your first donation",
      icon: "🌱",
      category: "milestone",
      earned: totalCount >= 1,
      earnedDate: firstDate,
    },
    {
      id: "1-percent-club",
      name: "1% Club",
      description: "Donated 1% or more of your yearly salary",
      icon: "💚",
      category: "milestone",
      earned: salaryPercentage !== null && pct >= 1,
      progress: salaryProgress,
      target: 1,
    },
    {
      id: "2-percent-club",
      name: "2% Club",
      description: "Donated 2% or more of your yearly salary",
      icon: "💙",
      category: "milestone",
      earned: salaryPercentage !== null && pct >= 2,
      progress: salaryProgress,
      target: 2,
    },
    {
      id: "5-percent-club",
      name: "5% Club",
      description: "Donated 5% or more of your yearly salary",
      icon: "💜",
      category: "milestone",
      earned: salaryPercentage !== null && pct >= 5,
      progress: salaryProgress,
      target: 5,
    },
    {
      id: "10-donations",
      name: "Getting Started",
      description: "Logged 10 donations",
      icon: "✨",
      category: "milestone",
      earned: totalCount >= 10,
      progress: totalCount,
      target: 10,
    },
    {
      id: "50-donations",
      name: "Dedicated Giver",
      description: "Logged 50 donations",
      icon: "⭐",
      category: "milestone",
      earned: totalCount >= 50,
      progress: totalCount,
      target: 50,
    },
    {
      id: "100-donations",
      name: "Philanthropist",
      description: "Logged 100 donations",
      icon: "🌟",
      category: "milestone",
      earned: totalCount >= 100,
      progress: totalCount,
      target: 100,
    },

    // ── Consistency ────────────────────────────────────
    {
      id: "monthly-giver",
      name: "Monthly Giver",
      description: "Made donations for 3 consecutive months",
      icon: "📅",
      category: "consistency",
      earned: streakMonths >= 3,
      progress: streakMonths,
      target: 3,
    },
    {
      id: "consistency-king",
      name: "Consistency King",
      description: "Made donations for 6 consecutive months",
      icon: "👑",
      category: "consistency",
      earned: streakMonths >= 6,
      progress: streakMonths,
      target: 6,
    },
    {
      id: "year-round-giver",
      name: "Year-Round Giver",
      description: "Made donations for 12 consecutive months",
      icon: "🏆",
      category: "consistency",
      earned: streakMonths >= 12,
      progress: streakMonths,
      target: 12,
    },

    // ── Cause champions ────────────────────────────────
    {
      id: "education-champion",
      name: "Education Champion",
      description: "Made 5+ donations to education causes",
      icon: "📚",
      category: "cause",
      earned: countByCause(confirmed, "education") >= 5,
      progress: countByCause(confirmed, "education"),
      target: 5,
    },
    {
      id: "health-advocate",
      name: "Health Advocate",
      description: "Made 5+ donations to health causes",
      icon: "🏥",
      category: "cause",
      earned: countByCause(confirmed, "health") >= 5,
      progress: countByCause(confirmed, "health"),
      target: 5,
    },
    {
      id: "environment-hero",
      name: "Environment Hero",
      description: "Made 5+ donations to environmental causes",
      icon: "🌍",
      category: "cause",
      earned: countByCause(confirmed, "environment") >= 5,
      progress: countByCause(confirmed, "environment"),
      target: 5,
    },
    {
      id: "diverse-giver",
      name: "Diverse Giver",
      description: "Donated to 5+ different cause categories",
      icon: "🎨",
      category: "cause",
      earned: distinctCauses(confirmed) >= 5,
      progress: distinctCauses(confirmed),
      target: 5,
    },

    // ── Impact ─────────────────────────────────────────
    {
      id: "local-hero",
      name: "Local Hero",
      description: "Made 10+ donations to local organizations",
      icon: "🏘️",
      category: "impact",
      earned: countByScope(confirmed, "local") >= 10,
      progress: countByScope(confirmed, "local"),
      target: 10,
    },
    {
      id: "global-citizen",
      name: "Global Citizen",
      description: "Made 10+ donations to global organizations",
      icon: "🌐",
      category: "impact",
      earned: countByScope(confirmed, "global") >= 10,
      progress: countByScope(confirmed, "global"),
      target: 10,
    },
    {
      id: "recurring-supporter",
      name: "Recurring Supporter",
      description: "Set up 3+ recurring donations",
      icon: "🔄",
      category: "impact",
      earned: countRecurring(confirmed) >= 3,
      progress: countRecurring(confirmed),
      target: 3,
    },
  ];

  // Sort earned badges first, preserving insertion order within each
  // group (Array.sort in V8 is stable).
  return [...badges].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return 0;
  });
}

/**
 * Exported for tests and for UI code that wants to render the full set
 * (e.g. greyed-out placeholders) without computing progress.
 */
export const BADGE_IDS = [
  "first-donation",
  "1-percent-club",
  "2-percent-club",
  "5-percent-club",
  "10-donations",
  "50-donations",
  "100-donations",
  "monthly-giver",
  "consistency-king",
  "year-round-giver",
  "education-champion",
  "health-advocate",
  "environment-hero",
  "diverse-giver",
  "local-hero",
  "global-citizen",
  "recurring-supporter",
] as const;

// ── Server query ──────────────────────────────────────────

/**
 * Fetches the authenticated user's rows and computes their badges.
 * Returns `[]` when no user is signed in (rather than throwing) so
 * pages can render a signed-out state without try/catch.
 *
 * Pass `userId` to fetch another user's badges — the authenticated
 * user's RLS permissions decide whether the select succeeds (friends/
 * open profiles may expose rows via DP-046; private profiles will
 * return `[]`).
 */
export const getBadges = cache(async (userId?: string): Promise<Badge[]> => {
  const supabase = await createClient();
  let targetUserId = userId;

  if (!targetUserId) {
    const { data } = await supabase.auth.getUser();
    targetUserId = data.user?.id;
  }
  if (!targetUserId) return [];

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("donations")
      .select("amount, donation_date, cause_tag, scope, is_recurring, status")
      .eq("user_id", targetUserId)
      .eq("status", "confirmed")
      .order("donation_date", { ascending: false }),
    supabase
      .from("profiles")
      .select("salary_encrypted")
      .eq("id", targetUserId)
      .single(),
  ]);

  const rowData = (rows ?? []) as BadgeRow[];

  // Year-to-date total drives salary percentage (mirrors the Figma
  // port — salary badges track current-year giving only).
  const now = new Date();
  const ytdStart = `${now.getFullYear()}-01-01`;
  const ytdTotal = rowData
    .filter((r) => r.donation_date >= ytdStart)
    .reduce((s, r) => s + Number(r.amount), 0);

  const salaryPercentage = calculateDonationPercentage(
    ytdTotal,
    profile?.salary_encrypted ?? null
  );

  // Reuse the dashboard's streak calculator for consistency.
  const monthsWithDonations = new Set(
    rowData.map((r) => getMonthKey(r.donation_date))
  );
  const streakMonths = calculateStreak(monthsWithDonations, now);

  return computeBadges({
    rows: rowData,
    salaryPercentage,
    streakMonths,
    now,
  });
});

/**
 * Convenience: earned count, for stat rollups ("12 / 17 earned").
 */
export async function getEarnedBadgesCount(userId?: string): Promise<number> {
  const badges = await getBadges(userId);
  return badges.filter((b) => b.earned).length;
}
