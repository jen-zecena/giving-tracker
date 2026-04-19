/**
 * Display-layer helpers for Goals. Kept separate from the server-side
 * derivation in `queries/goals-helpers.ts` because these are safe to ship
 * to the client bundle — pure functions only.
 */

import type { Goal, GoalTimeframe, GoalType } from "@/types";

// ── Labels ────────────────────────────────────────────────

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  amount: "Amount",
  count: "Donations",
  organizations: "Organizations",
  causes: "Causes",
};

export const GOAL_TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  month: "This month",
  year: "This year",
  ongoing: "All time",
};

// ── Per-type value formatting ─────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats the current or target value for display, respecting the goal
 * type. Amount goals get a currency formatter; counts render as plain
 * integers with a trailing unit label when useful.
 */
export function formatGoalValue(value: number, type: GoalType): string {
  if (type === "amount") return formatCurrency(value);
  return Math.round(value).toLocaleString("en-US");
}

// ── Progress ──────────────────────────────────────────────

/**
 * Clamps current / target to a 0..100 percentage for the Progress bar.
 * Returns 0 when target is non-positive so we never divide by zero or
 * hand the Progress primitive a NaN.
 */
export function progressPercent(current: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  const pct = (current / target) * 100;
  if (pct <= 0) return 0;
  if (pct >= 100) return 100;
  return pct;
}

export function isGoalComplete(goal: Pick<Goal, "current" | "target">): boolean {
  return goal.target > 0 && goal.current >= goal.target;
}

// ── Summary ───────────────────────────────────────────────

export type GoalsSummary = {
  total: number;
  completed: number;
  inProgress: number;
};

export function summarizeGoals(goals: ReadonlyArray<Goal>): GoalsSummary {
  let completed = 0;
  for (const g of goals) {
    if (isGoalComplete(g)) completed++;
  }
  return {
    total: goals.length,
    completed,
    inProgress: goals.length - completed,
  };
}
