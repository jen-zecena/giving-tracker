/**
 * Unit tests for the InsightsCard data layer (DP-021).
 * Run with: npx tsx tests/insights.test.ts
 */

import { generateInsights } from "../src/lib/queries/dashboard-helpers";
import type { CauseTag, DonationScope } from "../src/types";

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

type Row = {
  amount: number;
  donation_date: string;
  scope: DonationScope;
  cause_tag: CauseTag | null;
  status?: string;
  organization_name?: string;
  is_recurring?: boolean;
};

function row(partial: Partial<Row>): Row {
  return {
    amount: 50,
    donation_date: "2026-04-10",
    scope: "local",
    cause_tag: "education",
    status: "confirmed",
    organization_name: "Test Org",
    is_recurring: false,
    ...partial,
  };
}

const NOW = new Date(2026, 3, 15); // April 15, 2026 local

// ── Empty ────────────────────────────────────────────────
console.log("\nempty / zero state:");

{
  assert(
    "returns [] when no rows (so the card can hide)",
    generateInsights([], NOW).length === 0,
  );
}

{
  const rows = [row({ status: "pending" })];
  assert(
    "returns [] when all rows are non-confirmed",
    generateInsights(rows, NOW).length === 0,
  );
}

// ── MoM increase ─────────────────────────────────────────
console.log("\nMoM increase insight:");

{
  const rows = [
    row({ amount: 100, donation_date: "2026-03-05" }), // last month
    row({ amount: 200, donation_date: "2026-04-05" }), // this month
  ];
  const insights = generateInsights(rows, NOW);
  const mom = insights.find((i) => i.key === "mom-increase");
  assert("includes a MoM insight when this month > last month", Boolean(mom));
  assert(
    "MoM text uses rounded percent increase (200 vs 100 → 100%)",
    mom?.text === "You're giving 100% more than last month!",
  );
}

{
  const rows = [
    row({ amount: 100, donation_date: "2026-03-05" }),
    row({ amount: 50, donation_date: "2026-04-05" }),
  ];
  const insights = generateInsights(rows, NOW);
  assert(
    "omits MoM insight when this month ≤ last month",
    !insights.some((i) => i.key === "mom-increase"),
  );
}

{
  const rows = [row({ amount: 100, donation_date: "2026-04-05" })];
  const insights = generateInsights(rows, NOW);
  assert(
    "omits MoM insight when last month was 0 (no division by zero)",
    !insights.some((i) => i.key === "mom-increase"),
  );
}

// ── Top cause ────────────────────────────────────────────
console.log("\ntop cause insight:");

{
  const rows = [
    row({ cause_tag: "education", donation_date: "2026-04-05" }),
    row({ cause_tag: "education", donation_date: "2026-04-06" }),
    row({ cause_tag: "health", donation_date: "2026-04-07" }),
  ];
  const insights = generateInsights(rows, NOW);
  const top = insights.find((i) => i.key === "top-cause");
  assert(
    "humanizes cause tag (Education)",
    top?.text.startsWith("Education") ?? false,
  );
  assert(
    "reports percentage (2/3 → 67%)",
    top?.text.endsWith("(67% of donations)") ?? false,
  );
}

{
  const rows = [
    row({ cause_tag: null, donation_date: "2026-04-05" }),
    row({ cause_tag: null, donation_date: "2026-04-06" }),
    row({ cause_tag: "education", donation_date: "2026-04-07" }),
  ];
  const insights = generateInsights(rows, NOW);
  const top = insights.find((i) => i.key === "top-cause");
  assert(
    "uncategorized cause is humanized, not raw enum",
    top?.text.startsWith("Uncategorized") ?? false,
  );
}

{
  const rows = [
    row({ cause_tag: "animal_welfare", donation_date: "2026-04-05" }),
  ];
  const insights = generateInsights(rows, NOW);
  const top = insights.find((i) => i.key === "top-cause");
  assert(
    "multi-word tags are title-cased ('animal_welfare' → 'Animal Welfare')",
    top?.text.startsWith("Animal Welfare") ?? false,
  );
}

