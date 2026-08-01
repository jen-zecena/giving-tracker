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

import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { DateRange, TrendGranularity } from "@/lib/dashboard-timeframe";
import type {
  CauseBreakdown,
  CauseTag,
  DonationScope,
  MoMComparison,
  MonthlyTotal,
  ScopeBreakdown,
  TrendPoint,
} from "@/types";

// Monday-based weeks keep the weekly trend buckets aligned with common
// calendar expectations.
const WEEK_OPTS = { weekStartsOn: 1 } as const;

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

/**
 * Finds the longest run of consecutive months present in the set.
 * Scans all months between `earliest` and `latest` in the set.
 */
export function calculateLongestStreak(
  monthsWithDonations: ReadonlySet<string>
): number {
  if (monthsWithDonations.size === 0) return 0;

  const sorted = Array.from(monthsWithDonations).sort();
  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];

  const startDate = new Date(earliest + "-01T00:00:00");
  const endDate = new Date(latest + "-01T00:00:00");

  let longest = 0;
  let run = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    if (monthsWithDonations.has(getMonthKey(d))) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
    d.setMonth(d.getMonth() + 1);
  }

  return longest;
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

/**
 * Buckets confirmed donations into a continuous trend series across an
 * inclusive [start, end] window. Empty leading/trailing buckets are kept so
 * the area chart draws a gap-free line. Granularity controls the bucket size
 * and the pre-formatted axis `label` (day/week → "MMM d", month → "MMM",
 * or "MMM 'yy" when a monthly range spans calendar years).
 */
export function aggregateTrend(
  rows: ReadonlyArray<DonationRowForAggregation>,
  range: DateRange,
  granularity: TrendGranularity
): TrendPoint[] {
  const start = parseISO(range.start);
  const end = parseISO(range.end);
  if (end < start) return [];

  const bucketStarts =
    granularity === "day"
      ? eachDayOfInterval({ start, end })
      : granularity === "week"
        ? eachWeekOfInterval({ start, end }, WEEK_OPTS)
        : eachMonthOfInterval({ start, end });

  const totals = new Map<string, number>();
  for (const d of bucketStarts) totals.set(format(d, "yyyy-MM-dd"), 0);

  const bucketKey = (dateStr: string): string => {
    const d = parseISO(dateStr);
    const bucketStart =
      granularity === "day"
        ? d
        : granularity === "week"
          ? startOfWeek(d, WEEK_OPTS)
          : startOfMonth(d);
    return format(bucketStart, "yyyy-MM-dd");
  };

  for (const r of rows) {
    if (r.status && r.status !== "confirmed") continue;
    const key = bucketKey(r.donation_date);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + r.amount);
  }

  const spansYears =
    granularity === "month" && start.getFullYear() !== end.getFullYear();
  const labelFormat =
    granularity === "month" ? (spansYears ? "MMM ''yy" : "MMM") : "MMM d";

  return Array.from(totals.entries()).map(([date, total]) => ({
    date,
    label: format(parseISO(date), labelFormat),
    total,
  }));
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

// ── Insights ──────────────────────────────────────────────

/**
 * Icon identifiers for insight rows. The component layer maps these to
 * concrete `lucide-react` icons + color tokens so this module stays free
 * of React / icon imports and remains trivially unit-testable.
 */
export type InsightIcon =
  | "trending-up"
  | "heart"
  | "award-orgs"
  | "sparkles"
  | "award-month";

export interface Insight {
  key: string; // stable key for React list rendering
  icon: InsightIcon;
  text: string;
}

type InsightRow = DonationRowForAggregation & {
  is_recurring?: boolean;
};

function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Produces up to 3 data-driven insights from the user's donation rows,
 * in priority order:
 *   1. MoM percentage increase (if this month > last month)
 *   2. Top cause (with % of all confirmed donations)
 *   3. Unique orgs supported this month (≥2)
 *   4. Recurring consistency (has any recurring donation)
 *   5. Most generous month (when ≥2 months have activity)
 *
 * Returns `[]` when the user has no confirmed donations — the component
 * layer hides the card in that case, per the Figma port's acceptance
 * criteria.
 */
export function generateInsights(
  rows: ReadonlyArray<InsightRow>,
  now: Date = new Date()
): Insight[] {
  const confirmed = rows.filter((r) => !r.status || r.status === "confirmed");
  if (confirmed.length === 0) return [];

  const insights: Insight[] = [];

  // 1. MoM percentage increase
  const thisMonthKey = getMonthKey(now);
  const lastMonthKey = getMonthKeyWithOffset(now, -1);
  const thisMonthRows = confirmed.filter(
    (r) => getMonthKey(r.donation_date) === thisMonthKey
  );
  const lastMonthRows = confirmed.filter(
    (r) => getMonthKey(r.donation_date) === lastMonthKey
  );
  const thisMonthTotal = thisMonthRows.reduce((s, r) => s + r.amount, 0);
  const lastMonthTotal = lastMonthRows.reduce((s, r) => s + r.amount, 0);

  if (lastMonthTotal > 0 && thisMonthTotal > lastMonthTotal) {
    const pct = Math.round(
      ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    );
    insights.push({
      key: "mom-increase",
      icon: "trending-up",
      text: `You're giving ${pct}% more than last month!`,
    });
  }

  // 2. Top cause (includes uncategorized, mirrors the Figma behavior)
  const causeCounts = new Map<string, number>();
  for (const r of confirmed) {
    const key = r.cause_tag ?? "uncategorized";
    causeCounts.set(key, (causeCounts.get(key) ?? 0) + 1);
  }
  const sortedCauses = Array.from(causeCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  const topCause = sortedCauses[0];
  if (topCause) {
    const [tag, count] = topCause;
    const pct = Math.round((count / confirmed.length) * 100);
    insights.push({
      key: "top-cause",
      icon: "heart",
      text: `${humanizeCauseTag(tag)} is your top cause (${pct}% of donations)`,
    });
  }

  // 3. Unique orgs this month
  const uniqueOrgsThisMonth = new Set(
    thisMonthRows
      .map((r) => r.organization_name?.trim().toLowerCase())
      .filter((name): name is string => Boolean(name))
  ).size;
  if (uniqueOrgsThisMonth >= 2) {
    insights.push({
      key: "unique-orgs",
      icon: "award-orgs",
      text: `You've supported ${uniqueOrgsThisMonth} different organizations this month`,
    });
  }

  // 4. Recurring consistency
  const hasRecurring = rows.some((r) => r.is_recurring);
  if (hasRecurring) {
    insights.push({
      key: "recurring",
      icon: "sparkles",
      text: "Your consistent giving creates lasting impact",
    });
  }

  // 5. Most generous month (only when user has activity in ≥2 months)
  const monthlyTotals = new Map<string, { total: number; date: Date }>();
  for (const r of confirmed) {
    const d = new Date(r.donation_date + "T00:00:00");
    const key = monthLabel(d);
    const entry = monthlyTotals.get(key) ?? { total: 0, date: d };
    entry.total += r.amount;
    monthlyTotals.set(key, entry);
  }
  if (monthlyTotals.size > 1) {
    const top = Array.from(monthlyTotals.entries()).sort(
      (a, b) => b[1].total - a[1].total
    )[0];
    insights.push({
      key: "generous-month",
      icon: "award-month",
      text: `Your most generous month was ${top[0]}`,
    });
  }

  return insights.slice(0, 3);
}

function humanizeCauseTag(tag: string): string {
  if (tag === "uncategorized") return "Uncategorized";
  return tag
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
