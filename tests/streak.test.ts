/**
 * Streak calculation tests
 * Run with: npx tsx tests/streak.test.ts
 *
 * Tests the pure helper functions for current and longest streak
 * calculation without requiring a running Supabase instance.
 */

import {
  calculateStreak,
  calculateLongestStreak,
} from "../src/lib/queries/dashboard-helpers";

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

// ── Current streak ────────────────────────────────────────
console.log("\nCurrent streak (calculateStreak):");

{
  const now = new Date("2026-04-15");
  const months = new Set(["2026-04", "2026-03", "2026-02"]);
  assert(
    "3 consecutive months ending at now",
    calculateStreak(months, now) === 3
  );
}

{
  const now = new Date("2026-04-15");
  const months = new Set(["2026-04", "2026-02"]); // gap at March
  assert(
    "gap breaks streak — only current month counts",
    calculateStreak(months, now) === 1
  );
}

{
  const now = new Date("2026-04-15");
  const months = new Set<string>([]);
  assert(
    "empty set → 0",
    calculateStreak(months, now) === 0
  );
}

{
  const now = new Date("2026-04-15");
  const months = new Set(["2026-03", "2026-02", "2026-01"]); // not current month
  assert(
    "no donation in current month → 0",
    calculateStreak(months, now) === 0
  );
}

{
  const now = new Date("2026-01-10");
  const months = new Set(["2026-01", "2025-12", "2025-11", "2025-10"]);
  assert(
    "streak crosses year boundary",
    calculateStreak(months, now) === 4
  );
}

{
  const now = new Date("2026-04-15");
  const months = new Set(["2026-04"]);
  assert(
    "single month → 1",
    calculateStreak(months, now) === 1
  );
}

// ── Longest streak ────────────────────────────────────────
console.log("\nLongest streak (calculateLongestStreak):");

{
  const months = new Set(["2026-01", "2026-02", "2026-03", "2025-06", "2025-07"]);
  assert(
    "longest is 3 (Jan-Mar), not 2 (Jun-Jul)",
    calculateLongestStreak(months) === 3
  );
}

{
  const months = new Set(["2025-06", "2025-07", "2025-08", "2025-09", "2025-10",
    "2026-01", "2026-02"]);
  assert(
    "longest is 5 (Jun-Oct), not 2 (Jan-Feb)",
    calculateLongestStreak(months) === 5
  );
}

{
  const months = new Set<string>([]);
  assert(
    "empty set → 0",
    calculateLongestStreak(months) === 0
  );
}

{
  const months = new Set(["2026-03"]);
  assert(
    "single month → 1",
    calculateLongestStreak(months) === 1
  );
}

{
  const months = new Set(["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]);
  assert(
    "6 consecutive months across year boundary",
    calculateLongestStreak(months) === 6
  );
}

{
  const months = new Set(["2025-01", "2025-03", "2025-05"]);
  assert(
    "no consecutive months → longest is 1",
    calculateLongestStreak(months) === 1
  );
}

{
  const months = new Set(["2025-01", "2025-02", "2025-05", "2025-06", "2025-07"]);
  assert(
    "two runs (2 and 3) → longest is 3",
    calculateLongestStreak(months) === 3
  );
}

// ── Current equals longest when appropriate ───────────────
console.log("\nCurrent vs longest:");

{
  const now = new Date("2026-04-15");
  const months = new Set(["2026-04", "2026-03", "2026-02", "2026-01"]);
  const current = calculateStreak(months, now);
  const longest = calculateLongestStreak(months);
  assert(
    "current run IS the longest → both equal 4",
    current === 4 && longest === 4
  );
}

{
  const now = new Date("2026-04-15");
  const months = new Set(["2026-04", "2025-06", "2025-07", "2025-08"]);
  const current = calculateStreak(months, now);
  const longest = calculateLongestStreak(months);
  assert(
    "current (1) shorter than longest (3)",
    current === 1 && longest === 3
  );
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
