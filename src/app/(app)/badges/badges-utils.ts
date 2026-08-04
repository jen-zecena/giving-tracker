/**
 * Pure helpers shared by the Milestones page (server) and the
 * BadgesBoard client component. Extracted from badges-board.tsx so the
 * server page can compute the hero ("closest to unlocking") without
 * importing from a "use client" module.
 */

import type { Badge, BadgeCategory } from "@/lib/queries/badges";

export type TabValue = "earned" | "in-progress" | "all";
export type CategoryFilter = "all" | BadgeCategory;

/** In progress = not earned, has a target, and progress > 0. */
export function isInProgress(badge: Badge): boolean {
  if (badge.earned) return false;
  if (badge.target === undefined) return false;
  return (badge.progress ?? 0) > 0;
}

export function filterBadges(
  badges: Badge[],
  tab: TabValue,
  category: CategoryFilter
): Badge[] {
  return badges.filter((b) => {
    if (category !== "all" && b.category !== category) return false;
    if (tab === "earned") return b.earned;
    if (tab === "in-progress") return isInProgress(b);
    return true;
  });
}

export function formatProgress(n: number, badgeId: string): string {
  // Salary-percentage badges (*-percent-club) express progress as a %.
  if (badgeId.endsWith("-percent-club")) {
    return `${n.toFixed(1)}%`;
  }
  return n.toLocaleString("en-US");
}

export function formatEarnedDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
