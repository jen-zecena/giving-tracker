"use client";

import { useEffect } from "react";

import {
  celebrateBadge,
  loadSeenBadges,
  markBadgesSeen,
  newlyEarnedBadgeIds,
} from "@/lib/celebrations";

interface BadgeCelebrationProps {
  earnedBadgeIds: string[];
}

/**
 * Fires `celebrateBadge()` once on mount if any `earnedBadgeIds` haven't
 * been seen before (per `localStorage`). Renders nothing. Lives as a
 * separate client component so /badges (a server component) stays
 * server-rendered.
 *
 * Scope note: the "newly earned since last visit" signal is stored in
 * localStorage, so it's device-scoped. Acceptable per DP-036 — the
 * alternative (tracking `first_seen_at` server-side) is out of scope.
 */
export function BadgeCelebration({ earnedBadgeIds }: BadgeCelebrationProps) {
  useEffect(() => {
    const seen = loadSeenBadges();
    const newIds = newlyEarnedBadgeIds(earnedBadgeIds, seen);
    if (newIds.length > 0) {
      celebrateBadge();
      markBadgesSeen(earnedBadgeIds);
    } else if (earnedBadgeIds.length > 0 && seen.size === 0) {
      // First visit after already having earned badges — mark them seen
      // without celebrating so we don't spam confetti the first time.
      markBadgesSeen(earnedBadgeIds);
    }
  }, [earnedBadgeIds]);

  return null;
}
