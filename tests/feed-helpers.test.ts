/**
 * Feed-page helper tests.
 * Run with: npx tsx tests/feed-helpers.test.ts
 *
 * Covers the two pure helpers in src/lib/actions/feed-helpers.ts:
 *   - shouldShowAmount (the tier × follow × flag visibility rule)
 *   - resolveEmptyStateKind (no-follows vs. no-activity branching)
 *
 * Query wiring, RLS enforcement, and like-button interactions are
 * exercised manually against a live Supabase (same pattern as the
 * other action tests).
 */
import {
  ownVisibility,
  resolveEmptyStateKind,
  shouldShowAmount,
} from "../src/lib/actions/feed-helpers";

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

// ── shouldShowAmount ───────────────────────────────────────
console.log("\nshouldShowAmount:");

// Private donor → always false (defensive — RLS should have already hidden
// the donation, but the helper must never leak an amount for a private
// profile).
assert(
  "private donor: flag=false, not following → false",
  shouldShowAmount("private", false, false) === false
);
assert(
  "private donor: flag=true, following → false (stays hidden)",
  shouldShowAmount("private", true, true) === false
);

// Open-giver donor → always visible.
assert(
  "open_giver: flag=false, not following → true",
  shouldShowAmount("open_giver", false, false) === true
);
assert(
  "open_giver: flag=false, following → true",
  shouldShowAmount("open_giver", false, true) === true
);
assert(
  "open_giver: flag=true, following → true",
  shouldShowAmount("open_giver", true, true) === true
);

// Friends-only donor: needs both follow AND flag.
assert(
  "friends_only: not following, flag=false → false",
  shouldShowAmount("friends_only", false, false) === false
);
assert(
  "friends_only: not following, flag=true → false (flag alone isn't enough)",
  shouldShowAmount("friends_only", true, false) === false
);
assert(
  "friends_only: following, flag=false → false (follow alone isn't enough)",
  shouldShowAmount("friends_only", false, true) === false
);
assert(
  "friends_only: following, flag=true → true (both required)",
  shouldShowAmount("friends_only", true, true) === true
);

// ── resolveEmptyStateKind ──────────────────────────────────
console.log("\nresolveEmptyStateKind:");
assert(
  "0 follows → no-follows",
  resolveEmptyStateKind(0) === "no-follows"
);
assert(
  "1 follow → no-activity",
  resolveEmptyStateKind(1) === "no-activity"
);
assert(
  "many follows → no-activity",
  resolveEmptyStateKind(42) === "no-activity"
);

// ── ownVisibility ──────────────────────────────────────────
console.log("\nownVisibility:");
assert(
  "hide_from_feed always wins → only_you",
  ownVisibility("open_giver", true, false) === "only_you"
);
assert(
  "per-gift private override → only_you",
  ownVisibility("open_giver", false, true) === "only_you"
);
assert(
  "private tier → only_you",
  ownVisibility("private", false, false) === "only_you"
);
assert(
  "friends_only tier → friends",
  ownVisibility("friends_only", false, false) === "friends"
);
assert(
  "open_giver tier → everyone",
  ownVisibility("open_giver", false, false) === "everyone"
);
assert(
  "friends_only + hidden → only_you",
  ownVisibility("friends_only", true, false) === "only_you"
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
