import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  buildBadgeRow,
  buildFollowRequestRow,
  buildFollowRow,
  buildLikeRow,
  buildMilestoneRow,
  buildPendingDonationRow,
  type BadgeInput,
  type FollowInput,
  type LikeInput,
  type MilestoneInput,
  type NotificationRow,
  type PendingDonationInput,
} from "@/lib/notifications/builders";

export type EmitResult = {
  /** Row id when the insert succeeded. */
  notification_id?: string;
  /**
   * Whether the recipient has opted into email notifications
   * (`profiles.email_notifications`). The in-app row is always inserted
   * regardless of this value — future email-delivery code should gate
   * on this flag.
   */
  email_opted_in: boolean;
  error?: string;
};

export type {
  NotificationRow,
  FollowInput,
  LikeInput,
  BadgeInput,
  MilestoneInput,
  PendingDonationInput,
};

/**
 * Inserts `row` via the service-role client and looks up the recipient's
 * email-opt-in flag. The in-app row is always created regardless of the
 * flag — only email delivery is gated by `email_notifications`.
 */
async function emit(row: NotificationRow): Promise<EmitResult> {
  if (!row.user_id) {
    return { email_opted_in: false, error: "Missing recipient user_id." };
  }

  const supabase = createServiceRoleClient();

  const [insertRes, profileRes] = await Promise.all([
    supabase.from("notifications").insert(row).select("id").single(),
    supabase
      .from("profiles")
      .select("email_notifications")
      .eq("id", row.user_id)
      .maybeSingle(),
  ]);

  const email_opted_in = Boolean(
    profileRes.data?.email_notifications ?? true
  );

  if (insertRes.error || !insertRes.data) {
    return {
      email_opted_in,
      error: insertRes.error?.message ?? "Failed to insert notification row.",
    };
  }

  return {
    notification_id: (insertRes.data as { id: string }).id,
    email_opted_in,
  };
}

// ── Public emit helpers ────────────────────────────────────────────────

export async function notifyFollow(input: FollowInput): Promise<EmitResult> {
  if (input.recipientUserId === input.actorUserId) {
    return { email_opted_in: false, error: "Cannot notify self." };
  }
  return emit(buildFollowRow(input));
}

export async function notifyFollowRequest(
  input: FollowInput
): Promise<EmitResult> {
  if (input.recipientUserId === input.actorUserId) {
    return { email_opted_in: false, error: "Cannot notify self." };
  }
  return emit(buildFollowRequestRow(input));
}

export async function notifyLike(input: LikeInput): Promise<EmitResult> {
  if (input.recipientUserId === input.actorUserId) {
    // Self-likes are silently dropped — no notification needed.
    return { email_opted_in: false };
  }
  return emit(buildLikeRow(input));
}

export async function notifyBadgeEarned(
  input: BadgeInput
): Promise<EmitResult> {
  return emit(buildBadgeRow(input));
}

export async function notifyMilestone(
  input: MilestoneInput
): Promise<EmitResult> {
  return emit(buildMilestoneRow(input));
}

export async function notifyPendingDonation(
  input: PendingDonationInput
): Promise<EmitResult> {
  return emit(buildPendingDonationRow(input));
}
