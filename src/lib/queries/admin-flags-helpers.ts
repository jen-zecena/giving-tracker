/**
 * Pure helpers for the admin review-queue page (DP-062). Lives in its
 * own file so the bucketing rules can be unit-tested without loading
 * the server-only Supabase client used by the queue fetcher.
 */

import type { NonprofitFlag, NonprofitFlagStatus } from "@/types";

/**
 * A flag enriched with the joined nonprofit + reporter information the
 * admin queue needs to render a card. Kept narrow on purpose — the
 * page only consumes a handful of nonprofit columns and the reporter's
 * display name.
 */
export type ReviewQueueFlag = NonprofitFlag & {
  nonprofit: {
    id: string;
    name: string;
    ein: string;
    location: string | null;
    verified: boolean;
  } | null;
  reporter_display_name: string | null;
};

export type ReviewQueueBuckets = {
  pending: ReviewQueueFlag[];
  /** Tab combines `reviewed` + `resolved` per the Figma design. */
  reviewed: ReviewQueueFlag[];
  dismissed: ReviewQueueFlag[];
};

/**
 * Splits a flat list of flags into the three tabs the page renders.
 * The "Reviewed" tab combines both `reviewed` and `resolved` statuses
 * because in the Figma design they're surfaced together as a single
 * "decision was made" bucket; the resolved/dismissed *stat cards* still
 * count them separately.
 */
export function splitFlagsByTab(flags: ReviewQueueFlag[]): ReviewQueueBuckets {
  const buckets: ReviewQueueBuckets = {
    pending: [],
    reviewed: [],
    dismissed: [],
  };

  for (const flag of flags) {
    switch (flag.status) {
      case "pending":
        buckets.pending.push(flag);
        break;
      case "reviewed":
      case "resolved":
        buckets.reviewed.push(flag);
        break;
      case "dismissed":
        buckets.dismissed.push(flag);
        break;
    }
  }

  return buckets;
}

export type ReviewQueueStats = {
  pending: number;
  resolved: number;
  dismissed: number;
  total: number;
};

/**
 * Counts each status independently for the four stat cards. `resolved`
 * here is *only* the `resolved` status — flags marked `reviewed` are
 * intentionally excluded so the headline number matches the moderator's
 * mental model of "we took action on N reports."
 */
export function countFlagStats(flags: ReviewQueueFlag[]): ReviewQueueStats {
  const stats: ReviewQueueStats = {
    pending: 0,
    resolved: 0,
    dismissed: 0,
    total: flags.length,
  };

  for (const flag of flags) {
    const status: NonprofitFlagStatus = flag.status;
    if (status === "pending") stats.pending += 1;
    else if (status === "resolved") stats.resolved += 1;
    else if (status === "dismissed") stats.dismissed += 1;
  }

  return stats;
}
