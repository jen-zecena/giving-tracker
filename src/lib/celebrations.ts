/**
 * Celebration animations — `canvas-confetti` bursts tied to specific
 * moments in the giving journey (first donation, new badge, goal complete,
 * count milestones).
 *
 * Ported from the Figma Make `lib/celebrations.ts` (`celebrateBadge`,
 * `celebrateGoal`). The first-donation and milestone variants don't exist
 * in the Figma source — the issue (DP-036) asks for confetti on those
 * events too, so we add subtle bursts for them here.
 *
 * Every entry point short-circuits under `prefers-reduced-motion` and on
 * the server (no `window`) so this module is safe to import from shared
 * client code.
 */

import confetti from "canvas-confetti";

// ── Reduced motion gate ───────────────────────────────────

/**
 * True when the user has opted into reduced motion, or when the module
 * is evaluated in a non-browser environment. Each celebration helper
 * calls this and bails early so none of them ever animate against the
 * user's OS preference.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Shared palette — matches the Figma theme (primary / chart-2 / success /
// warning / destructive / info / chart-pink / chart-lime).
const PRIMARY_COLORS = ["#5B5BDB", "#8B5CF6", "#10B981", "#F59E0B"];
const SECONDARY_COLORS = ["#F59E0B", "#EC4899", "#06B6D4"];

// ── celebrateFirstDonation ────────────────────────────────

/**
 * A single mid-screen burst — marks the user's very first logged
 * donation. Kept short so it doesn't stall the redirect to the
 * dashboard after submission.
 */
export function celebrateFirstDonation(): void {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 40,
    ticks: 80,
    origin: { x: 0.5, y: 0.4 },
    colors: [...PRIMARY_COLORS, ...SECONDARY_COLORS],
    disableForReducedMotion: true,
  });
}

// ── celebrateBadge ────────────────────────────────────────

/**
 * Two-second side-stream burst from the left and right edges. Used when
 * the user lands on /badges and we detect a newly-earned badge since
 * their last visit. Ported 1:1 from the Figma `celebrateBadge`.
 */
export function celebrateBadge(): void {
  if (prefersReducedMotion()) return;

  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: PRIMARY_COLORS,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: PRIMARY_COLORS,
      disableForReducedMotion: true,
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

// ── celebrateGoal ─────────────────────────────────────────

/**
 * Three-second tapering scatter — used the moment a Goal transitions to
 * complete. Random bursts on both halves of the viewport with two color
 * palettes. Ported 1:1 from Figma `celebrateGoal`, modernised to use
 * `window.setInterval` + typed handle so it plays nicely in the browser.
 */
export function celebrateGoal(): void {
  if (prefersReducedMotion()) return;

  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      window.clearInterval(interval);
      return;
    }
    const particleCount = Math.round(50 * (timeLeft / duration));
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#5B5BDB", "#8B5CF6", "#10B981"],
      disableForReducedMotion: true,
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: SECONDARY_COLORS,
      disableForReducedMotion: true,
    });
  }, 250);
}

// ── celebrateMilestone ────────────────────────────────────

/**
 * A single center burst for count-based milestones (10 / 25 / 50 / 100
 * donations). Smaller than `celebrateFirstDonation` so repeated
 * milestone hits don't feel identical — per the issue, these are meant
 * to be noticeable but not overwhelming.
 *
 * NOTE: the Figma source makes this a no-op. DP-036 explicitly asks for
 * confetti on milestones, so we diverge intentionally.
 */
export function celebrateMilestone(): void {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 35,
    ticks: 60,
    origin: { x: 0.5, y: 0.5 },
    colors: PRIMARY_COLORS,
    disableForReducedMotion: true,
  });
}

// ── Milestone detection ───────────────────────────────────

export const DONATION_MILESTONES: ReadonlyArray<number> = [10, 25, 50, 100];

/**
 * Returns the celebration class to run after a donation is logged, based
 * on the user's total confirmed donation count. Kept as a pure function
 * so the caller in new-donation-form can decide which helper to invoke
 * (and so it's trivially unit-testable).
 */
export function donationCelebrationKind(
  totalDonations: number
): "first" | "milestone" | null {
  if (totalDonations === 1) return "first";
  if (DONATION_MILESTONES.includes(totalDonations)) return "milestone";
  return null;
}

// ── Newly-complete goal detection ─────────────────────────

export type GoalCompletionInput = { id: string; current: number; target: number };

/**
 * Given the previous and current snapshots of a user's goals, returns
 * the ids of goals that have just transitioned from not-complete to
 * complete. Used by the Goals page to fire `celebrateGoal` exactly once
 * per transition.
 *
 * A goal counts as complete when `target > 0 && current >= target`.
 * Pure so we can test the edge cases (unchanged, new-and-complete,
 * already-complete, target moved).
 */
export function newlyCompletedGoalIds(
  previous: ReadonlyArray<GoalCompletionInput>,
  current: ReadonlyArray<GoalCompletionInput>
): string[] {
  const prevComplete = new Set(
    previous.filter(isComplete).map((g) => g.id)
  );
  return current
    .filter((g) => isComplete(g) && !prevComplete.has(g.id))
    .map((g) => g.id);
}

function isComplete(goal: GoalCompletionInput): boolean {
  return goal.target > 0 && goal.current >= goal.target;
}

// ── Newly-earned badge detection (localStorage-backed) ────

const BADGE_STORAGE_KEY = "giving-tracker:seen-badges";

/**
 * Returns ids of badges that were not in the user's previously-seen set
 * stored in `localStorage`. Caller is responsible for invoking
 * `markBadgesSeen(ids)` once the celebration has fired — keeps storage
 * writes out of the pure diff so it's testable.
 */
export function newlyEarnedBadgeIds(
  earnedIds: ReadonlyArray<string>,
  seenIds: ReadonlySet<string>
): string[] {
  return earnedIds.filter((id) => !seenIds.has(id));
}

/**
 * Browser-only — reads the seen-badges set out of localStorage. Returns
 * an empty set on the server, on storage errors, or when the user hasn't
 * visited /badges before.
 */
export function loadSeenBadges(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(BADGE_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

/**
 * Writes the combined seen-badges set back to localStorage. Silently
 * ignores storage failures (quota, privacy mode, SSR).
 */
export function markBadgesSeen(ids: ReadonlyArray<string>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadSeenBadges();
    for (const id of ids) existing.add(id);
    window.localStorage.setItem(
      BADGE_STORAGE_KEY,
      JSON.stringify(Array.from(existing))
    );
  } catch {
    // swallow — a failed celebration bookkeeping write isn't worth surfacing
  }
}
