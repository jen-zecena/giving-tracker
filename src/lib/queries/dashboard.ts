/**
 * Dashboard aggregation layer — server queries.
 *
 * All functions are owner-scoped: each one reads the authenticated user
 * from the Supabase SSR client and relies on RLS (DP-007) to prevent
 * leaking another user's data. If no user is signed in, functions return
 * the empty/zero shape rather than throwing so pages can render a signed-
 * out state without try/catch boilerplate.
 *
 * React's `cache()` memoizes each call for the lifetime of a single
 * request — so a page that reads `getDashboardSummary()` and
 * `getMonthlyTotals()` doesn't re-query overlapping rows.
 *
 * Cross-request caching via `unstable_cache` is intentionally NOT wired
 * here — it conflicts with the cookies() API used by the SSR Supabase
 * client. Callers should invalidate with `revalidateTag(dashboardTag(id))`
 * after any donation mutation so the next render refetches.
 */

import { cache } from "react";

import { calculateDonationPercentage } from "@/lib/salary";
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardData,
  DashboardSummary,
  Donation,
  CauseBreakdown,
  MoMComparison,
  MonthlyTotal,
  ScopeBreakdown,
} from "@/types";

import {
  aggregateByCause,
  aggregateByScope,
  aggregateMonthly,
  calculateStreak,
  computeMoMComparison,
  countDistinctOrganizations,
  generateInsights,
  getMonthKey,
  getMonthKeyWithOffset,
  getMonthStart,
  getYTDStart,
  nextSalaryMilestone,
  type Insight,
} from "./dashboard-helpers";

// ── Cache tag convention ──────────────────────────────────

export function dashboardTag(userId: string): string {
  return `dashboard:${userId}`;
}

// ── Empty states (returned when no user / no data) ────────

const EMPTY_SUMMARY: DashboardSummary = {
  ytd_total: 0,
  ytd_count: 0,
  this_month_total: 0,
  organizations_count: 0,
  pending_count: 0,
  streak_months: 0,
  salary_percentage: null,
  salary_milestone_target: null,
};

const EMPTY_MOM: MoMComparison = {
  current_month_total: 0,
  previous_month_total: 0,
  percentage_change: null,
};

export const EMPTY_DASHBOARD_DATA: DashboardData = {
  summary: EMPTY_SUMMARY,
  monthly: [],
  scope: [],
  cause: [],
  mom: EMPTY_MOM,
  recent: [],
};

// ── Auth helper ───────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ── Core fetch (memoized per request) ─────────────────────

/**
 * Pulls the row set needed for every chart on the Dashboard in a single
 * query: last 12 months of donations for the authenticated user. The
 * aggregators slice this set into ytd / monthly / scope / cause views.
 * Wrapping in React's `cache` means the card-level query functions all
 * reuse this fetch on the same render.
 */
const fetchLast12Months = cache(async (): Promise<{
  userId: string | null;
  rows: Array<Pick<
    Donation,
    | "amount"
    | "donation_date"
    | "scope"
    | "cause_tag"
    | "status"
    | "organization_name"
    | "is_recurring"
  >>;
}> => {
  const userId = await getUserId();
  if (!userId) return { userId: null, rows: [] };

  const supabase = await createClient();
  const twelveMonthsAgo = getMonthStart(new Date(), -11); // include current month

  const { data } = await supabase
    .from("donations")
    .select(
      "amount, donation_date, scope, cause_tag, status, organization_name, is_recurring"
    )
    .eq("user_id", userId)
    .gte("donation_date", twelveMonthsAgo)
    .order("donation_date", { ascending: false });

  return { userId, rows: data ?? [] };
});

// ── Summary ───────────────────────────────────────────────

