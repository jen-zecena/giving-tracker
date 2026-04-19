/**
 * Goals server-action tests
 * Run with: npx tsx tests/goals-actions.test.ts
 *
 * Covers the pure halves of the DP-030 surface:
 *   1. Timeframe filtering (month / year / ongoing)
 *   2. Per-type current derivation (amount / count / organizations / causes)
 *   3. Zod schemas for create / update (createGoalSchema / updateGoalSchema)
 *
 * DB-touching concerns (RLS, insert/update/delete round-trips) are left to
 * the live Supabase environment because the derivation + validation is
 * where the interesting correctness invariants live.
 */

import type { DonationRowForGoal } from "../src/lib/queries/goals-helpers";
import {
  currentForGoal,
  deriveCurrent,
  filterByTimeframe,
  getTimeframeStart,
} from "../src/lib/queries/goals-helpers";
import {
  parseCreateGoal,
  parseUpdateGoal,
} from "../src/lib/actions/goals-validation";

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

function row(overrides: Partial<DonationRowForGoal>): DonationRowForGoal {
  return {
    amount: 10,
    donation_date: "2026-04-15",
    organization_name: "Red Cross",
    cause_tag: "health",
    status: "confirmed",
    ...overrides,
  };
}

// ── Timeframe bounds ──────────────────────────────────────
console.log("\nTimeframe bounds:");

{
  const apr17 = new Date(2026, 3, 17);
  eq("month → first of current month", getTimeframeStart("month", apr17), "2026-04-01");
  eq("year → Jan 1 of current year", getTimeframeStart("year", apr17), "2026-01-01");
  eq("ongoing → null (no lower bound)", getTimeframeStart("ongoing", apr17), null);
}

// ── filterByTimeframe ─────────────────────────────────────
console.log("\nfilterByTimeframe:");

{
  const now = new Date(2026, 3, 17);
  const rows = [
    row({ donation_date: "2026-04-15", amount: 10 }),
    row({ donation_date: "2026-04-01", amount: 20 }),
    row({ donation_date: "2026-03-31", amount: 30 }),
    row({ donation_date: "2026-01-15", amount: 40 }),
    row({ donation_date: "2025-12-10", amount: 50 }),
    row({ donation_date: "2026-04-10", amount: 60, status: "pending" }),
    row({ donation_date: "2026-04-12", amount: 70, status: "skipped" }),
  ];

  const month = filterByTimeframe(rows, "month", now);
  eq(
    "month includes this month's confirmed only",
    month.map((r) => r.amount).sort(),
    [10, 20]
  );

  const year = filterByTimeframe(rows, "year", now);
  eq(
    "year includes YTD confirmed only",
    year.map((r) => r.amount).sort((a, b) => a - b),
    [10, 20, 30, 40]
  );

  const ongoing = filterByTimeframe(rows, "ongoing", now);
  eq(
    "ongoing includes all confirmed (no date bound, still drops non-confirmed)",
    ongoing.map((r) => r.amount).sort((a, b) => a - b),
    [10, 20, 30, 40, 50]
  );
}

// ── deriveCurrent per type ────────────────────────────────
console.log("\nderiveCurrent — all 4 types:");

{
  const empty: DonationRowForGoal[] = [];
  eq("empty / amount → 0", deriveCurrent(empty, "amount"), 0);
  eq("empty / count → 0", deriveCurrent(empty, "count"), 0);
  eq("empty / organizations → 0", deriveCurrent(empty, "organizations"), 0);
  eq("empty / causes → 0", deriveCurrent(empty, "causes"), 0);
}

{
  const rows = [
    row({ amount: 100, organization_name: "Red Cross", cause_tag: "health" }),
    row({ amount: 200, organization_name: "red cross  ", cause_tag: "health" }),
    row({ amount: 50, organization_name: "UNICEF", cause_tag: "education" }),
    row({ amount: 25, organization_name: "Sierra Club", cause_tag: null }),
  ];
  eq("amount → sum of amounts", deriveCurrent(rows, "amount"), 375);
  eq("count → row length", deriveCurrent(rows, "count"), 4);
  eq(
    "organizations → distinct trimmed+lowercased names",
    deriveCurrent(rows, "organizations"),
    3
  );
  eq(
    "causes → distinct non-null cause tags",
    deriveCurrent(rows, "causes"),
    2
  );
}

// ── currentForGoal (combines filter + derive) ─────────────
console.log("\ncurrentForGoal — timeframe + type together:");

