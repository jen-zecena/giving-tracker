/**
 * Follows server-action tests.
 * Run with: npx tsx tests/follows-actions.test.ts
 *
 * Covers the pure pieces of src/lib/actions/follows.ts: input validation
 * and the privacy-tier → branch mapping. Supabase writes and RLS
 * behavior require a live environment and are exercised manually
 * (same pattern as profile-actions.test.ts, donations.test.ts).
 */
import {
  branchFollowByTier,
  validateFollowInput,
} from "../src/lib/actions/follows-validation";

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

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

console.log("\nvalidateFollowInput:");
assert(
  "null current user → signed-in error",
  validateFollowInput(null, USER_B) === "You must be signed in."
);
assert(
  "undefined current user → signed-in error",
  validateFollowInput(undefined, USER_B) === "You must be signed in."
);
assert(
  "empty string current user → signed-in error",
  validateFollowInput("", USER_B) === "You must be signed in."
);
assert(
  "missing target → missing-target error",
  validateFollowInput(USER_A, null) === "Missing target user id."
);
assert(
  "empty target → missing-target error",
  validateFollowInput(USER_A, "") === "Missing target user id."
);
assert(
  "self-follow → self-follow error",
  validateFollowInput(USER_A, USER_A) === "You can't follow yourself."
);
assert(
  "valid pair → null (no error)",
  validateFollowInput(USER_A, USER_B) === null
);

console.log("\nbranchFollowByTier:");
assert("open_giver → follow", branchFollowByTier("open_giver") === "follow");
assert(
  "friends_only → request",
  branchFollowByTier("friends_only") === "request"
);
assert("private → blocked", branchFollowByTier("private") === "blocked");

// Exhaustiveness guard — if PrivacyTier ever adds a new variant,
// the switch in branchFollowByTier would stop compiling. This test
// asserts every current variant is mapped, so a regression surfaces
// both at compile time and at test time.
const tiers = ["private", "friends_only", "open_giver"] as const;
for (const t of tiers) {
  const branch = branchFollowByTier(t);
  assert(
    `every tier maps to a known branch (${t} → ${branch})`,
    branch === "follow" || branch === "request" || branch === "blocked"
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
