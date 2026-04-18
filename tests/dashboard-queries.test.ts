/**
 * Dashboard aggregation helper tests
 * Run with: npx tsx tests/dashboard-queries.test.ts
 *
 * Exercises the pure helpers in src/lib/queries/dashboard-helpers.ts.
 * The helpers contain all the math that powers the Dashboard cards/charts,
 * so covering them here means we can trust the numbers without needing a
 * live Supabase instance. The thin query wrappers in dashboard.ts just
 * call these helpers, so they're validated indirectly.
 */

import type { DonationScope, CauseTag } from "../src/types";

import {
  aggregateByCause,
  aggregateByScope,
  aggregateMonthly,
  calculateStreak,
  computeMoMComparison,
  countDistinctOrganizations,
  getMonthKey,
  getMonthKeyWithOffset,
  getMonthStart,
  getYTDStart,
  nextSalaryMilestone,
  toISODate,
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

function eq<T>(name: string, got: T, want: T) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  assert(name, ok, ok ? undefined : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// Row helper for tests
function row(overrides: Partial<{
  amount: number;
  donation_date: string;
  scope: DonationScope;
  cause_tag: CauseTag | null;
  status: string;
  organization_name: string;
}>): {
  amount: number;
  donation_date: string;
  scope: DonationScope;
  cause_tag: CauseTag | null;
  status: string;
  organization_name: string;
} {
  return {
    amount: 10,
    donation_date: "2026-03-15",
    scope: "local",
    cause_tag: null,
    status: "confirmed",
    organization_name: "Charity",
    ...overrides,
  };
}

// ── Date helpers ──────────────────────────────────────────
console.log("\nDate helpers:");

eq("toISODate zero-pads month and day", toISODate(new Date(2026, 0, 5)), "2026-01-05");
eq("toISODate handles December", toISODate(new Date(2026, 11, 31)), "2026-12-31");
eq(
  "getMonthKey from string",
  getMonthKey("2026-03-15"),
  "2026-03"
);
eq(
  "getMonthKey from Date",
  getMonthKey(new Date(2026, 2, 15)),
  "2026-03"
);
eq("getYTDStart returns Jan 1", getYTDStart(new Date(2026, 5, 10)), "2026-01-01");
eq(
  "getMonthStart current month",
  getMonthStart(new Date(2026, 3, 17)),
  "2026-04-01"
);
eq(
  "getMonthStart previous month",
  getMonthStart(new Date(2026, 3, 17), -1),
  "2026-03-01"
);
eq(
  "getMonthStart wraps across year boundary",
  getMonthStart(new Date(2026, 0, 10), -1),
  "2025-12-01"
);
eq(
  "getMonthKeyWithOffset 11 months back",
  getMonthKeyWithOffset(new Date(2026, 3, 17), -11),
  "2025-05"
);

// ── Streak ────────────────────────────────────────────────
console.log("\nStreak:");

{
  const now = new Date(2026, 3, 17); // April 2026
  eq("empty set → 0", calculateStreak(new Set(), now), 0);
  eq(
    "current month only → 1",
    calculateStreak(new Set(["2026-04"]), now),
    1
  );
  eq(
    "3 contiguous months ending now → 3",
    calculateStreak(new Set(["2026-04", "2026-03", "2026-02"]), now),
    3
  );
  eq(
    "break in chain → stops at gap",
    calculateStreak(new Set(["2026-04", "2026-02"]), now),
    1
  );
  eq(
    "missing current month → 0",
    calculateStreak(new Set(["2026-03", "2026-02"]), now),
    0
  );
  eq(
    "crosses year boundary",
    calculateStreak(
      new Set(["2026-01", "2025-12", "2025-11"]),
      new Date(2026, 0, 15)
    ),
    3
  );
}

// ── nextSalaryMilestone ───────────────────────────────────
console.log("\nSalary milestone:");

eq("null stays null", nextSalaryMilestone(null), null);
eq("negative input clamps to 1", nextSalaryMilestone(-0.5), 1);
eq("0% → 1%", nextSalaryMilestone(0), 1);
eq("0.5% → 1%", nextSalaryMilestone(0.5), 1);
eq("2% → 3%", nextSalaryMilestone(2), 3);
eq("2.9% → 3%", nextSalaryMilestone(2.9), 3);
eq("29% → 30%", nextSalaryMilestone(29), 30);
eq("30% → null (capped)", nextSalaryMilestone(30), null);
eq("35% → null", nextSalaryMilestone(35), null);

// ── aggregateMonthly ──────────────────────────────────────
console.log("\naggregateMonthly:");

{
  const now = new Date(2026, 3, 17);
  const empty = aggregateMonthly([], 12, now);
  eq("empty input → 12 zero buckets", empty.length, 12);
  assert(
    "empty input → all totals zero",
    empty.every((m) => m.total === 0)
  );
  assert(
    "buckets ordered oldest to newest",
    empty[0].month === "2025-05" && empty[11].month === "2026-04"
  );

  const rows = [
    row({ donation_date: "2026-04-03", amount: 100 }),
    row({ donation_date: "2026-04-10", amount: 50 }),
    row({ donation_date: "2026-03-01", amount: 200 }),
    row({ donation_date: "2026-03-15", amount: 75, status: "pending" }),
    row({ donation_date: "2025-05-01", amount: 25 }),
  ];
  const monthly = aggregateMonthly(rows, 12, now);
  const byMonth = new Map(monthly.map((m) => [m.month, m.total]));
  eq("April 2026 sum", byMonth.get("2026-04"), 150);
  eq("March 2026 sum (pending excluded)", byMonth.get("2026-03"), 200);
  eq("May 2025 sum", byMonth.get("2025-05"), 25);
  eq("February 2026 sum (empty)", byMonth.get("2026-02"), 0);
}

// ── aggregateByScope ──────────────────────────────────────
console.log("\naggregateByScope:");

{
  const empty = aggregateByScope([]);
  eq("always returns 3 scopes", empty.length, 3);
  assert(
    "empty → all zero",
    empty.every((s) => s.total === 0 && s.count === 0)
  );

  const rows = [
    row({ scope: "local", amount: 10 }),
    row({ scope: "local", amount: 20 }),
    row({ scope: "national", amount: 100 }),
    row({ scope: "global", amount: 50, status: "skipped" }),
  ];
  const breakdown = aggregateByScope(rows);
  const byScope = new Map(breakdown.map((s) => [s.scope, s]));
  eq("local sums two donations", byScope.get("local")?.total, 30);
  eq("local count is 2", byScope.get("local")?.count, 2);
  eq("national sums one donation", byScope.get("national")?.total, 100);
  eq("global excludes skipped", byScope.get("global")?.total, 0);
}

// ── aggregateByCause ──────────────────────────────────────
console.log("\naggregateByCause:");

{
  const empty = aggregateByCause([]);
  eq("empty input → empty array", empty.length, 0);

  const rows = [
    row({ cause_tag: "education", amount: 100 }),
    row({ cause_tag: "education", amount: 50 }),
    row({ cause_tag: "health", amount: 200 }),
    row({ cause_tag: null, amount: 25 }),
    row({ cause_tag: "environment", amount: 10, status: "skipped" }),
  ];
  const breakdown = aggregateByCause(rows);
  eq("sorted descending by total", breakdown[0].cause_tag, "health");
  eq("education second", breakdown[1].cause_tag, "education");
  eq("uncategorized bucket captures null", breakdown[2].cause_tag, "uncategorized");
  eq("education sums correctly", breakdown[1].total, 150);
  eq("skipped environment excluded", breakdown.find((b) => b.cause_tag === "environment"), undefined);
}

// ── computeMoMComparison ──────────────────────────────────
console.log("\ncomputeMoMComparison:");

{
  const zero = computeMoMComparison(0, 0);
  eq("both zero → null pct", zero.percentage_change, null);
  const growth = computeMoMComparison(150, 100);
  eq("50% growth", growth.percentage_change, 50);
  const decline = computeMoMComparison(50, 100);
  eq("50% decline", decline.percentage_change, -50);
  const fromZero = computeMoMComparison(100, 0);
  eq("current non-zero, prev zero → null (avoid div/0)", fromZero.percentage_change, null);
}

// ── countDistinctOrganizations ────────────────────────────
console.log("\ncountDistinctOrganizations:");

{
  eq("empty → 0", countDistinctOrganizations([]), 0);
  const rows = [
    row({ organization_name: "Red Cross" }),
    row({ organization_name: "red cross  " }),
    row({ organization_name: "UNICEF" }),
    row({ organization_name: "UNICEF", status: "pending" }),
  ];
  eq(
    "case-insensitive, trimmed, pending excluded",
    countDistinctOrganizations(rows),
    2
  );
}

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
