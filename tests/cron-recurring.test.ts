/**
 * DP-051 cron tests
 * Run with: npx tsx tests/cron-recurring.test.ts
 *
 * Covers the pure halves of the cron:
 *   - planPendingWork (frequency math, inactive filtering, due-date gate,
 *     payload shape, idempotency-friendly advance target)
 *   - isAuthorizedCronRequest (header parsing, missing secret, wrong
 *     token, constant-time equality)
 *   - utcTodayIso (format sanity check)
 *
 * The Supabase round-trips and the `upsert(..., ignoreDuplicates: true)`
 * idempotency guard are exercised end-to-end by a live staging run — the
 * PR description lists the manual verification steps.
 */

import {
  isAuthorizedCronRequest,
  planPendingWork,
  utcTodayIso,
  type ScheduleForProcessing,
} from "../src/lib/cron/recurring-processor";

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

function sched(overrides: Partial<ScheduleForProcessing> = {}): ScheduleForProcessing {
  return {
    id: "s1",
    user_id: "u1",
    organization_name: "Red Cross",
    amount: 50,
    currency: "USD",
    frequency: "monthly",
    cause_tag: "health",
    custom_tag: null,
    scope: "local",
    next_due_date: "2026-04-15",
    is_active: true,
    ...overrides,
  };
}

// ── planPendingWork ───────────────────────────────────────
console.log("\nplanPendingWork:");

{
  const today = "2026-04-19";
  const work = planPendingWork([sched({ id: "a" })], today);
  eq("due-today schedule produces exactly one unit of work", work.length, 1);
  eq("work carries scheduleId", work[0].scheduleId, "a");
  eq(
    "donation_date matches the schedule's original next_due_date",
    work[0].donation.donation_date,
    "2026-04-15"
  );
  eq(
    "donation inherits status='pending', is_recurring=true, recurring_schedule_id",
    {
      status: work[0].donation.status,
      is_recurring: work[0].donation.is_recurring,
      recurring_schedule_id: work[0].donation.recurring_schedule_id,
    },
    { status: "pending", is_recurring: true, recurring_schedule_id: "a" }
  );
  eq("fromDueDate records the pre-advance date", work[0].fromDueDate, "2026-04-15");
  eq(
    "monthly frequency advances by one calendar month",
    work[0].advanceTo,
    "2026-05-15"
  );
}

{
  // Schedule is due exactly on the boundary (today == next_due_date)
  const today = "2026-04-15";
  const work = planPendingWork([sched({ next_due_date: "2026-04-15" })], today);
  eq("due-today boundary (==) counts as due", work.length, 1);
}

{
  const today = "2026-04-19";
  const work = planPendingWork([sched({ next_due_date: "2026-04-20" })], today);
  eq("schedule due tomorrow is skipped", work.length, 0);
}

{
  const today = "2026-04-19";
  const work = planPendingWork([sched({ is_active: false })], today);
  eq("inactive schedule is skipped even when due", work.length, 0);
}

{
  const today = "2026-04-19";
  const work = planPendingWork(
    [
      sched({ id: "w", frequency: "weekly", next_due_date: "2026-04-12" }),
      sched({ id: "m", frequency: "monthly", next_due_date: "2026-03-19" }),
      sched({ id: "q", frequency: "quarterly", next_due_date: "2026-01-15" }),
      sched({ id: "y", frequency: "annually", next_due_date: "2025-04-19" }),
    ],
    today
  );
  eq("advances all frequencies: weekly +7d", work[0].advanceTo, "2026-04-19");
  eq("monthly +1mo", work[1].advanceTo, "2026-04-19");
  eq("quarterly +3mo", work[2].advanceTo, "2026-04-15");
  eq("annually +1yr", work[3].advanceTo, "2026-04-19");
}

{
  // Multiple schedules — inactive and not-yet-due get filtered in one pass
  const today = "2026-04-19";
  const work = planPendingWork(
    [
      sched({ id: "due" }),
      sched({ id: "paused", is_active: false }),
      sched({ id: "future", next_due_date: "2026-05-01" }),
      sched({ id: "also-due", user_id: "u2", next_due_date: "2026-04-10" }),
    ],
    today
  );
  eq(
    "filters correctly across a heterogeneous batch",
    work.map((w) => w.scheduleId),
    ["due", "also-due"]
  );
}

// ── isAuthorizedCronRequest ───────────────────────────────
console.log("\nisAuthorizedCronRequest:");

assert(
  "missing CRON_SECRET rejects every request (config safety)",
  isAuthorizedCronRequest("Bearer anything", undefined) === false
);
assert(
  "empty CRON_SECRET rejects every request",
  isAuthorizedCronRequest("Bearer ", "") === false
);
assert(
  "missing header is rejected",
  isAuthorizedCronRequest(null, "secret") === false
);
assert(
  "header without 'Bearer ' prefix is rejected",
  isAuthorizedCronRequest("secret", "secret") === false
);
assert(
  "wrong token rejected",
  isAuthorizedCronRequest("Bearer wrong", "secret") === false
);
assert(
  "correct token accepted",
  isAuthorizedCronRequest("Bearer secret", "secret") === true
);
assert(
  "different-length tokens rejected (constant-time fast path)",
  isAuthorizedCronRequest("Bearer short", "much-longer-secret") === false
);

// ── utcTodayIso ───────────────────────────────────────────
console.log("\nutcTodayIso:");

{
  const today = utcTodayIso();
  assert(
    "returns YYYY-MM-DD",
    /^\d{4}-\d{2}-\d{2}$/.test(today),
    `got ${today}`
  );
}

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
