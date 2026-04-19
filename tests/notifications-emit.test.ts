/**
 * Row-shape tests for the notification emit helpers.
 *
 * The actual Supabase insert needs a service-role key + running DB, so
 * we exercise the pure `build*Row` functions that produce the shape
 * sent to Supabase. That's enough to pin the contract other sprints
 * will call.
 *
 * Run with: npx tsx tests/notifications-emit.test.ts
 */
import {
  buildBadgeRow,
  buildFollowRequestRow,
  buildFollowRow,
  buildLikeRow,
  buildMilestoneRow,
  buildPendingDonationRow,
} from "../src/lib/notifications/builders";

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

const RECIPIENT = "11111111-1111-1111-1111-111111111111";
const ACTOR = "22222222-2222-2222-2222-222222222222";

// ── follow ─────────────────────────────────────────────────
console.log("\nbuildFollowRow:");
{
  const row = buildFollowRow({
    recipientUserId: RECIPIENT,
    actorUserId: ACTOR,
    actorName: "Alex Rivera",
  });
  assert("recipient = user_id", row.user_id === RECIPIENT);
  assert("type = 'follow'", row.type === "follow");
  assert("has non-empty title", row.title.length > 0);
  assert("message names the actor", row.message.includes("Alex Rivera"));
  assert(
    "action_url points at actor profile",
    row.action_url === `/profile/${ACTOR}`
  );
  assert(
    "metadata captures actor id",
    (row.metadata.actor_id as string) === ACTOR
  );
}

// ── follow_request ─────────────────────────────────────────
console.log("\nbuildFollowRequestRow:");
{
  const row = buildFollowRequestRow({
    recipientUserId: RECIPIENT,
    actorUserId: ACTOR,
    actorName: "Jordan Lee",
  });
  assert("type = 'follow_request'", row.type === "follow_request");
  assert("names the actor", row.message.includes("Jordan Lee"));
  assert(
    "action_url points at actor profile",
    row.action_url === `/profile/${ACTOR}`
  );
}

// ── like ───────────────────────────────────────────────────
console.log("\nbuildLikeRow:");
{
  const row = buildLikeRow({
    recipientUserId: RECIPIENT,
    actorUserId: ACTOR,
    actorName: "Sam Chen",
    donationId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    organizationName: "Red Cross",
  });
  assert("type = 'like'", row.type === "like");
  assert("mentions actor + org", row.message.includes("Sam Chen") && row.message.includes("Red Cross"));
  assert("action_url routes to donations", row.action_url === "/donations");
  assert(
    "metadata captures donation_id",
    row.metadata.donation_id === "dddddddd-dddd-dddd-dddd-dddddddddddd"
  );
  assert(
    "metadata captures organization_name",
    row.metadata.organization_name === "Red Cross"
  );
}

// ── badge ──────────────────────────────────────────────────
console.log("\nbuildBadgeRow:");
{
  const row = buildBadgeRow({
    userId: RECIPIENT,
    badgeSlug: "generous-giver",
    badgeName: "Generous Giver",
  });
  assert("type = 'badge'", row.type === "badge");
  assert("user_id is the earner", row.user_id === RECIPIENT);
  assert(
    "message mentions badge name in quotes",
    row.message.includes('"Generous Giver"')
  );
  assert("action_url routes to /badges", row.action_url === "/badges");
  assert(
    "metadata captures slug",
    row.metadata.badge_slug === "generous-giver"
  );
}

// ── milestone ──────────────────────────────────────────────
console.log("\nbuildMilestoneRow:");
{
  const row = buildMilestoneRow({
    userId: RECIPIENT,
    title: "100 donations logged",
    message: "You just hit 100 donations — thanks for tracking!",
  });
  assert("type = 'milestone'", row.type === "milestone");
  assert("title passthrough", row.title === "100 donations logged");
  assert("message passthrough", row.message.startsWith("You just hit 100"));
  assert(
    "action_url defaults to null when unset",
    row.action_url === null
  );
  assert("metadata defaults to {}", Object.keys(row.metadata).length === 0);
}
{
  const row = buildMilestoneRow({
    userId: RECIPIENT,
    title: "Goal reached",
    message: "You hit your monthly goal.",
    actionUrl: "/goals",
    metadata: { goal_id: "g1" },
  });
  assert("optional actionUrl passes through", row.action_url === "/goals");
  assert("optional metadata passes through", row.metadata.goal_id === "g1");
}

// ── pending_donation ───────────────────────────────────────
console.log("\nbuildPendingDonationRow:");
{
  const row = buildPendingDonationRow({
    userId: RECIPIENT,
    organizationName: "UNICEF",
    scheduleId: "ssssssss-ssss-ssss-ssss-ssssssssssss",
    dueDate: "2026-05-01",
  });
  assert("type = 'pending_donation'", row.type === "pending_donation");
  assert("mentions organization", row.message.includes("UNICEF"));
  assert(
    "action_url filters donation list to pending",
    row.action_url === "/donations?status=pending"
  );
  assert(
    "metadata captures schedule_id",
    row.metadata.schedule_id === "ssssssss-ssss-ssss-ssss-ssssssssssss"
  );
  assert(
    "metadata captures due_date",
    row.metadata.due_date === "2026-05-01"
  );
  // Renders a human date in the message, not the raw ISO.
  assert(
    "message formats a human date (not raw ISO)",
    !row.message.includes("2026-05-01"),
    `got "${row.message}"`
  );
}
{
  // Defensive: bad input should degrade, not throw.
  const row = buildPendingDonationRow({
    userId: RECIPIENT,
    organizationName: "UNICEF",
    scheduleId: "s1",
    dueDate: "not-a-date",
  });
  assert(
    "invalid dueDate degrades to 'soon'",
    row.message.includes("soon")
  );
}

// ── Every row fills every required column ─────────────────
console.log("\nRow-shape contract:");
const rows = [
  buildFollowRow({ recipientUserId: RECIPIENT, actorUserId: ACTOR, actorName: "x" }),
  buildFollowRequestRow({ recipientUserId: RECIPIENT, actorUserId: ACTOR, actorName: "x" }),
  buildLikeRow({ recipientUserId: RECIPIENT, actorUserId: ACTOR, actorName: "x", donationId: "d", organizationName: "o" }),
  buildBadgeRow({ userId: RECIPIENT, badgeSlug: "s", badgeName: "n" }),
  buildMilestoneRow({ userId: RECIPIENT, title: "t", message: "m" }),
  buildPendingDonationRow({ userId: RECIPIENT, organizationName: "o", scheduleId: "s", dueDate: "2026-01-01" }),
];

for (const row of rows) {
  assert(`[${row.type}] user_id non-empty`, row.user_id.length > 0);
  assert(`[${row.type}] title non-empty`, row.title.length > 0);
  assert(`[${row.type}] message non-empty`, row.message.length > 0);
  assert(
    `[${row.type}] metadata is a plain object`,
    typeof row.metadata === "object" && row.metadata !== null && !Array.isArray(row.metadata)
  );
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
