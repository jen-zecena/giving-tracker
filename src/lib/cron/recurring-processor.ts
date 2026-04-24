/**
 * Pure-logic side of the recurring-donation cron (DP-051).
 *
 * The route handler in `/api/cron/recurring` owns the Supabase round-
 * trips; this module owns the decision of *what* to insert and *what*
 * date to advance each schedule to. Keeping it pure means the
 * acceptance-critical behavior (idempotency, frequency math, skipping
 * already-processed schedules) is unit-testable without a live DB.
 */

import { advanceDueDate } from "@/lib/recurring-helpers";
import type { PendingDonationInput } from "@/lib/notifications/builders";
import type { RecurringFrequency } from "@/types";

/**
 * Minimal view of a recurring schedule the processor needs. Pulled
 * separately from `RecurringSchedule` so the tests can construct these
 * without dragging in the full type graph.
 */
export type ScheduleForProcessing = {
  id: string;
  user_id: string;
  organization_name: string;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  cause_tag: string | null;
  custom_tag: string | null;
  scope: string;
  next_due_date: string; // YYYY-MM-DD
  is_active: boolean;
};

/**
 * A single unit of work for the cron to perform. The handler inserts a
 * pending donation using `donation` and then runs a conditional update
 * to `advanceTo` on the matching schedule — guarded by the original
 * `fromDueDate` so a concurrent run can't advance twice.
 */
export type PendingWork = {
  scheduleId: string;
  userId: string;
  donation: {
    user_id: string;
    organization_name: string;
    amount: number;
    currency: string;
    donation_date: string; // same as the schedule's next_due_date at read time
    scope: string;
    cause_tag: string | null;
    custom_tag: string | null;
    is_recurring: true;
    recurring_schedule_id: string;
    status: "pending";
  };
  fromDueDate: string;
  advanceTo: string;
};

/**
 * Turns a batch of schedules into the concrete insert+advance work the
 * cron should perform today. Filters out inactive schedules and any
 * whose `next_due_date` is still in the future — defensive, since the
 * caller already filters at the query level.
 *
 * The `todayIso` arg is passed in rather than read from `Date.now()` so
 * the function is deterministic and tests can pin a date without
 * mocking globals.
 */
export function planPendingWork(
  schedules: ReadonlyArray<ScheduleForProcessing>,
  todayIso: string
): PendingWork[] {
  const work: PendingWork[] = [];
  for (const s of schedules) {
    if (!s.is_active) continue;
    if (s.next_due_date > todayIso) continue;
    const advanced = advanceDueDate(s.next_due_date, s.frequency);
    work.push({
      scheduleId: s.id,
      userId: s.user_id,
      donation: {
        user_id: s.user_id,
        organization_name: s.organization_name,
        amount: s.amount,
        currency: s.currency,
        donation_date: s.next_due_date,
        scope: s.scope,
        cause_tag: s.cause_tag,
        custom_tag: s.custom_tag,
        is_recurring: true,
        recurring_schedule_id: s.id,
        status: "pending",
      },
      fromDueDate: s.next_due_date,
      advanceTo: advanced,
    });
  }
  return work;
}

/**
 * Guard that checks if the authorization header on an inbound cron
 * request matches the CRON_SECRET. Vercel's cron infra sends
 * `Authorization: Bearer <CRON_SECRET>` when the env var is configured
 * on the project. Returns true for a match, false otherwise — never
 * throws so the caller can decide on the exact response shape.
 *
 * A missing or empty `expected` is treated as a config error and
 * rejects every request. This prevents an accidentally-unconfigured
 * preview from exposing the endpoint.
 */
export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  expected: string | undefined
): boolean {
  if (!expected || expected.length === 0) return false;
  if (!authorizationHeader) return false;
  const prefix = "Bearer ";
  if (!authorizationHeader.startsWith(prefix)) return false;
  const token = authorizationHeader.slice(prefix.length);
  return constantTimeEqual(token, expected);
}

/**
 * Length-aware, branch-free compare so a mis-spelled CRON_SECRET can't
 * be distinguished from a wrong-length one by response timing. Still
 * fast enough for per-request use.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

/**
 * Returns today's date in UTC as YYYY-MM-DD. Used by the route handler
 * so the "is due" comparison doesn't drift by the server's local
 * timezone — the cron itself runs at 07:00 UTC per `vercel.json`.
 */
export function utcTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * DP-056 — maps a unit of pending work to the input the
 * `notifyPendingDonation` helper expects. Kept here (not in the route)
 * so the PendingWork → notification contract is unit-testable.
 */
export function buildPendingDonationNotifyInput(
  work: PendingWork
): PendingDonationInput {
  return {
    userId: work.userId,
    organizationName: work.donation.organization_name,
    scheduleId: work.scheduleId,
    dueDate: work.fromDueDate,
  };
}