{
  const now = new Date(2026, 3, 17);
  const rows = [
    row({ donation_date: "2026-04-15", amount: 100, organization_name: "A" }),
    row({ donation_date: "2026-03-15", amount: 200, organization_name: "B" }),
    row({ donation_date: "2026-01-10", amount: 300, organization_name: "C" }),
    row({ donation_date: "2025-08-01", amount: 50, organization_name: "D" }),
    // Non-confirmed — should never count regardless of timeframe.
    row({ donation_date: "2026-04-01", amount: 9999, status: "pending" }),
  ];

  eq("amount/month", currentForGoal(rows, "amount", "month", now), 100);
  eq("amount/year", currentForGoal(rows, "amount", "year", now), 600);
  eq("amount/ongoing", currentForGoal(rows, "amount", "ongoing", now), 650);
  eq("count/month", currentForGoal(rows, "count", "month", now), 1);
  eq("count/year", currentForGoal(rows, "count", "year", now), 3);
  eq("count/ongoing", currentForGoal(rows, "count", "ongoing", now), 4);
  eq(
    "organizations/year",
    currentForGoal(rows, "organizations", "year", now),
    3
  );
  eq(
    "organizations/ongoing",
    currentForGoal(rows, "organizations", "ongoing", now),
    4
  );
}

// ── createGoalSchema ──────────────────────────────────────
console.log("\ncreateGoalSchema:");

{
  const valid = parseCreateGoal({
    title: "Give 10% of salary",
    description: "stretch goal",
    type: "amount",
    target: 5000,
    timeframe: "year",
  });
  assert("accepts a fully-specified valid goal", valid.ok === true);

  const whitespace = parseCreateGoal({
    title: "x",
    description: "   ",
    type: "amount",
    target: 1,
    timeframe: "month",
  });
  eq(
    "trims description whitespace",
    whitespace.ok ? whitespace.data.description : "ERR",
    null
  );

  const missing = parseCreateGoal({
    title: "x",
    type: "amount",
    target: 1,
    timeframe: "month",
  });
  eq(
    "omitted description becomes null",
    missing.ok ? missing.data.description : "ERR",
    null
  );
}

{
  assert(
    "rejects empty title",
    parseCreateGoal({
      title: "   ",
      type: "amount",
      target: 1,
      timeframe: "month",
    }).ok === false
  );
  assert(
    "rejects title over 80 chars",
    parseCreateGoal({
      title: "x".repeat(81),
      type: "amount",
      target: 1,
      timeframe: "month",
    }).ok === false
  );
  assert(
    "rejects description over 280 chars",
    parseCreateGoal({
      title: "ok",
      description: "x".repeat(281),
      type: "amount",
      target: 1,
      timeframe: "month",
    }).ok === false
  );
  assert(
    "rejects non-positive target",
    parseCreateGoal({
      title: "ok",
      type: "amount",
      target: 0,
      timeframe: "month",
    }).ok === false
  );
  assert(
    "rejects negative target",
    parseCreateGoal({
      title: "ok",
      type: "amount",
      target: -10,
      timeframe: "month",
    }).ok === false
  );
  assert(
    "rejects non-finite target",
    parseCreateGoal({
      title: "ok",
      type: "amount",
      target: Number.POSITIVE_INFINITY,
      timeframe: "month",
    }).ok === false
  );
  assert(
    "rejects unknown type",
    parseCreateGoal({
      title: "ok",
      type: "foo",
      target: 1,
      timeframe: "month",
    }).ok === false
  );
  assert(
    "rejects unknown timeframe",
    parseCreateGoal({
      title: "ok",
      type: "amount",
      target: 1,
      timeframe: "decade",
    }).ok === false
  );
}

// ── updateGoalSchema ──────────────────────────────────────
console.log("\nupdateGoalSchema:");

{
  assert(
    "accepts a single-field patch",
    parseUpdateGoal({ target: 100 }).ok === true
  );
  assert(
    "accepts a title-only patch",
    parseUpdateGoal({ title: "New title" }).ok === true
  );
  const empty = parseUpdateGoal({});
  assert(
    "rejects empty patch",
    empty.ok === false && empty.error === "No fields to update."
  );
  assert(
    "rejects invalid type on patch",
    parseUpdateGoal({ type: "bogus" }).ok === false
  );
  assert(
    "rejects non-positive target on patch",
    parseUpdateGoal({ target: 0 }).ok === false
  );
}

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
