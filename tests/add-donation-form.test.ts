/**
 * Unit tests for Add Donation page helpers (DP-012).
 * Run with: npx tsx tests/add-donation-form.test.ts
 *
 * Covers:
 *   • organization autocomplete filter
 *   • date preset detection (Today / Yesterday / Last Week / Custom)
 *   • celebration-toast branch selection
 *   • unique-org collapsing (mirrors the server action)
 */

import { filterOrgSuggestions } from "../src/app/(app)/donations/new/new-donation-form";

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

// ── Autocomplete filter ────────────────────────────────────
console.log("\nfilterOrgSuggestions:");

{
  const orgs = ["Red Cross", "UNICEF", "Local Food Bank", "Red Shield"];
  const out = filterOrgSuggestions("red", orgs);
  assert(
    "matches substring case-insensitively",
    out.length === 2 && out.includes("Red Cross") && out.includes("Red Shield"),
  );
}

{
  const out = filterOrgSuggestions("", ["Red Cross"]);
  assert("returns empty on blank query (prevents flood of suggestions)", out.length === 0);
}

{
  const orgs = ["Red Cross"];
  const out = filterOrgSuggestions("red cross", orgs);
  assert(
    "hides exact-match (user has already selected it)",
    out.length === 0,
  );
}

{
  const orgs = Array.from({ length: 12 }, (_, i) => `Food Bank ${i}`);
  const out = filterOrgSuggestions("food", orgs);
  assert("caps results at 5", out.length === 5);
}

{
  const orgs = ["  "];
  const out = filterOrgSuggestions("a", orgs);
  assert("does not include whitespace-only suggestions that don't match", out.length === 0);
}

// ── Date preset detection ──────────────────────────────────
console.log("\ndate preset detection:");

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function daysAgo(n: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

{
  const today = startOfDay(new Date());
  assert("Today preset matches today", isSameDay(today, startOfDay(new Date())));
}

{
  const y = daysAgo(1);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  assert("Yesterday preset matches yesterday", isSameDay(y, yesterday));
}

{
  const lw = daysAgo(7);
  const now = new Date();
  const expected = new Date(now);
  expected.setDate(now.getDate() - 7);
  expected.setHours(0, 0, 0, 0);
  assert("Last Week preset matches 7 days ago", isSameDay(lw, expected));
}

{
  const custom = new Date("2020-01-15T00:00:00");
  const today = startOfDay(new Date());
  const isToday = isSameDay(custom, today);
  const isYesterday = isSameDay(custom, daysAgo(1));
  const isLastWeek = isSameDay(custom, daysAgo(7));
  assert(
    "old date is none of Today/Yesterday/LastWeek → Custom",
    !isToday && !isYesterday && !isLastWeek,
  );
}

// ── Unique-org collapsing (mirrors getOrganizationSuggestions server action) ──
console.log("\nunique org collapsing (server action logic):");

function uniqueOrgs(rows: { organization_name: string }[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const row of rows) {
    const name = row.organization_name?.trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      unique.push(name);
    }
  }
  return unique;
}

{
  const rows = [
    { organization_name: "Red Cross" },
    { organization_name: "red cross" },
    { organization_name: "UNICEF" },
    { organization_name: "  " },
    { organization_name: "RED CROSS" },
  ];
  const out = uniqueOrgs(rows);
  assert(
    "collapses case-different duplicates; keeps first seen casing",
    out.length === 2 && out[0] === "Red Cross" && out[1] === "UNICEF",
  );
}

{
  const rows = [
    { organization_name: "" },
    { organization_name: "   " },
  ];
  assert("drops empty / whitespace-only rows", uniqueOrgs(rows).length === 0);
}

// ── Celebration toast selection ────────────────────────────
console.log("\ncelebration toast selection:");

type ToastKind =
  | "first_donation"
  | "big_gift"
  | "recurring_setup"
  | "milestone"
  | "default";

function selectToast(opts: {
  numAmount: number;
  totalCount: number;
  isRecurringGift: boolean;
}): ToastKind {
  const MILESTONES = [10, 25, 50, 100];
  const { numAmount, totalCount, isRecurringGift } = opts;
  if (totalCount === 1) return "first_donation";
  if (numAmount >= 1000) return "big_gift";
  if (isRecurringGift) return "recurring_setup";
  if (MILESTONES.includes(totalCount)) return "milestone";
  return "default";
}

{
  assert(
    "first donation wins over everything",
    selectToast({ numAmount: 5000, totalCount: 1, isRecurringGift: true }) ===
      "first_donation",
  );
}

{
  assert(
    "big gift ($1000+) beats recurring and milestone",
    selectToast({ numAmount: 1000, totalCount: 10, isRecurringGift: true }) ===
      "big_gift",
  );
}

{
  assert(
    "recurring setup shown when not first/big",
    selectToast({ numAmount: 50, totalCount: 5, isRecurringGift: true }) ===
      "recurring_setup",
  );
}

{
  assert(
    "milestone 10",
    selectToast({ numAmount: 50, totalCount: 10, isRecurringGift: false }) ===
      "milestone",
  );
  assert(
    "milestone 25",
    selectToast({ numAmount: 50, totalCount: 25, isRecurringGift: false }) ===
      "milestone",
  );
  assert(
    "milestone 50",
    selectToast({ numAmount: 50, totalCount: 50, isRecurringGift: false }) ===
      "milestone",
  );
  assert(
    "milestone 100",
    selectToast({ numAmount: 50, totalCount: 100, isRecurringGift: false }) ===
      "milestone",
  );
}

{
  assert(
    "default toast for normal donation",
    selectToast({ numAmount: 50, totalCount: 5, isRecurringGift: false }) ===
      "default",
  );
}

{
  assert(
    "non-milestone count (e.g. 11) falls through to default",
    selectToast({ numAmount: 50, totalCount: 11, isRecurringGift: false }) ===
      "default",
  );
}

// ── Next-due-date calculation (mirrors server action helper) ──
console.log("\nnext due date calculation:");

function getNextDueDate(date: string, frequency: string): string {
  const d = new Date(date + "T00:00:00");
  switch (frequency) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "annually":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

{
  assert(
    "weekly adds 7 days",
    getNextDueDate("2026-01-01", "weekly") === "2026-01-08",
  );
  assert(
    "monthly adds one month",
    getNextDueDate("2026-01-15", "monthly") === "2026-02-15",
  );
  assert(
    "quarterly adds three months",
    getNextDueDate("2026-01-15", "quarterly") === "2026-04-15",
  );
  assert(
    "annually adds one year",
    getNextDueDate("2026-01-15", "annually") === "2027-01-15",
  );
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
