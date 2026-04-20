/**
 * Unit tests for the Badges page filter logic (DP-033).
 * Run with: npx tsx tests/badges-board.test.ts
 *
 * Covers the tab (Earned / In Progress / All) + category pill filter
 * that drives the BadgesBoard client component.
 */

import {
  filterBadges,
  isInProgress,
} from "../src/app/(app)/badges/badges-board";
import type { Badge } from "../src/lib/queries/badges";

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

function mk(partial: Partial<Badge> & Pick<Badge, "id" | "category">): Badge {
  return {
    name: partial.id,
    description: "",
    icon: "⭐",
    earned: false,
    ...partial,
  };
}

const FIXTURES: Badge[] = [
  // Earned milestone
  mk({
    id: "first-donation",
    category: "milestone",
    earned: true,
    earnedDate: "2026-01-10",
  }),
  // Earned consistency
  mk({ id: "monthly-giver", category: "consistency", earned: true, progress: 3, target: 3 }),
  // In-progress milestone (count-based)
  mk({ id: "10-donations", category: "milestone", progress: 4, target: 10 }),
  // In-progress cause
  mk({ id: "education-champion", category: "cause", progress: 2, target: 5 }),
  // Locked impact (progress 0)
  mk({ id: "local-hero", category: "impact", progress: 0, target: 10 }),
  // Locked milestone (no target — salary not set)
  mk({ id: "1-percent-club", category: "milestone", progress: 0, target: undefined }),
];

console.log("isInProgress");
assert(
  "earned badge is not in-progress",
  !isInProgress(FIXTURES[0]),
  "first-donation (earned)"
);
assert(
  "progress > 0 && !earned is in-progress",
  isInProgress(FIXTURES[2]),
  "10-donations (4/10)"
);
assert(
  "progress == 0 is locked, not in-progress",
  !isInProgress(FIXTURES[4]),
  "local-hero (0/10)"
);
assert(
  "no target is locked, not in-progress",
  !isInProgress(FIXTURES[5]),
  "1-percent-club (no salary)"
);

console.log("\nfilterBadges — tab");
{
  const earned = filterBadges(FIXTURES, "earned", "all");
  assert(
    "earned tab returns only earned badges",
    earned.length === 2 && earned.every((b) => b.earned),
    `got ${earned.length}: ${earned.map((b) => b.id).join(", ")}`
  );

  const inProgress = filterBadges(FIXTURES, "in-progress", "all");
  assert(
    "in-progress tab returns only badges with progress > 0 and not earned",
    inProgress.length === 2 &&
      inProgress.every((b) => !b.earned && (b.progress ?? 0) > 0),
    `got ${inProgress.length}: ${inProgress.map((b) => b.id).join(", ")}`
  );

  const all = filterBadges(FIXTURES, "all", "all");
  assert(
    "all tab returns every badge",
    all.length === FIXTURES.length,
    `got ${all.length}`
  );
}

console.log("\nfilterBadges — category");
{
  const milestones = filterBadges(FIXTURES, "all", "milestone");
  assert(
    "milestone filter narrows to milestones only",
    milestones.length === 3 &&
      milestones.every((b) => b.category === "milestone"),
    milestones.map((b) => b.id).join(", ")
  );

  const causes = filterBadges(FIXTURES, "all", "cause");
  assert(
    "cause filter narrows to cause badges only",
    causes.length === 1 && causes[0].category === "cause",
    causes.map((b) => b.id).join(", ")
  );
}

console.log("\nfilterBadges — tab + category combined");
{
  const earnedMilestones = filterBadges(FIXTURES, "earned", "milestone");
  assert(
    "earned + milestone returns earned milestones only",
    earnedMilestones.length === 1 && earnedMilestones[0].id === "first-donation",
    earnedMilestones.map((b) => b.id).join(", ")
  );

  const inProgressImpact = filterBadges(FIXTURES, "in-progress", "impact");
  assert(
    "in-progress + impact excludes locked impact badges",
    inProgressImpact.length === 0,
    `expected 0, got ${inProgressImpact.length}`
  );

  const inProgressConsistency = filterBadges(FIXTURES, "in-progress", "consistency");
  assert(
    "in-progress + consistency excludes earned badges",
    inProgressConsistency.length === 0,
    "monthly-giver is earned, so nothing in-progress"
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
