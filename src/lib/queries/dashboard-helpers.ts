/**
 * Pure helpers for Dashboard aggregation.
 *
 * These functions do not touch the database. They accept plain rows /
 * primitives and return typed, shaped results. Keeping DB access out of
 * this module lets the aggregations be unit-tested without a live DB.
 *
 * All aggregators are defensive: empty input yields zeros / empty arrays
 * rather than throwing, so callers can safely render empty dashboards.
 */

import type {
  CauseBreakdown,
  CauseTag,
  DonationScope,
  MoMComparison,
  MonthlyTotal,
  ScopeBreakdown,
} from "@/types";

// ── Date helpers ──────────────────────────────────────────

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function getMonthKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function getYTDStart(now: Date = new Date()): string {
  return `${now.getFullYear()}-01-01`;
}

export function getMonthStart(now: Date = new Date(), offset = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return toISODate(d);
}

/**
 * Produces the `offset`-adjusted month key for date math — useful for
 * generating the last N month buckets for an area chart.
 */
export function getMonthKeyWithOffset(now: Date, offset: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return getMonthKey(d);
}

// ── Streak ────────────────────────────────────────────────

/**
 * Counts consecutive months (ending at `now`) that appear in the set.
 * Example: if `now` is March and the set contains {'2026-03','2026-02'},
 * returns 2. Breaks on the first missing month.
 */
export function calculateStreak(
  monthsWithDonations: ReadonlySet<string>,
  now: Date = new Date()
): number {
  let streak = 0;
  let offset = 0;
  while (true) {
    const key = getMonthKeyWithOffset(now, -offset);
    if (monthsWithDonations.has(key)) {
      streak++;
      offset++;
    } else {
      break;
    }
  }
  return streak;
}

// ── Salary milestone ──────────────────────────────────────

/**
 * Returns the next integer percent target above the current percentage,
 * capped at 30%. Returns null when the current percentage is null (salary
 * not set) or already at/above 30%.
 */
export function nextSalaryMilestone(currentPercentage: number | null): number | null {
  if (currentPercentage === null) return null;
  if (currentPercentage < 0) return 1;
  const next = Math.floor(currentPercentage) + 1;
  return next > 30 ? null : next;
}

// ── Row aggregators ───────────────────────────────────────

type DonationRowForAggregation = {
  amount: number;
  donation_date: string;
  scope: DonationScope;
  cause_tag: CauseTag | null;
  status?: string;
  organization_name?: string;
};

/**
 * Produces the last `months` month-buckets (oldest → newest) with totals.
 * Months with no donations show `total: 0`. Non-confirmed donations are
 * excluded so pending/skipped rows don't inflate the area chart.
 */
export function aggregateMonthly(
  rows: ReadonlyArray<DonationRowForAggregation>,
  months = 12,
  now: Date = new Date()
): MonthlyTotal[] {
  const byMonth = new Map<string, number>();
  for (let offset = months - 1; offset >= 0; offset--) {
    byMonth.set(getMonthKeyWithOffset(now, -offset), 0);
  }

  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    const key = getMonthKey(r.donation_date);
    if (byMonth.has(key)) {
      byMonth.set(key, (byMonth.get(key) ?? 0) + r.amount);
    }
  }

  return Array.from(byMonth.entries()).map(([month, total]) => ({ month, total }));
}

const ALL_SCOPES: DonationScope[] = ["local", "national", "global"];

/**
 * Returns totals for every scope — zero buckets included so the pie chart
 * can render a consistent legend even when a scope has no donations.
 */
export function aggregateByScope(
  rows: ReadonlyArray<DonationRowForAggregation>
): ScopeBreakdown[] {
  const byScope = new Map<DonationScope, { total: number; count: number }>();
  for (const s of ALL_SCOPES) byScope.set(s, { total: 0, count: 0 });

  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    const bucket = byScope.get(r.scope);
    if (!bucket) continue;
    bucket.total += r.amount;
    bucket.count += 1;
  }

  return ALL_SCOPES.map((scope) => ({
    scope,
    total: byScope.get(scope)?.total ?? 0,
    count: byScope.get(scope)?.count ?? 0,
  }));
}

/**
 * Groups confirmed donations by cause_tag. Null/missing tags roll up into
 * a synthetic `"uncategorized"` bucket. Result is sorted by total desc so
 * the bar-list renders largest first.
 */
export function aggregateByCause(
  rows: ReadonlyArray<DonationRowForAggregation>
): CauseBreakdown[] {
  const byCause = new Map<CauseTag | "uncategorized", { total: number; count: number }>();

  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    const key: CauseTag | "uncategorized" = r.cause_tag ?? "uncategorized";
    const bucket = byCause.get(key) ?? { total: 0, count: 0 };
    bucket.total += r.amount;
    bucket.count += 1;
    byCause.set(key, bucket);
  }

  return Array.from(byCause.entries())
    .map(([cause_tag, { total, count }]) => ({ cause_tag, total, count }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Computes current-month vs previous-month totals and the % change.
 * `percentage_change` is null when the previous month was zero to avoid
 * dividing by zero / reporting misleading infinite growth.
 */
export function computeMoMComparison(
  currentMonthTotal: number,
  previousMonthTotal: number
): MoMComparison {
  const pct =
    previousMonthTotal === 0
      ? null
      : ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
  return {
    current_month_total: currentMonthTotal,
    previous_month_total: previousMonthTotal,
    percentage_change: pct,
  };
}

/**
 * Counts distinct organizations by normalized (trimmed + lowercased) name
 * across the provided rows. Only confirmed donations are counted.
 */
export function countDistinctOrganizations(
  rows: ReadonlyArray<DonationRowForAggregation>
): number {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    if (!r.organization_name) continue;
    set.add(r.organization_name.trim().toLowerCase());
  }
  return set.size;
}