// ── Unique orgs this month ───────────────────────────────
console.log("\nunique orgs this month insight:");

{
  const rows = [
    row({ organization_name: "A", donation_date: "2026-04-05" }),
    row({ organization_name: "B", donation_date: "2026-04-10" }),
    row({ organization_name: "C", donation_date: "2026-03-15" }), // last month — excluded
  ];
  const insights = generateInsights(rows, NOW);
  const orgs = insights.find((i) => i.key === "unique-orgs");
  assert(
    "fires when user supported 2+ distinct orgs this month",
    orgs?.text === "You've supported 2 different organizations this month",
  );
}

{
  const rows = [
    row({ organization_name: "A", donation_date: "2026-04-05" }),
    row({ organization_name: "a", donation_date: "2026-04-10" }), // case-duplicate
  ];
  const insights = generateInsights(rows, NOW);
  assert(
    "case-insensitive dedupe — 'A' and 'a' count as one org",
    !insights.some((i) => i.key === "unique-orgs"),
  );
}

{
  const rows = [row({ organization_name: "A", donation_date: "2026-04-05" })];
  const insights = generateInsights(rows, NOW);
  assert(
    "suppressed when only 1 org this month",
    !insights.some((i) => i.key === "unique-orgs"),
  );
}

// ── Recurring consistency ────────────────────────────────
console.log("\nrecurring insight:");

{
  const rows = [
    row({ is_recurring: true, donation_date: "2026-04-05" }),
  ];
  const insights = generateInsights(rows, NOW);
  assert(
    "fires when any donation is recurring",
    insights.some((i) => i.key === "recurring"),
  );
}

{
  const rows = [row({ is_recurring: false, donation_date: "2026-04-05" })];
  const insights = generateInsights(rows, NOW);
  assert(
    "absent when no donation is recurring",
    !insights.some((i) => i.key === "recurring"),
  );
}

// ── Most generous month ──────────────────────────────────
console.log("\nmost generous month insight:");

{
  const rows = [
    row({ amount: 100, donation_date: "2026-02-10" }),
    row({ amount: 500, donation_date: "2026-03-10" }),
    row({ amount: 50, donation_date: "2026-04-05" }),
  ];
  const insights = generateInsights(rows, NOW);
  const generous = insights.find((i) => i.key === "generous-month");
  assert(
    "picks the month with the largest total",
    generous?.text === "Your most generous month was March 2026",
  );
}

{
  const rows = [
    row({ amount: 100, donation_date: "2026-04-05" }),
    row({ amount: 200, donation_date: "2026-04-10" }),
  ];
  const insights = generateInsights(rows, NOW);
  assert(
    "suppressed when user has activity in only 1 month (not enough comparison)",
    !insights.some((i) => i.key === "generous-month"),
  );
}

// ── Cap at 3 insights ────────────────────────────────────
console.log("\nmax 3 insights:");

{
  const rows = [
    // MoM +100%
    row({ amount: 100, donation_date: "2026-03-05", cause_tag: "education" }),
    row({ amount: 200, donation_date: "2026-04-05", cause_tag: "education" }),
    // 2 unique orgs this month + recurring
    row({
      amount: 50,
      donation_date: "2026-04-10",
      organization_name: "Org B",
      is_recurring: true,
      cause_tag: "health",
    }),
    // 2+ months of activity (Feb, Mar, Apr)
    row({ amount: 75, donation_date: "2026-02-10", cause_tag: "health" }),
  ];
  const insights = generateInsights(rows, NOW);
  assert("caps at 3 insights even when 5 would fire", insights.length === 3);
  assert(
    "MoM insight ranks first (highest priority)",
    insights[0]?.key === "mom-increase",
  );
  assert("top-cause ranks second", insights[1]?.key === "top-cause");
}

// ── Summary ──────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
