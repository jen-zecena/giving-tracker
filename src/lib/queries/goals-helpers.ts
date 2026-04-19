/**
 * Pure helpers for Goals — timeframe filtering and current-value derivation.
 *
 * The `current` value on a Goal is intentionally NOT stored: it's derived
 * server-side from the user's donations per-type and per-timeframe on every
 * read. That keeps goals always consistent with the underlying data (no
 * stale counters when a donation is edited/deleted) and removes the need
 * for write-amplifying triggers.
 *
 * Keeping the derivation out of the DB also lets us unit-test every rule
 * here without a live Postgres.
 */

import type { GoalTimeframe, GoalType } from "@/types";

import { getMonthStart, getYTDStart } from "./dashboard-helpers";

// ── Timeframe ─────────────────────────────────────────────

/**
 * Inclusive lower-bound date (YYYY-MM-DD) for a goal's timeframe.
 * `ongoing` returns null — the caller treats null as "no lower bound".
 */
export function getTimeframeStart(
  timeframe: GoalTimeframe,
  now: Date = new Date()
): string | null {
  switch (timeframe) {
    case "month":
      return getMonthStart(now);
    case "year":
      return getYTDStart(now);
    case "ongoing":
      return null;
  }
}

// ── Row shape used by the derivation helpers ─────────────

export type DonationRowForGoal = {
  amount: number;
  donation_date: string;
  organization_name: string;
  cause_tag: string | null;
  status?: string;
};

/**
 * Filters donations to those inside the goal's timeframe. Non-confirmed
 * donations are excluded so pending/skipped rows don't move goal progress.
 */
export function filterByTimeframe(
  rows: ReadonlyArray<DonationRowForGoal>,
  timeframe: GoalTimeframe,
  now: Date = new Date()
): DonationRowForGoal[] {
  const lowerBound = getTimeframeStart(timeframe, now);
  return rows.filter((r) => {
    if (r.status !== undefined && r.status !== "confirmed") return false;
    if (lowerBound === null) return true;
    return r.donation_date >= lowerBound;
  });
}

// ── Per-type current derivation ──────────────────────────

/**
 * Computes the `current` value for a goal by type. Accepts rows that are
 * already filtered to the goal's timeframe — this keeps the function pure
 * and makes it cheap to run against shared row sets.
 *
 * - `amount`: sum of donation amounts
 * - `count`: number of donations
 * - `organizations`: distinct organization names (normalized, case-insensitive)
 * - `causes`: distinct non-null cause_tag values
 */
export function deriveCurrent(
  rows: ReadonlyArray<DonationRowForGoal>,
  type: GoalType
): number {
  switch (type) {
    case "amount":
      return rows.reduce((sum, r) => sum + r.amount, 0);
    case "count":
      return rows.length;
    case "organizations": {
      const set = new Set<string>();
      for (const r of rows) {
        if (!r.organization_name) continue;
        set.add(r.organization_name.trim().toLowerCase());
      }
      return set.size;
    }
    case "causes": {
      const set = new Set<string>();
      for (const r of rows) {
        if (r.cause_tag) set.add(r.cause_tag);
      }
      return set.size;
    }
  }
}

/**
 * Convenience that filters rows by timeframe then derives `current`. Used
 * by the server-side `listGoals` / `getGoal` actions after a single shared
 * donations fetch — avoids re-querying per goal.
 */
export function currentForGoal(
  rows: ReadonlyArray<DonationRowForGoal>,
  type: GoalType,
  timeframe: GoalTimeframe,
  now: Date = new Date()
): number {
  return deriveCurrent(filterByTimeframe(rows, timeframe, now), type);
}
