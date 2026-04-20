/**
 * Discover-page helper tests.
 * Run with: npx tsx tests/discover-helpers.test.ts
 *
 * Covers the pure pieces of src/lib/actions/discover-helpers.ts:
 *  - button-state mapping (the Follow / Request / Pending / Unfollow contract)
 *  - search filter (case-insensitive includes on display_name + bio)
 *
 * The page's data-loading + action wiring needs a live Supabase and is
 * not exercised here (same pattern as the other action tests).
 */
import {
  filterDiscoverUsers,
  getFollowButtonState,
} from "../src/lib/actions/discover-helpers";

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

// ── getFollowButtonState ───────────────────────────────────
console.log("\ngetFollowButtonState:");

// Not following, no pending → branches on tier
assert(
  "open_giver, not following, no pending → follow",
  getFollowButtonState("open_giver", false, false) === "follow"
);
assert(
  "friends_only, not following, no pending → request",
  getFollowButtonState("friends_only", false, false) === "request"
);

// Already following beats everything else
assert(
  "open_giver, following → following (Unfollow shown)",
  getFollowButtonState("open_giver", true, false) === "following"
);
assert(
  "friends_only, following → following",
  getFollowButtonState("friends_only", true, false) === "following"
);
assert(
  "following flag wins even if pending is also true (inconsistent state defaults to following)",
  getFollowButtonState("open_giver", true, true) === "following"
);

// Pending beats tier-based follow/request but loses to following
assert(
  "open_giver, not following, pending → pending",
  getFollowButtonState("open_giver", false, true) === "pending"
);
assert(
  "friends_only, not following, pending → pending",
  getFollowButtonState("friends_only", false, true) === "pending"
);

// ── filterDiscoverUsers ────────────────────────────────────
console.log("\nfilterDiscoverUsers:");

const users = [
  { display_name: "Alex Rivera", bio: "Monthly giver to education" },
  { display_name: "Jordan Lee", bio: null },
  { display_name: null, bio: "Supports mental health causes" },
  { display_name: "Sam Chen", bio: "EDUCATION advocate" },
];

assert(
  "empty query returns all users",
  filterDiscoverUsers(users, "").length === 4
);
assert(
  "whitespace-only query returns all users",
  filterDiscoverUsers(users, "   ").length === 4
);
assert(
  "exact name match (case-insensitive)",
  filterDiscoverUsers(users, "ALEX").length === 1 &&
    filterDiscoverUsers(users, "ALEX")[0].display_name === "Alex Rivera"
);
assert(
  "partial name match",
  filterDiscoverUsers(users, "Jor").length === 1 &&
    filterDiscoverUsers(users, "Jor")[0].display_name === "Jordan Lee"
);
assert(
  "matches on bio even when name is null",
  filterDiscoverUsers(users, "mental").length === 1 &&
    filterDiscoverUsers(users, "mental")[0].display_name === null
);
assert(
  "case-insensitive bio match returns multiple",
  filterDiscoverUsers(users, "education").length === 2
);
assert(
  "no match returns empty",
  filterDiscoverUsers(users, "xyz-nothing").length === 0
);
assert(
  "safe when both display_name and bio are null",
  filterDiscoverUsers(
    [{ display_name: null, bio: null }],
    "anything"
  ).length === 0
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
