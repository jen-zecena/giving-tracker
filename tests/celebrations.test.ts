/**
 * Celebration helper tests
 * Run with: npx tsx tests/celebrations.test.ts
 *
 * Covers the pure halves of src/lib/celebrations.ts:
 *   - donationCelebrationKind (first / milestone / null)
 *   - newlyCompletedGoalIds (transitions only)
 *   - newlyEarnedBadgeIds (set diff)
 *   - prefersReducedMotion in a no-window environment
 *
 * The `confetti(...)` calls themselves aren't exercised — they fire against
 * `window.requestAnimationFrame` and a live canvas, which isn't meaningful
 * to assert under tsx. Those are covered by manual + agent-browser checks.
 */

// Guard against accidental "window" access at import-time.
if (typeof (globalThis as { window?: unknown }).window !== "undefined") {
  throw new Error("Test expects a Node environment (no window).");
}

import {
  DONATION_MILESTONES,
  donationCelebrationKind,
  newlyCompletedGoalIds,
  newlyEarnedBadgeIds,
  prefersReducedMotion,
  type GoalCompletionInput,
} from "../src/lib/celebrations";

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

// ── prefersReducedMotion (no-window path) ─────────────────
console.log("\nprefersReducedMotion:");
assert(
  "returns true in non-browser environment (no `window`)",
  prefersReducedMotion() === true
);

// ── donationCelebrationKind ───────────────────────────────
console.log("\ndonationCelebrationKind:");
eq("count = 1 → 'first'", donationCelebrationKind(1), "first");
eq("count = 2 → null (no celebration)", donationCelebrationKind(2), null);
eq("count = 9 → null", donationCelebrationKind(9), null);
eq("count = 10 → 'milestone'", donationCelebrationKind(10), "milestone");
eq("count = 25 → 'milestone'", donationCelebrationKind(25), "milestone");
eq("count = 50 → 'milestone'", donationCelebrationKind(50), "milestone");
eq("count = 100 → 'milestone'", donationCelebrationKind(100), "milestone");
eq("count = 101 → null", donationCelebrationKind(101), null);
eq(
  "DONATION_MILESTONES exports exactly [10, 25, 50, 100]",
  [...DONATION_MILESTONES],
  [10, 25, 50, 100]
);

// ── newlyCompletedGoalIds ─────────────────────────────────
console.log("\nnewlyCompletedGoalIds:");

const g = (
  id: string,
  current: number,
  target: number
): GoalCompletionInput => ({ id, current, target });

eq(
  "no previous state, no currently-complete goals → []",
  newlyCompletedGoalIds([], [g("a", 5, 10)]),
  []
);

eq(
  "goal transitions from not-complete to complete → reports its id",
  newlyCompletedGoalIds([g("a", 5, 10)], [g("a", 10, 10)]),
  ["a"]
);

eq(
  "goal overshoots the target → still reports once",
  newlyCompletedGoalIds([g("a", 5, 10)], [g("a", 50, 10)]),
  ["a"]
);

eq(
  "goal already complete in previous snapshot → not reported again",
  newlyCompletedGoalIds([g("a", 10, 10)], [g("a", 10, 10)]),
  []
);

eq(
  "goal never complete → not reported",
  newlyCompletedGoalIds([g("a", 1, 10)], [g("a", 5, 10)]),
  []
);

eq(
  "multiple transitions at once are all reported",
  newlyCompletedGoalIds(
    [g("a", 5, 10), g("b", 0, 5), g("c", 3, 3)],
    [g("a", 10, 10), g("b", 7, 5), g("c", 3, 3)]
  ),
  ["a", "b"]
);

eq(
  "target of 0 never counts as complete (avoid false positives)",
  newlyCompletedGoalIds([g("a", 0, 0)], [g("a", 0, 0)]),
  []
);

eq(
  "brand-new goal that is already complete → reported",
  newlyCompletedGoalIds([], [g("a", 10, 10)]),
  ["a"]
);

// ── newlyEarnedBadgeIds ───────────────────────────────────
console.log("\nnewlyEarnedBadgeIds:");
eq(
  "empty seen set, earned = ['x'] → ['x']",
  newlyEarnedBadgeIds(["x"], new Set()),
  ["x"]
);
eq(
  "all earned already seen → []",
  newlyEarnedBadgeIds(["x", "y"], new Set(["x", "y"])),
  []
);
eq(
  "mix of seen and unseen → only unseen",
  newlyEarnedBadgeIds(["x", "y", "z"], new Set(["x"])),
  ["y", "z"]
);
eq(
  "earned order is preserved (not alphabetized)",
  newlyEarnedBadgeIds(["z", "a"], new Set()),
  ["z", "a"]
);

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
