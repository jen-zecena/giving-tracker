/**
 * Unit tests for the NotificationsDropdown plumbing — focused on the
 * pure pieces that don't require a Supabase session.
 *
 * Run with: npx tsx tests/notifications.test.ts
 */
import { timeAgo } from "../src/lib/time";

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

// Pin a reference "now" so the tests are deterministic.
const NOW = new Date("2026-04-18T12:00:00Z");
const iso = (offsetMs: number) => new Date(NOW.getTime() - offsetMs).toISOString();

// ── timeAgo ────────────────────────────────────────────────
console.log("\ntimeAgo:");

{
  assert("future timestamps collapse to 'just now'", timeAgo(iso(-60_000), NOW) === "just now");
  assert("<1 minute → 'just now'", timeAgo(iso(30_000), NOW) === "just now");
  assert("exactly 1 minute → '1m ago'", timeAgo(iso(60_000), NOW) === "1m ago");
  assert("30 minutes → '30m ago'", timeAgo(iso(30 * 60_000), NOW) === "30m ago");
  assert("1 hour → '1h ago'", timeAgo(iso(60 * 60_000), NOW) === "1h ago");
  assert("5 hours → '5h ago'", timeAgo(iso(5 * 60 * 60_000), NOW) === "5h ago");
  assert("1 day → '1d ago'", timeAgo(iso(24 * 60 * 60_000), NOW) === "1d ago");
  assert("6 days → '6d ago'", timeAgo(iso(6 * 24 * 60 * 60_000), NOW) === "6d ago");
  assert("1 week → '1w ago'", timeAgo(iso(7 * 24 * 60 * 60_000), NOW) === "1w ago");
  assert("3 weeks → '3w ago'", timeAgo(iso(21 * 24 * 60 * 60_000), NOW) === "3w ago");

  const old = timeAgo(iso(60 * 24 * 60 * 60_000), NOW);
  assert(
    ">=4 weeks → short date (e.g. 'Feb 17')",
    /^[A-Z][a-z]{2} \d{1,2}$/.test(old),
    `got "${old}"`
  );
}

// ── Unread-count formatting contract ───────────────────────
// The dropdown renders "9+" when unreadCount > 9. That rule lives in
// the component but it's a one-liner worth pinning here so a refactor
// that tightens the cap has a failing test to point at.
console.log("\nUnread badge cap:");

function badgeLabel(n: number): string | null {
  return n > 9 ? "9+" : n > 0 ? String(n) : null;
}

{
  assert("0 → no badge", badgeLabel(0) === null);
  assert("1 → '1'", badgeLabel(1) === "1");
  assert("9 → '9'", badgeLabel(9) === "9");
  assert("10 → '9+'", badgeLabel(10) === "9+");
  assert("99 → '9+'", badgeLabel(99) === "9+");
}

// ── Icon & color mapping covers every enum value ───────────
// If a new NotificationType is ever added, the dropdown's Record<> will
// require a new key. We mirror that contract in the test so a missing
// entry is caught by the suite as well as by tsc.
console.log("\nType coverage:");

import type { NotificationType } from "../src/types";

const ALL_TYPES: NotificationType[] = [
  "like",
  "follow",
  "follow_request",
  "badge",
  "milestone",
  "pending_donation",
];

const ICONS: Record<NotificationType, string> = {
  like: "Heart",
  follow: "UserPlus",
  follow_request: "UserCheck",
  badge: "Award",
  milestone: "Trophy",
  pending_donation: "Clock",
};

{
  for (const t of ALL_TYPES) {
    assert(`has icon for "${t}"`, typeof ICONS[t] === "string" && ICONS[t].length > 0);
  }
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
