/**
 * DP-055 — Vercel Cron entry point for the daily pending-donation
 * digest email. Scheduled at 07:30 UTC (see `vercel.json`), thirty
 * minutes after the DP-051 generator at 07:00 UTC so today's freshly
 * created pending rows are included.
 *
 * Responsibilities:
 *   1. Authenticate the request against `CRON_SECRET` (same token as
 *      DP-051; reuses `isAuthorizedCronRequest`).
 *   2. Read every `donations` row with `status = 'pending'`, joined to
 *      its owner's profile, using the service-role client. Cron has no
 *      user session, so RLS bypass is intentional.
 *   3. Look up `auth.users.email` per unique owner via the admin API.
 *   4. Plan one digest per user via `planDigests`, then send each via
 *      the DP-054 Resend wrapper. Opt-outs and missing-email users are
 *      skipped without sending.
 *   5. Return a JSON summary for cron logs.
 *
 * The pure planning logic lives in `lib/cron/digest-processor` so this
 * file stays a thin Supabase/HTTP/email adapter.
 */

import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isAuthorizedCronRequest,
  utcTodayIso,
} from "@/lib/cron/recurring-processor";
import {
  planDigests,
  type PendingRowForDigest,
} from "@/lib/cron/digest-processor";
import { sendPendingDigestEmail } from "@/lib/email";

// Service-role + Resend → Node runtime.
export const runtime = "nodejs";
// Mutating + side-effecting → never cache.
export const dynamic = "force-dynamic";

type PlanOutcome = {
  userId: string;
  itemCount: number;
  status: "sent" | "skipped" | "failed";
  reason?: "test_mode" | "opted_out" | "no_email";
  emailId?: string;
  error?: string;
};

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!isAuthorizedCronRequest(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const today = utcTodayIso();
  const supabase = createServiceRoleClient();

  // Step 1 — fetch pending donations + the owner's profile flags in one
  // round-trip. PostgREST resolves `profiles(...)` via the implicit FK
  // from `donations.user_id → auth.users.id → profiles.id`.
  const { data: pendings, error: readError } = await supabase
    .from("donations")
    .select(
      "id, user_id, organization_name, amount, donation_date, recurring_schedule_id, profiles!inner(display_name, email_notifications)"
    )
    .eq("status", "pending");

  if (readError) {
    console.error("[cron/digest] read failed", readError);
    return NextResponse.json(
      { error: "Failed to read pending donations", details: readError.message },
      { status: 500 }
    );
  }

  if (!pendings || pendings.length === 0) {
    console.log(`[cron/digest] ${today} no pending donations`);
    return NextResponse.json({
      today,
      scanned: 0,
      planned: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      outcomes: [] as PlanOutcome[],
      durationMs: Date.now() - startedAt,
    });
  }

  // Step 2 — resolve auth.users.email for each unique owner. The list
  // is the same per-user regardless of how many pendings they have, so
  // we de-dupe first to keep the admin-API call count down.
  const uniqueUserIds = Array.from(new Set(pendings.map((p) => p.user_id)));
  const emailByUserId = new Map<string, string | null>();
  for (const userId of uniqueUserIds) {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.warn(
        `[cron/digest] auth lookup failed user=${userId}`,
        error.message
      );
      emailByUserId.set(userId, null);
      continue;
    }
    emailByUserId.set(userId, data.user?.email ?? null);
  }

  // Shape the joined rows for the pure planner. PostgREST returns the
  // joined `profiles` as either an object or array depending on the FK
  // shape; we normalise both forms.
  const rows: PendingRowForDigest[] = pendings.map((p) => {
    const profileRaw = (p as { profiles: unknown }).profiles;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    const displayName =
      (profile as { display_name?: string | null } | null)?.display_name ??
      null;
    const emailNotifications =
      (profile as { email_notifications?: boolean | null } | null)
        ?.email_notifications ?? null;
    return {
      user_id: p.user_id,
      email: emailByUserId.get(p.user_id) ?? null,
      display_name: displayName,
      email_notifications: emailNotifications,
      schedule_id: p.recurring_schedule_id ?? null,
      donation_id: p.id,
      organization_name: p.organization_name,
      amount: Number(p.amount),
      due_date: p.donation_date,
    };
  });

  const plans = planDigests(rows);

  // Step 3 — send. Serial rather than parallel so the Resend rate limit
  // (10 req/s on the free tier) isn't a problem and logs are ordered.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const outcomes: PlanOutcome[] = [];

  for (const plan of plans) {
    if (plan.skipReason) {
      outcomes.push({
        userId: plan.userId,
        itemCount: plan.items.length,
        status: "skipped",
        reason: plan.skipReason,
      });
      continue;
    }
    if (!plan.email) {
      // Defensive — planDigests should have stamped no_email already.
      outcomes.push({
        userId: plan.userId,
        itemCount: plan.items.length,
        status: "skipped",
        reason: "no_email",
      });
      continue;
    }

    try {
      const result = await sendPendingDigestEmail({
        to: plan.email,
        displayName: plan.displayName,
        items: plan.items,
        siteUrl,
      });

      if ("sent" in result && result.sent) {
        outcomes.push({
          userId: plan.userId,
          itemCount: plan.items.length,
          status: "sent",
          emailId: result.id,
        });
      } else if ("skipped" in result && result.skipped) {
        outcomes.push({
          userId: plan.userId,
          itemCount: plan.items.length,
          status: "skipped",
          reason: result.reason,
        });
      } else {
        outcomes.push({
          userId: plan.userId,
          itemCount: plan.items.length,
          status: "failed",
          error: "error" in result ? result.error : "Unknown error",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[cron/digest] send threw user=${plan.userId}`,
        message
      );
      outcomes.push({
        userId: plan.userId,
        itemCount: plan.items.length,
        status: "failed",
        error: message,
      });
    }
  }

  const sentCount = outcomes.filter((o) => o.status === "sent").length;
  const skippedCount = outcomes.filter((o) => o.status === "skipped").length;
  const failedCount = outcomes.filter((o) => o.status === "failed").length;

  console.log(
    `[cron/digest] ${today} scanned=${pendings.length} planned=${plans.length} sent=${sentCount} skipped=${skippedCount} failed=${failedCount} durationMs=${Date.now() - startedAt}`
  );

  return NextResponse.json({
    today,
    scanned: pendings.length,
    planned: plans.length,
    sent: sentCount,
    skipped: skippedCount,
    failed: failedCount,
    outcomes,
    durationMs: Date.now() - startedAt,
  });
}
