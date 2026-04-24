/**
 * Pure-logic side of the daily pending-donation digest cron (DP-055).
 *
 * The route handler in `/api/cron/digest` owns the Supabase round-trips
 * and the actual Resend send; this module owns the decision of *who*
 * gets an email today and *what* lines go in their digest. Keeping the
 * planning step pure means the acceptance-critical behavior (group by
 * user, opt-out filtering, no-email-when-empty) is unit-testable
 * without a live DB or live SMTP.
 */

import type { PendingDigestItem } from "@/emails/pending-digest";

/**
 * Minimal view of a pending donation joined to its owner. The handler
 * builds these by querying `donations` (status='pending') and joining
 * the owner's profile + auth email. Pulled into its own type so tests
 * can construct fixtures without dragging in the full schema.
 */
export type PendingRowForDigest = {
  user_id: string;
  /** From `auth.users.email` — may be null for service-only accounts. */
  email: string | null;
  /** From `profiles.display_name` — null is fine, template falls back. */
  display_name: string | null;
  /** From `profiles.email_notifications`. Treat null/undefined as opted in. */
  email_notifications: boolean | null;
  /** Stable id for the digest row; the cron uses the schedule id when present. */
  schedule_id: string | null;
  donation_id: string;
  organization_name: string;
  amount: number;
  /** ISO date — `donation_date` from the pending row. */
  due_date: string;
};

/**
 * One outbound digest. The handler turns this into a `sendPendingDigestEmail`
 * call. `skipReason` is set instead when we explicitly drop a user from the
 * send list — surfaced in the response payload so log diffing can confirm
 * "opted out" / "no email on file" cases without re-querying.
 */
export type DigestPlan = {
  userId: string;
  email: string | null;
  displayName: string | null;
  items: PendingDigestItem[];
  skipReason?: "opted_out" | "no_email";
};

/**
 * Group the flat join result into one digest per user. Users with
 * `email_notifications === false` and users with no email on file are
 * surfaced as skipped entries (handler logs them; nothing is sent).
 *
 * Rows for the same user are assumed to share `email`, `display_name`,
 * and `email_notifications` — we keep the first non-null value seen so
 * a NULL on a single join row doesn't hide an opt-out elsewhere.
 */
export function planDigests(
  rows: ReadonlyArray<PendingRowForDigest>
): DigestPlan[] {
  const byUser = new Map<string, DigestPlan>();

  for (const r of rows) {
    let plan = byUser.get(r.user_id);
    if (!plan) {
      plan = {
        userId: r.user_id,
        email: r.email,
        displayName: r.display_name,
        items: [],
      };
      byUser.set(r.user_id, plan);
    } else {
      // Fill in missing fields from later rows; never overwrite a value
      // we already saw. Important for opt-out: if any join row reports
      // `false`, that wins over a later `true`/null.
      if (plan.email === null && r.email !== null) plan.email = r.email;
      if (plan.displayName === null && r.display_name !== null) {
        plan.displayName = r.display_name;
      }
    }

    plan.items.push({
      // Prefer the schedule id so the email link matches the in-app
      // "pending" surface (which is keyed off the schedule). Falls back
      // to the donation id for one-off pendings, if those ever exist.
      scheduleId: r.schedule_id ?? r.donation_id,
      organizationName: r.organization_name,
      amount: r.amount,
      dueDate: r.due_date,
    });
  }

  // Second pass: stamp the opt-out / no-email reason. We do this after
  // grouping so a user with five pending rows and one NULL email field
  // is still classified correctly.
  const optOut = new Set<string>();
  for (const r of rows) {
    if (r.email_notifications === false) optOut.add(r.user_id);
  }

  const plans: DigestPlan[] = [];
  for (const plan of byUser.values()) {
    if (optOut.has(plan.userId)) {
      plan.skipReason = "opted_out";
    } else if (!plan.email) {
      plan.skipReason = "no_email";
    }
    plans.push(plan);
  }

  // Stable ordering: by userId so logs and tests are deterministic.
  plans.sort((a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
  return plans;
}
