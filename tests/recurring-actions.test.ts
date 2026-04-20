/**
 * Recurring-schedule server-action tests.
 * Run with: npx tsx tests/recurring-actions.test.ts
 *
 * Covers the pure pieces of the DP-050 slice:
 *   - zod create/update schemas (happy path + the validation invariants)
 *   - `advanceDueDate` helper (weekly / monthly / quarterly / annual)
 *
 * Supabase inserts, RLS enforcement, and the full CRUD round-trip need
 * a live environment — same pattern as the other action tests.
 */
import { advanceDueDate } from "../src/lib/recurring-helpers";
import {
  parseCreateRecurring,
  parseUpdateRecurring,
} from "../src/lib/actions/recurring-validation";

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

// ── advanceDueDate ─────────────────────────────────────────
console.log("\nadvanceDueDate:");
assert(
  "weekly advances by 7 days",
  advanceDueDate("2026-04-19", "weekly") === "2026-04-26"
);
assert(
  "monthly advances by 1 month",
  advanceDueDate("2026-04-19", "monthly") === "2026-05-19"
);
assert(
  "monthly wraps at year end",
  advanceDueDate("2026-12-15", "monthly") === "2027-01-15"
);
assert(
  "quarterly advances by 3 months",
  advanceDueDate("2026-04-19", "quarterly") === "2026-07-19"
);
assert(
  "annually advances by 1 year",
  advanceDueDate("2026-04-19", "annually") === "2027-04-19"
);
assert(
  "annually handles leap-day rollover (Feb 29 -> Feb 28/Mar 1)",
  advanceDueDate("2028-02-29", "annually") === "2029-03-01" ||
    advanceDueDate("2028-02-29", "annually") === "2029-02-28"
);

// ── parseCreateRecurring: happy path ───────────────────────
console.log("\nparseCreateRecurring (happy path):");
{
  const full = parseCreateRecurring({
    organization_name: "  Red Cross  ",
    amount: 25,
    frequency: "monthly",
    cause_tag: "health",
    custom_tag: "",
    scope: "national",
    next_due_date: "2026-05-01",
  });
  assert("accepts a full valid input", full.ok === true);
  if (full.ok) {
    assert(
      "trims organization_name",
      full.data.organization_name === "Red Cross"
    );
    assert(
      "empty custom_tag normalizes to null",
      full.data.custom_tag === null
    );
  }
}
{
  const minimal = parseCreateRecurring({
    organization_name: "Food Bank",
    amount: 10,
    frequency: "weekly",
    scope: "local",
    next_due_date: "2026-04-26",
  });
  assert("accepts minimal input (cause_tag / custom_tag omitted)", minimal.ok === true);
  if (minimal.ok) {
    assert("omitted cause_tag becomes null", minimal.data.cause_tag === null);
    assert("omitted custom_tag becomes null", minimal.data.custom_tag === null);
  }
}

// ── parseCreateRecurring: rejection paths ──────────────────
console.log("\nparseCreateRecurring (rejections):");
{
  const r = parseCreateRecurring({
    organization_name: "   ",
    amount: 10,
    frequency: "monthly",
    scope: "local",
    next_due_date: "2026-05-01",
  });
  assert(
    "rejects whitespace-only org name",
    r.ok === false && r.error.includes("Organization name")
  );
}
{
  const r = parseCreateRecurring({
    organization_name: "Valid",
    amount: 0,
    frequency: "monthly",
    scope: "local",
    next_due_date: "2026-05-01",
  });
  assert(
    "rejects zero amount",
    r.ok === false && r.error.includes("greater than zero")
  );
}
{
  const r = parseCreateRecurring({
    organization_name: "Valid",
    amount: -5,
    frequency: "monthly",
    scope: "local",
    next_due_date: "2026-05-01",
  });
  assert(
    "rejects negative amount",
    r.ok === false && r.error.includes("greater than zero")
  );
}
{
  const r = parseCreateRecurring({
    organization_name: "Valid",
    amount: 10,
    frequency: "biennial",
    scope: "local",
    next_due_date: "2026-05-01",
  });
  assert(
    "rejects invalid frequency",
    r.ok === false
  );
}
{
  const r = parseCreateRecurring({
    organization_name: "Valid",
    amount: 10,
    frequency: "monthly",
    scope: "local",
    next_due_date: "2026/05/01",
  });
  assert(
    "rejects non-ISO date format",
    r.ok === false && r.error.includes("YYYY-MM-DD")
  );
}
{
  const r = parseCreateRecurring({
    organization_name: "Valid",
    amount: 10,
    frequency: "monthly",
    scope: "local",
    next_due_date: "2026-02-30",
  });
  assert(
    "rejects nonexistent calendar date",
    r.ok === false
  );
}

// ── parseUpdateRecurring ───────────────────────────────────
console.log("\nparseUpdateRecurring:");
{
  const r = parseUpdateRecurring({});
  assert(
    "rejects empty update (nothing to change)",
    r.ok === false && r.error.includes("No fields")
  );
}
{
  const r = parseUpdateRecurring({ amount: 50 });
  assert("accepts single-field update", r.ok === true);
  if (r.ok) {
    assert("single-field update carries the value", r.data.amount === 50);
  }
}
{
  const r = parseUpdateRecurring({ cause_tag: null });
  assert(
    "explicit null clears cause_tag",
    r.ok === true
  );
  if (r.ok) {
    assert("null cause_tag preserved through update schema", r.data.cause_tag === null);
  }
}
{
  const r = parseUpdateRecurring({ amount: Number.POSITIVE_INFINITY });
  assert(
    "rejects non-finite amount on update",
    r.ok === false
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