export const getDashboardSummary = cache(async (): Promise<DashboardSummary> => {
  const { userId, rows } = await fetchLast12Months();
  if (!userId) return EMPTY_SUMMARY;

  const supabase = await createClient();
  const now = new Date();
  const ytdStart = getYTDStart(now);
  const thisMonthKey = getMonthKey(now);

  const ytdRows = rows.filter(
    (r) => r.donation_date >= ytdStart && r.status === "confirmed"
  );
  const ytdTotal = ytdRows.reduce((s, r) => s + r.amount, 0);
  const thisMonthTotal = ytdRows
    .filter((r) => getMonthKey(r.donation_date) === thisMonthKey)
    .reduce((s, r) => s + r.amount, 0);

  const monthsWithDonations = new Set(
    rows
      .filter((r) => r.status === "confirmed")
      .map((r) => getMonthKey(r.donation_date))
  );

  const [{ count: pendingCount }, { data: profile }] = await Promise.all([
    supabase
      .from("donations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
    supabase
      .from("profiles")
      .select("salary_encrypted")
      .eq("id", userId)
      .single(),
  ]);

  const salaryPct = calculateDonationPercentage(
    ytdTotal,
    profile?.salary_encrypted ?? null
  );

  return {
    ytd_total: ytdTotal,
    ytd_count: ytdRows.length,
    this_month_total: thisMonthTotal,
    organizations_count: countDistinctOrganizations(ytdRows),
    pending_count: pendingCount ?? 0,
    streak_months: calculateStreak(monthsWithDonations, now),
    salary_percentage: salaryPct,
    salary_milestone_target: nextSalaryMilestone(salaryPct),
  };
});

// ── Monthly area chart ────────────────────────────────────

export const getMonthlyTotals = cache(
  async (months = 12): Promise<MonthlyTotal[]> => {
    const { userId, rows } = await fetchLast12Months();
    if (!userId) return [];
    return aggregateMonthly(rows, months);
  }
);

// ── Scope pie ─────────────────────────────────────────────

export const getScopeBreakdown = cache(async (): Promise<ScopeBreakdown[]> => {
  const { userId, rows } = await fetchLast12Months();
  if (!userId) return [];
  const ytdStart = getYTDStart();
  const ytdRows = rows.filter((r) => r.donation_date >= ytdStart);
  return aggregateByScope(ytdRows);
});

// ── Cause bar list ────────────────────────────────────────

export const getCauseBreakdown = cache(async (): Promise<CauseBreakdown[]> => {
  const { userId, rows } = await fetchLast12Months();
  if (!userId) return [];
  const ytdStart = getYTDStart();
  const ytdRows = rows.filter((r) => r.donation_date >= ytdStart);
  return aggregateByCause(ytdRows);
});

// ── Month-over-month ──────────────────────────────────────

export const getMoMComparison = cache(async (): Promise<MoMComparison> => {
  const { userId, rows } = await fetchLast12Months();
  if (!userId) return EMPTY_MOM;

  const now = new Date();
  const thisKey = getMonthKey(now);
  const prevKey = getMonthKeyWithOffset(now, -1);

  const sumFor = (key: string) =>
    rows
      .filter((r) => r.status === "confirmed" && getMonthKey(r.donation_date) === key)
      .reduce((s, r) => s + r.amount, 0);

  return computeMoMComparison(sumFor(thisKey), sumFor(prevKey));
});

// ── Recent donations ──────────────────────────────────────

export const getRecentDonations = cache(
  async (limit = 5): Promise<Donation[]> => {
    const userId = await getUserId();
    if (!userId) return [];

    const supabase = await createClient();
    const { data } = await supabase
      .from("donations")
      .select("*")
      .eq("user_id", userId)
      .order("donation_date", { ascending: false })
      .limit(limit);
    return data ?? [];
  }
);

// ── Insights (up to 3 for the Dashboard InsightsCard) ─────

export const getInsights = cache(async (): Promise<Insight[]> => {
  const { userId, rows } = await fetchLast12Months();
  if (!userId) return [];
  return generateInsights(rows);
});

// ── Aggregate (single call for the Dashboard page) ────────

export async function getDashboardData(): Promise<DashboardData> {
  const userId = await getUserId();
  if (!userId) return EMPTY_DASHBOARD_DATA;

  const [summary, monthly, scope, cause, mom, recent] = await Promise.all([
    getDashboardSummary(),
    getMonthlyTotals(),
    getScopeBreakdown(),
    getCauseBreakdown(),
    getMoMComparison(),
    getRecentDonations(),
  ]);

  return { summary, monthly, scope, cause, mom, recent };
}
