/**
 * Recurring-page display-helper tests.
 * Run with: npx tsx tests/recurring-display.test.ts
 *
 * Covers the pure helpers in src/lib/recurring-display.ts used by the
 * Recurring Donations management page (DP-052):
 *   - frequency → pastel background mapping (exhaustive)
 *   - sortSchedulesForList (active-first, then soonest-due)
 *   - formatCurrency / formatDueDate (output shape)
 */
import {
  formatCurrency,
  formatDueDate,
  frequencyBgClass,
  sortSchedulesForList,
} from "../src/lib/recurring-display";
import type { RecurringSchedule } from "../src/types";

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

function schedule(overrides: Partial<RecurringSchedule>): RecurringSchedule {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    user_id: "00000000-0000-0000-0000-000000000000",
    organization_name: "Test Org",
    amount: 10,
    currency: "USD",
    frequency: "monthly",
    cause_tag: null,
    custom_tag: null,
    scope: "local",
    next_due_date: "2026-05-01",
    is_active: true,
    is_auto_confirm: false,
    consecutive_confirmations: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── frequencyBgClass ───────────────────────────────────────
console.log("\nfrequencyBgClass:");
assert(
  "weekly → yellow",
  frequencyBgClass("weekly") === "bg-metric-yellow"
);
assert(
  "monthly → purple",
  frequencyBgClass("monthly") === "bg-metric-purple"
);
assert(
  "quarterly → blue",
  frequencyBgClass("quarterly") === "bg-metric-blue"
);
assert(
  "annually → green",
  frequencyBgClass("annually") === "bg-metric-green"
);

// ── sortSchedulesForList ───────────────────────────────────
console.log("\nsortSchedulesForList:");
{
  const active1 = schedule({
    id: "a1",
    is_active: true,
    next_due_date: "2026-05-10",
  });
  const active2 = schedule({
    id: "a2",
    is_active: true,
    next_due_date: "2026-05-01",
  });
  const paused1 = schedule({
    id: "p1",
    is_active: false,
    next_due_date: "2026-04-01",
  });
  const paused2 = schedule({
    id: "p2",
    is_active: false,
    next_due_date: "2026-06-01",
  });

  // Shuffle input order to prove sort is deterministic regardless.
  const sorted = sortSchedulesForList([paused1, active1, paused2, active2]);
  assert(
    "active schedules come before paused ones",
    sorted[0].is_active && sorted[1].is_active && !sorted[2].is_active
  );
  assert(
    "within active: soonest-due first",
    sorted[0].id === "a2" && sorted[1].id === "a1"
  );
  assert(
    "within paused: soonest-due first (even though paused)",
    sorted[2].id === "p1" && sorted[3].id === "p2"
  );
}
{
  const input = [schedule({ id: "only" })];
  const sorted = sortSchedulesForList(input);
  assert(
    "does not mutate the input array",
    sorted !== input && input.length === 1
  );
}
{
  const sorted = sortSchedulesForList([]);
  assert("empty input returns empty array", sorted.length === 0);
}

// ── formatCurrency ─────────────────────────────────────────
console.log("\nformatCurrency:");
assert("integer amount", formatCurrency(25) === "$25");
assert(
  "decimal amount keeps the significant digit",
  formatCurrency(25.5) === "$25.5"
);
assert(
  "amount with two decimals renders both",
  formatCurrency(25.75) === "$25.75"
);
assert("zero", formatCurrency(0) === "$0");
assert("thousands separator", formatCurrency(12345) === "$12,345");

// ── formatDueDate ──────────────────────────────────────────
console.log("\nformatDueDate:");
{
  const formatted = formatDueDate("2026-05-01");
  // Locale-dependent but should contain a month name, the day, and
  // the year. This keeps the test stable across CI runners even if
  // Intl tweaks short month formatting.
  assert(
    "includes month + day + year",
    /May/.test(formatted) && /1/.test(formatted) && /2026/.test(formatted)
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
