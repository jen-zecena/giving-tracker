/**
 * Goals display-helper tests
 * Run with: npx tsx tests/goals-display.test.ts
 *
 * Covers the UI-side helpers in src/lib/goals-display.ts — value
 * formatting, progress clamping, completion check, and summary counts.
 */

import type { Goal } from "../src/types";
import {
  formatGoalValue,
  isGoalComplete,
  progressPercent,
  summarizeGoals,
} from "../src/lib/goals-display";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function eq<T>(name: string, got: T, want: T) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  assert(name, ok, ok ? undefined : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    user_id: "u1",
    title: "Test goal",
    description: null,
    type: "amount",
    target: 100,
    current: 50,
    timeframe: "year",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── formatGoalValue ───────────────────────────────────────
console.log("\nformatGoalValue:");
eq("amount renders as USD currency", formatGoalValue(1000, "amount"), "$1,000");
eq("amount rounds fractional cents", formatGoalValue(1234.56, "amount"), "$1,235");
eq("count renders as plain integer", formatGoalValue(12, "count"), "12");
eq(
  "organizations formats large numbers with commas",
  formatGoalValue(1234, "organizations"),
  "1,234"
);
eq("causes rounds floats for display", formatGoalValue(3.7, "causes"), "4");

// ── progressPercent ───────────────────────────────────────
console.log("\nprogressPercent:");
eq("half progress", progressPercent(50, 100), 50);
eq("clamps above 100", progressPercent(150, 100), 100);
eq("clamps negatives to 0", progressPercent(-10, 100), 0);
eq("zero target returns 0 (no divide-by-zero)", progressPercent(10, 0), 0);
eq("negative target returns 0", progressPercent(10, -5), 0);
eq(
  "NaN target returns 0 (defensive for bad input)",
  progressPercent(10, Number.NaN),
  0
);
eq("exact target is 100%", progressPercent(100, 100), 100);

// ── isGoalComplete ────────────────────────────────────────
console.log("\nisGoalComplete:");
assert(
  "current below target is incomplete",
  isGoalComplete({ current: 99, target: 100 }) === false
);
assert(
  "current at target is complete",
  isGoalComplete({ current: 100, target: 100 }) === true
);
assert(
  "current above target is complete",
  isGoalComplete({ current: 150, target: 100 }) === true
);
assert(
  "zero target never counts as complete",
  isGoalComplete({ current: 0, target: 0 }) === false
);

// ── summarizeGoals ────────────────────────────────────────
console.log("\nsummarizeGoals:");
{
  const goals = [
    goal({ id: "a", current: 100, target: 100 }), // complete
    goal({ id: "b", current: 50, target: 100 }), // in progress
    goal({ id: "c", current: 0, target: 100 }), // in progress
    goal({ id: "d", current: 200, target: 100 }), // complete
  ];
  const summary = summarizeGoals(goals);
  eq("total counts all goals", summary.total, 4);
  eq("completed counts current >= target", summary.completed, 2);
  eq("inProgress counts the rest", summary.inProgress, 2);
}

{
  const summary = summarizeGoals([]);
  eq("empty summary returns zeros", summary, {
    total: 0,
    completed: 0,
    inProgress: 0,
  });
}

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
