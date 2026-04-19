import type { NotificationType } from "@/types";

/**
 * Pure row builders for the `notifications` table. Extracted from the
 * emit helpers so they can be unit-tested without loading the
 * service-role Supabase client (which is server-only).
 */
export type NotificationRow = {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  metadata: Record<string, unknown>;
};

export type FollowInput = {
  recipientUserId: string;
  actorUserId: string;
  actorName: string;
};

export type LikeInput = {
  recipientUserId: string;
  actorUserId: string;
  actorName: string;
  donationId: string;
  organizationName: string;
};

export type BadgeInput = {
  userId: string;
  badgeSlug: string;
  badgeName: string;
};

export type MilestoneInput = {
  userId: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

export type PendingDonationInput = {
  userId: string;
  organizationName: string;
  scheduleId: string;
  dueDate: string; // ISO date
};

export function buildFollowRow(input: FollowInput): NotificationRow {
  return {
    user_id: input.recipientUserId,
    type: "follow",
    title: "New follower",
    message: `${input.actorName} started following you`,
    action_url: `/profile/${input.actorUserId}`,
    metadata: { actor_id: input.actorUserId },
  };
}

export function buildFollowRequestRow(input: FollowInput): NotificationRow {
  return {
    user_id: input.recipientUserId,
    type: "follow_request",
    title: "New follow request",
    message: `${input.actorName} wants to follow you`,
    action_url: `/profile/${input.actorUserId}`,
    metadata: { actor_id: input.actorUserId },
  };
}

export function buildLikeRow(input: LikeInput): NotificationRow {
  return {
    user_id: input.recipientUserId,
    type: "like",
    title: "Someone liked your donation",
    message: `${input.actorName} liked your donation to ${input.organizationName}`,
    action_url: `/donations`,
    metadata: {
      actor_id: input.actorUserId,
      donation_id: input.donationId,
      organization_name: input.organizationName,
    },
  };
}

export function buildBadgeRow(input: BadgeInput): NotificationRow {
  return {
    user_id: input.userId,
    type: "badge",
    title: "New badge earned!",
    message: `You earned the "${input.badgeName}" badge`,
    action_url: `/badges`,
    metadata: { badge_slug: input.badgeSlug, badge_name: input.badgeName },
  };
}

export function buildMilestoneRow(input: MilestoneInput): NotificationRow {
  return {
    user_id: input.userId,
    type: "milestone",
    title: input.title,
    message: input.message,
    action_url: input.actionUrl ?? null,
    metadata: input.metadata ?? {},
  };
}

export function buildPendingDonationRow(
  input: PendingDonationInput
): NotificationRow {
  return {
    user_id: input.userId,
    type: "pending_donation",
    title: "Confirm your recurring donation",
    message: `Your scheduled donation to ${input.organizationName} is due ${formatDue(input.dueDate)}`,
    action_url: `/donations?status=pending`,
    metadata: {
      schedule_id: input.scheduleId,
      organization_name: input.organizationName,
      due_date: input.dueDate,
    },
  };
}

function formatDue(iso: string): string {
  // Accepts "YYYY-MM-DD" or full ISO — defensively anchor to midnight.
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return "soon";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
