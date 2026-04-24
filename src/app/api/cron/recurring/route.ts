/**
 * DP-051 — Vercel Cron entry point for the daily pending-donation
 * generator. Scheduled at 07:00 UTC (see `vercel.json`).
 *
 * Responsibilities:
 *   1. Authenticate the request against `CRON_SECRET`.
 *   2. Read active `recurring_schedules` whose `next_due_date` is
 *      today-or-earlier using the service-role client (cron doesn't run
 *      in any user session, so we bypass RLS intentionally).
 *   3. For each schedule, insert a pending donation and advance the
 *      schedule's `next_due_date` forward one period. The insert is
 *      idempotent via the `uniq_donations_schedule_date` unique index
 *      added in migration 006, and the advance step is guarded by
 *      matching on the original `next_due_date` so a concurrent run
 *      can't double-advance.
 *   4. Return a JSON summary with per-schedule outcomes for logs and
 *      retry diagnosis.
 *
 * The heavy-lifting pure logic lives in `lib/cron/recurring-processor`
 * so this file stays a thin Supabase/HTTP adapter.
 */

import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildPendingDonationNotifyInput,
  isAuthorizedCronRequest,
  planPendingWork,
  utcTodayIso,
  type ScheduleForProcessing,
} from "@/lib/cron/recurring-processor";
import { notifyPendingDonation } from "@/lib/notifications";

// Run on the Node runtime — we use the service-role Supabase client,
// which pulls in `@supabase/supabase-js`.
export const runtime = "nodejs";
// Never cache: this is a mutating route invoked on a schedule.
export const dynamic = "force-dynamic";

type ScheduleOutcome = {
  scheduleId: string;
  userId: string;
  dueDate: string;
  inserted: boolean;
  advanced: boolean;
  advanceTo: string;
  notified: boolean;
  insertError?: string;
  advanceError?: string;
  notifyError?: string;
};

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!isAuthorizedCronRequest(authHeader, process.env.CRON_SECRET)) {
    // Don't reveal which half of the check failed — uniform 401.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const today = utcTodayIso();
  const supabase = createServiceRoleClient();

  // Step 1 — fetch schedules due today-or-earlier
  const { data: schedules, error: readError } = await supabase
    .from("recurring_schedules")
    .select(
      "id, user_id, organization_name, amount, currency, frequency, cause_tag, custom_tag, scope, next_due_date, is_active"
    )
    .eq("is_active", true)
    .lte("next_due_date", today);

  if (readError) {
    console.error("[cron/recurring] read failed", readError);
    return NextResponse.json(
      { error: "Failed to read schedules", details: readError.message },
      { status: 500 }
    );
  }

  const work = planPendingWork(
    (schedules ?? []) as ScheduleForProcessing[],
    today
  );

  if (work.length === 0) {
    console.log(
      `[cron/recurring] ${today} no schedules due; scanned=${schedules?.length ?? 0}`
    );
    return NextResponse.json({
      today,
      scanned: schedules?.length ?? 0,
      processed: 0,
      outcomes: [] as ScheduleOutcome[],
      durationMs: Date.now() - startedAt,
    });
  }

  const outcomes: ScheduleOutcome[] = [];

  // Step 2 — per-schedule: insert pending donation, then advance.
  // Serial rather than parallel so we get deterministic logs and don't
  // hammer the DB; the volume is expected to be low (tens, not tens of
  // thousands) for the freemium tier.
  for (const w of work) {
    const outcome: ScheduleOutcome = {
      scheduleId: w.scheduleId,
      userId: w.userId,
      dueDate: w.fromDueDate,
      inserted: false,
      advanced: false,
      advanceTo: w.advanceTo,
      notified: false,
    };

    // Insert pending donation. `upsert` with ignoreDuplicates uses the
    // unique index as an idempotency key — a retry on the same UTC day
    // returns zero rows rather than a 23505 error.
    const { data: inserted, error: insertError } = await supabase
      .from("donations")
      .upsert(w.donation, {
        onConflict: "recurring_schedule_id,donation_date",
        ignoreDuplicates: true,
      })
      .select("id");

    if (insertError) {
      outcome.insertError = insertError.message;
      console.error(
        `[cron/recurring] insert failed schedule=${w.scheduleId} date=${w.fromDueDate}`,
        insertError
      );
      outcomes.push(outcome);
      continue; // don't advance next_due_date if insert failed
    }
    outcome.inserted = (inserted?.length ?? 0) > 0;

    // Advance next_due_date — guarded so we don't move the cursor if
    // another run already advanced it. The `select("id")` returns zero
    // rows when the guard fails, which we treat as "already advanced by
    // someone else" and not an error.
    const { data: advancedRows, error: advanceError } = await supabase
      .from("recurring_schedules")
      .update({ next_due_date: w.advanceTo })
      .eq("id", w.scheduleId)
      .eq("next_due_date", w.fromDueDate)
      .select("id");

    if (advanceError) {
      outcome.advanceError = advanceError.message;
      console.error(
        `[cron/recurring] advance failed schedule=${w.scheduleId}`,
        advanceError
      );
    } else {
      outcome.advanced = (advancedRows?.length ?? 0) > 0;
    }

    // DP-056: notify the recipient only when a new pending row was just
    // inserted. On idempotent retries (`inserted === false`) we skip so
    // the bell dropdown doesn't collect duplicates for the same due date.
    if (outcome.inserted) {
      const notifyResult = await notifyPendingDonation(
        buildPendingDonationNotifyInput(w)
      );
      if (notifyResult.error) {
        outcome.notifyError = notifyResult.error;
        console.error(
          `[cron/recurring] notify failed schedule=${w.scheduleId}`,
          notifyResult.error
        );
      } else {
        outcome.notified = true;
      }
    }

    outcomes.push(outcome);
  }

  const insertedCount = outcomes.filter((o) => o.inserted).length;
  const skippedCount = outcomes.length - insertedCount;
  const notifiedCount = outcomes.filter((o) => o.notified).length;
  console.log(
    `[cron/recurring] ${today} processed=${outcomes.length} inserted=${insertedCount} skipped=${skippedCount} notified=${notifiedCount} durationMs=${Date.now() - startedAt}`
  );

  return NextResponse.json({
    today,
    scanned: schedules?.length ?? 0,
    processed: outcomes.length,
    inserted: insertedCount,
    skipped: skippedCount,
    notified: notifiedCount,
    outcomes,
    durationMs: Date.now() - startedAt,
  });
}
