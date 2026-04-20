/**
 * Unit tests for public-profile visibility helpers (DP-045).
 * Run with: npx tsx tests/public-profile.test.ts
 *
 * Covers the pure branches that decide:
 *   1. whether the viewer can see a profile at all
 *   2. whether monetary amounts are rendered
 *   3. which button state the follow control should show
 *
 * Server round-trips (service-role lookup, RLS-gated donation select)
 * are left to the live Supabase environment; this file pins the rules
 * that drive the UI branching.
 */

import {
  getPublicFollowButtonState,
  resolvePublicProfileVisibility,
  resolveShowAmounts,
} from "../src/lib/queries/public-profile-helpers";

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

console.log("resolvePublicProfileVisibility");
{
  assert(
    "open_giver is always visible (non-follower)",
    resolvePublicProfileVisibility({ tier: "open_giver", isFollowing: false }) ===
      "visible"
  );
  assert(
    "open_giver is always visible (follower)",
    resolvePublicProfileVisibility({ tier: "open_giver", isFollowing: true }) ===
      "visible"
  );
  assert(
    "friends_only is visible to followers",
    resolvePublicProfileVisibility({
      tier: "friends_only",
      isFollowing: true,
    }) === "visible"
  );
  assert(
    "friends_only is hidden from non-followers",
    resolvePublicProfileVisibility({
      tier: "friends_only",
      isFollowing: false,
    }) === "hidden"
  );
  assert(
    "private is hidden to followers",
    resolvePublicProfileVisibility({ tier: "private", isFollowing: true }) ===
      "hidden"
  );
  assert(
    "private is hidden to non-followers",
    resolvePublicProfileVisibility({ tier: "private", isFollowing: false }) ===
      "hidden"
  );
}

console.log("\nresolveShowAmounts");
{
  assert(
    "open_giver always shows amounts",
    resolveShowAmounts({
      tier: "open_giver",
      isFollowing: false,
      showAmountsToFriends: false,
    }) === true
  );
  assert(
    "friends_only + following + opt-in → show",
    resolveShowAmounts({
      tier: "friends_only",
      isFollowing: true,
      showAmountsToFriends: true,
    }) === true
  );
  assert(
    "friends_only + following + no opt-in → hide",
    resolveShowAmounts({
      tier: "friends_only",
      isFollowing: true,
      showAmountsToFriends: false,
    }) === false
  );
  assert(
    "friends_only + not following + opt-in → hide (shouldn't reach here in practice)",
    resolveShowAmounts({
      tier: "friends_only",
      isFollowing: false,
      showAmountsToFriends: true,
    }) === false
  );
  assert(
    "private → hide regardless",
    resolveShowAmounts({
      tier: "private",
      isFollowing: false,
      showAmountsToFriends: true,
    }) === false
  );
}

console.log("\ngetPublicFollowButtonState");
{
  assert(
    "already following → 'following'",
    getPublicFollowButtonState({
      tier: "open_giver",
      isFollowing: true,
      hasPendingRequest: false,
    }) === "following"
  );
  assert(
    "pending request wins over tier → 'pending'",
    getPublicFollowButtonState({
      tier: "friends_only",
      isFollowing: false,
      hasPendingRequest: true,
    }) === "pending"
  );
  assert(
    "open_giver → 'follow'",
    getPublicFollowButtonState({
      tier: "open_giver",
      isFollowing: false,
      hasPendingRequest: false,
    }) === "follow"
  );
  assert(
    "friends_only → 'request'",
    getPublicFollowButtonState({
      tier: "friends_only",
      isFollowing: false,
      hasPendingRequest: false,
    }) === "request"
  );
  assert(
    "private → 'private'",
    getPublicFollowButtonState({
      tier: "private",
      isFollowing: false,
      hasPendingRequest: false,
    }) === "private"
  );
  assert(
    "following a private profile (edge case) → 'following'",
    getPublicFollowButtonState({
      tier: "private",
      isFollowing: true,
      hasPendingRequest: false,
    }) === "following"
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
