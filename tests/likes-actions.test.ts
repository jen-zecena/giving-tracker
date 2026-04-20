/**
 * Unit tests for the likes action helpers (DP-042).
 * Run with: npx tsx tests/likes-actions.test.ts
 *
 * DB-touching concerns (RLS round-trips, toggle semantics, notification
 * emission) are left to the live Supabase environment; this file pins
 * only the pure pieces — input validation and actor-name fallback.
 */

import {
  buildLikeRow,
  type LikeInput,
} from "../src/lib/notifications/builders";
import {
  resolveActorName,
  validateDonationId,
} from "../src/lib/actions/likes-helpers";

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

console.log("validateDonationId");
{
  assert("accepts a non-empty string", validateDonationId("abc-123") === null);
  assert("rejects empty string", typeof validateDonationId("") === "string");
  assert("rejects undefined", typeof validateDonationId(undefined) === "string");
  assert("rejects null", typeof validateDonationId(null) === "string");
  assert("rejects number", typeof validateDonationId(42) === "string");
  assert("rejects object", typeof validateDonationId({}) === "string");
}

console.log("\nresolveActorName");
{
  assert(
    "uses display_name when set",
    resolveActorName("Evan Chapman", "evan@example.com") === "Evan Chapman"
  );
  assert(
    "trims display_name",
    resolveActorName("  Evan  ", "evan@example.com") === "Evan"
  );
  assert(
    "falls back to email local-part when display_name is null",
    resolveActorName(null, "evan.chapman2@example.com") === "evan.chapman2"
  );
  assert(
    "falls back to email local-part when display_name is empty/whitespace",
    resolveActorName("   ", "jen@example.com") === "jen"
  );
  assert(
    "falls back to 'Someone' when neither is set",
    resolveActorName(null, null) === "Someone"
  );
  assert(
    "falls back to 'Someone' when both are empty",
    resolveActorName("", "") === "Someone"
  );
}

console.log("\nbuildLikeRow — payload the action emits");
{
  const input: LikeInput = {
    recipientUserId: "owner-1",
    actorUserId: "actor-2",
    actorName: "Evan",
    donationId: "don-42",
    organizationName: "Red Cross",
  };
  const row = buildLikeRow(input);

  assert("targets the donation owner", row.user_id === "owner-1");
  assert("row type is 'like'", row.type === "like");
  assert(
    "message names actor and org",
    row.message === "Evan liked your donation to Red Cross"
  );
  assert(
    "metadata carries actor + donation + org",
    row.metadata.actor_id === "actor-2" &&
      row.metadata.donation_id === "don-42" &&
      row.metadata.organization_name === "Red Cross"
  );
  assert(
    "action_url routes to /donations",
    row.action_url === "/donations"
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
