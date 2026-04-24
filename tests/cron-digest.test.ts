/**
 * DP-055 digest cron tests
 * Run with: npx tsx tests/cron-digest.test.ts
 *
 * Covers the pure planner that decides who gets a digest:
 *   - groups multiple pending rows per user into one plan
 *   - opt-out users are surfaced as skipped, not sent
 *   - users with no email on file are surfaced as skipped, not sent
 *   - empty input → empty plans (acceptance: "no email when no pending")
 *   - schedule_id falls back to donation_id for one-off pendings
 *   - opt-out wins even if a later join row has email_notifications=null
 *
 * The Resend send and the Supabase round-trips are exercised end-to-end
 * by a manual staging run (logged in the PR description).
 */

import {
  planDigests,
  type PendingRowForDigest,
} from "../src/lib/cron/digest-processor";

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

function row(overrides: Partial<PendingRowForDigest> = {}): PendingRowForDigest {
  return {
    user_id: "u1",
    email: "alex@example.com",
    display_name: "Alex",
    email_notifications: true,
    schedule_id: "s1",
    donation_id: "d1",
    organization_name: "Red Cross",
    amount: 50,
    due_date: "2026-04-15",
    ...overrides,
  };
}

// ── empty / no-pending ────────────────────────────────────
console.log("\nplanDigests — empty:");

eq(
  "no pending rows → no plans (acceptance: no email when user has no pending)",
  planDigests([]),
  []
);

// ── grouping ──────────────────────────────────────────────
console.log("\nplanDigests — grouping:");

{
  const plans = planDigests([
    row({ donation_id: "d1", organization_name: "Red Cross" }),
    row({ donation_id: "d2", organization_name: "UNICEF", schedule_id: "s2" }),
  ]);
  eq("two pendings for one user → one plan", plans.length, 1);
  eq(
    "plan carries both items in input order",
    plans[0].items.map((i) => i.organizationName),
    ["Red Cross", "UNICEF"]
  );
  eq(
    "scheduleId on item is the schedule id when present",
    plans[0].items.map((i) => i.scheduleId),
    ["s1", "s2"]
  );
  assert("plan has no skipReason when user is opted in", plans[0].skipReason === undefined);
}

{
  const plans = planDigests([
    row({ user_id: "u-b", email: "b@example.com" }),
    row({ user_id: "u-a", email: "a@example.com" }),
  ]);
  eq(
    "plans are returned in stable userId order",
    plans.map((p) => p.userId),
    ["u-a", "u-b"]
  );
}

// ── opt-out ───────────────────────────────────────────────
console.log("\nplanDigests — opt-out:");

{
  const plans = planDigests([
    row({ user_id: "u-opted-out", email_notifications: false }),
  ]);
  eq(
    "opt-out user is surfaced with skipReason=opted_out (acceptance: opt-out users receive nothing)",
    plans[0].skipReason,
    "opted_out"
  );
  eq("opt-out plan still includes items for log auditing", plans[0].items.length, 1);
}

{
  // One join row reports email_notifications=false; another row for the
  // same user is null. The false must win (we never send to a user who
  // ever reported opt-out in the batch).
  const plans = planDigests([
    row({ user_id: "u-mixed", email_notifications: null, donation_id: "d1" }),
    row({ user_id: "u-mixed", email_notifications: false, donation_id: "d2" }),
  ]);
  eq("opt-out wins over null on a sibling row", plans[0].skipReason, "opted_out");
}

// ── no email ──────────────────────────────────────────────
console.log("\nplanDigests — no email on file:");

{
  const plans = planDigests([
    row({ user_id: "u-no-email", email: null }),
  ]);
  eq(
    "user with no email on file is skipped, not sent",
    plans[0].skipReason,
    "no_email"
  );
}

{
  // First row has no email but a second row for the same user does;
  // the planner should fill in the email rather than skip.
  const plans = planDigests([
    row({ user_id: "u-late-email", email: null, donation_id: "d1" }),
    row({ user_id: "u-late-email", email: "late@example.com", donation_id: "d2" }),
  ]);
  assert("email is back-filled from a sibling row", plans[0].email === "late@example.com");
  assert(
    "user with email on a later row is not skipped",
    plans[0].skipReason === undefined
  );
}

// ── schedule_id fallback ──────────────────────────────────
console.log("\nplanDigests — schedule_id fallback:");

{
  const plans = planDigests([
    row({ schedule_id: null, donation_id: "d-orphan" }),
  ]);
  eq(
    "one-off pending (no schedule_id) uses donation_id as the item key",
    plans[0].items[0].scheduleId,
    "d-orphan"
  );
}

// ── multiple users ────────────────────────────────────────
console.log("\nplanDigests — multiple users:");

{
  const plans = planDigests([
    row({ user_id: "alpha", email: "a@example.com" }),
    row({ user_id: "alpha", email: "a@example.com", donation_id: "d2" }),
    row({ user_id: "beta", email: "b@example.com", email_notifications: false }),
    row({ user_id: "gamma", email: null }),
  ]);
  eq("three distinct user plans", plans.length, 3);

  const alpha = plans.find((p) => p.userId === "alpha")!;
  const beta = plans.find((p) => p.userId === "beta")!;
  const gamma = plans.find((p) => p.userId === "gamma")!;

  eq("alpha gets a sendable plan with two items", { skip: alpha.skipReason, count: alpha.items.length }, { skip: undefined, count: 2 });
  eq("beta is opt-out skipped", beta.skipReason, "opted_out");
  eq("gamma is no_email skipped", gamma.skipReason, "no_email");
}

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
