/**
 * Dashboard timeframe tests
 * Run with: npx tsx tests/dashboard-timeframe.test.ts
 *
 * Covers the pure timeframe layer that powers the dashboard's range
 * selector: URL param parsing, resolving presets/custom to concrete date
 * windows, choosing a trend granularity for a span, and bucketing donations
 * into a continuous trend series. No DB — all inputs are plain values.
 */

import type { CauseTag, DonationScope } from "../src/types";
import {
  DEFAULT_TIMEFRAME,
  parseTimeframeParams,
  resolveTimeframe,
  trendGranularity,
} from "../src/lib/dashboard-timeframe";
import { aggregateTrend } from "../src/lib/queries/dashboard-helpers";

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

function row(o: {
  amount: number;
  donation_date: string;
  status?: string;
}): { amount: number; donation_date: string; scope: DonationScope; cause_tag: CauseTag | null; status?: string } {
  return {
    amount: o.amount,
    donation_date: o.donation_date,
    scope: "local",
    cause_tag: null,
    status: o.status,
  };
}

// Fixed "now" so preset windows are deterministic.
const NOW = new Date(2026, 6, 15); // 2026-07-15 (local)

// ── parseTimeframeParams ──────────────────────────────────
console.log("\nparseTimeframeParams:");
eq("empty params -> default option", parseTimeframeParams({}).option, DEFAULT_TIMEFRAME);
eq("unknown range -> default", parseTimeframeParams({ range: "nope" }).option, DEFAULT_TIMEFRAME);
eq("valid preset passes through", parseTimeframeParams({ range: "3m" }).option, "3m");
{
  const p = parseTimeframeParams({ range: "custom", from: "2026-01-01", to: "2026-02-01" });
  eq("custom option parsed", p.option, "custom");
  eq("custom from parsed", p.from, "2026-01-01");
  eq("custom to parsed", p.to, "2026-02-01");
}
eq(
  "array param takes first value",
  parseTimeframeParams({ range: ["6m", "1y"] }).option,
  "6m"
);

// ── resolveTimeframe (presets) ────────────────────────────
console.log("\nresolveTimeframe presets (now = 2026-07-15):");
eq("ytd start is Jan 1", resolveTimeframe({ option: "ytd" }, NOW).range.start, "2026-01-01");
eq("ytd end is today", resolveTimeframe({ option: "ytd" }, NOW).range.end, "2026-07-15");
eq("1m start", resolveTimeframe({ option: "1m" }, NOW).range.start, "2026-06-15");
eq("3m start", resolveTimeframe({ option: "3m" }, NOW).range.start, "2026-04-15");
eq("6m start", resolveTimeframe({ option: "6m" }, NOW).range.start, "2026-01-15");
eq("1y start", resolveTimeframe({ option: "1y" }, NOW).range.start, "2025-07-15");
eq(
  "default option resolves to YTD window",
  resolveTimeframe({ option: DEFAULT_TIMEFRAME }, NOW).range.start,
  "2026-01-01"
);

// ── resolveTimeframe (custom) ─────────────────────────────
console.log("\nresolveTimeframe custom:");
{
  const r = resolveTimeframe({ option: "custom", from: "2025-11-01", to: "2026-02-15" }, NOW);
  eq("valid custom keeps option", r.option, "custom");
  eq("valid custom start", r.range.start, "2025-11-01");
  eq("valid custom end", r.range.end, "2026-02-15");
  assert("valid custom is not flagged invalid", !r.invalidCustom);
}
{
  const r = resolveTimeframe({ option: "custom", from: "2026-05-01" }, NOW); // missing `to`
  eq("incomplete custom falls back to default option", r.option, DEFAULT_TIMEFRAME);
  assert("incomplete custom flagged invalidCustom", r.invalidCustom === true);
}
{
  const r = resolveTimeframe({ option: "custom", from: "2026-05-01", to: "2026-04-01" }, NOW); // from > to
  assert("reversed custom range flagged invalidCustom", r.invalidCustom === true);
}

// ── trendGranularity ──────────────────────────────────────
console.log("\ntrendGranularity:");
eq("1m span -> day", trendGranularity(resolveTimeframe({ option: "1m" }, NOW).range), "day");
eq("3m span -> week", trendGranularity(resolveTimeframe({ option: "3m" }, NOW).range), "week");
eq("6m span -> week", trendGranularity(resolveTimeframe({ option: "6m" }, NOW).range), "week");
eq("ytd span -> month", trendGranularity(resolveTimeframe({ option: "ytd" }, NOW).range), "month");
eq("1y span -> month", trendGranularity(resolveTimeframe({ option: "1y" }, NOW).range), "month");

// ── aggregateTrend ────────────────────────────────────────
console.log("\naggregateTrend:");
{
  // Month granularity over a full year.
  const range = { start: "2026-01-01", end: "2026-12-31" };
  const rows = [
    row({ amount: 100, donation_date: "2026-01-10" }),
    row({ amount: 50, donation_date: "2026-01-20" }),
    row({ amount: 200, donation_date: "2026-03-05" }),
    row({ amount: 999, donation_date: "2026-03-06", status: "pending" }), // excluded
  ];
  const trend = aggregateTrend(rows, range, "month");
  eq("month: 12 buckets", trend.length, 12);
  eq("month: first label Jan", trend[0].label, "Jan");
  eq("month: last label Dec", trend[11].label, "Dec");
  eq("month: Jan total sums confirmed", trend[0].total, 150);
  eq("month: Mar total excludes pending", trend[2].total, 200);
  eq("month: empty month is zero", trend[1].total, 0);
}
{
  // Day granularity over one month.
  const range = { start: "2026-03-01", end: "2026-03-31" };
  const rows = [
    row({ amount: 40, donation_date: "2026-03-05" }),
    row({ amount: 60, donation_date: "2026-03-05" }),
    row({ amount: 25, donation_date: "2026-03-20" }),
  ];
  const trend = aggregateTrend(rows, range, "day");
  eq("day: 31 buckets", trend.length, 31);
  eq("day: Mar 5 total", trend.find((p) => p.date === "2026-03-05")?.total, 100);
  eq("day: Mar 20 total", trend.find((p) => p.date === "2026-03-20")?.total, 25);
  eq("day: label formatted", trend[0].label, "Mar 1");
}
{
  // Week granularity totals reconcile with confirmed sum.
  const range = { start: "2026-01-01", end: "2026-03-31" };
  const rows = [
    row({ amount: 100, donation_date: "2026-01-05" }),
    row({ amount: 200, donation_date: "2026-02-14" }),
    row({ amount: 300, donation_date: "2026-03-30" }),
  ];
  const trend = aggregateTrend(rows, range, "week");
  const sum = trend.reduce((s, p) => s + p.total, 0);
  eq("week: totals reconcile with confirmed sum", sum, 600);
  assert("week: has multiple buckets", trend.length > 4);
}
eq(
  "reversed range yields empty series",
  aggregateTrend([], { start: "2026-05-01", end: "2026-01-01" }, "month").length,
  0
);

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
