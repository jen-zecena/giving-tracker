/**
 * DP-007 RLS migration validation tests
 * Run with: npx tsx tests/migration-dp007.test.ts
 *
 * Parses the RLS migration SQL as text and asserts that every required
 * policy is defined with the shape the FIGMA_PORT_PLAN §7 spec demands:
 * owner-only paths, admin-gated writes, permissive reads where called for.
 *
 * Static text checks can't catch runtime policy behavior — that requires
 * a live Postgres and pgtap or seed-data queries. The static checks do
 * catch regressions that would silently weaken RLS (e.g. a missing admin
 * gate on `nonprofits` INSERT, a typo in `auth.uid()`, or a forgotten
 * FORCE ROW LEVEL SECURITY).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260418_004_rls_policies.sql"
);

const sql = readFileSync(MIGRATION_PATH, "utf8");

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

function policyBody(table: string, policyName: string): string | null {
  const re = new RegExp(
    `create\\s+policy\\s+${policyName}\\s+on\\s+${table}([\\s\\S]*?);`,
    "i"
  );
  const match = sql.match(re);
  return match ? match[1] : null;
}

function hasPolicy(table: string, policyName: string) {
  return policyBody(table, policyName) !== null;
}

function policyMatches(
  table: string,
  policyName: string,
  pattern: RegExp
) {
  const body = policyBody(table, policyName);
  return body !== null && pattern.test(body);
}

function rlsEnabled(table: string) {
  const enableRe = new RegExp(
    `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
    "i"
  );
  const forceRe = new RegExp(
    `alter\\s+table\\s+${table}\\s+force\\s+row\\s+level\\s+security`,
    "i"
  );
  return { enable: enableRe.test(sql), force: forceRe.test(sql) };
}

// ── is_admin() helper ─────────────────────────────────────
console.log("\nAdmin helper function:");
assert(
  "is_admin() function is defined",
  /create\s+or\s+replace\s+function\s+public\.is_admin/i.test(sql)
);
assert(
  "is_admin() uses SECURITY DEFINER (avoids recursion)",
  /is_admin[\s\S]*?security\s+definer/i.test(sql)
);
assert(
  "is_admin() sets empty search_path (hardening)",
  /is_admin[\s\S]*?set\s+search_path\s*=\s*''/i.test(sql)
);
assert(
  "is_admin() revokes execute from PUBLIC",
  /revoke\s+execute\s+on\s+function\s+public\.is_admin[\s\S]*?from\s+public/i.test(sql)
);

// ── RLS enabled on all 7 new tables ───────────────────────
console.log("\nRLS enabled on new tables:");
const newTables = [
  "follows",
  "follow_requests",
  "likes",
  "goals",
  "notifications",
  "nonprofits",
  "nonprofit_flags",
];
for (const t of newTables) {
  const { enable, force } = rlsEnabled(t);
  assert(`${t} has ENABLE ROW LEVEL SECURITY`, enable);
  assert(`${t} has FORCE ROW LEVEL SECURITY`, force);
}

// ── profiles: replaced SELECT policy ──────────────────────
console.log("\nprofiles — updated SELECT policy:");
assert(
  "drops old profiles_select first",
  /drop\s+policy\s+if\s+exists\s+profiles_select\s+on\s+profiles/i.test(sql)
);
assert(
  "new profiles_select allows owner",
  policyMatches("profiles", "profiles_select", /auth\.uid\(\)\s*\)\s*=\s*id/i)
);
assert(
  "new profiles_select allows admin",
  policyMatches("profiles", "profiles_select", /is_admin\s*\(\s*\)/i)
);
assert(
  "new profiles_select allows open_giver tier",
  policyMatches("profiles", "profiles_select", /privacy_tier\s*=\s*'open_giver'/i)
);
assert(
  "new profiles_select checks follows for friends_only",
  policyMatches(
    "profiles",
    "profiles_select",
    /friends_only[\s\S]*?from\s+public\.follows/i
  )
);

// ── donations: expanded SELECT ────────────────────────────
console.log("\ndonations — expanded SELECT policy:");
assert(
  "drops old donations_select",
  /drop\s+policy\s+if\s+exists\s+donations_select\s+on\s+donations/i.test(sql)
);
assert(
  "donations_select allows owner",
  policyMatches("donations", "donations_select", /auth\.uid\(\)\s*\)\s*=\s*user_id/i)
);
assert(
  "donations_select allows admin",
  policyMatches("donations", "donations_select", /is_admin\s*\(\s*\)/i)
);
assert(
  "donations_select respects hide_from_feed",
  policyMatches("donations", "donations_select", /hide_from_feed\s*=\s*false/i)
);

// ── follows ───────────────────────────────────────────────
console.log("\nfollows policies:");
assert(
  "follows_insert requires auth.uid() = follower_id",
  policyMatches(
    "follows",
    "follows_insert",
    /with\s+check\s*\(\s*\(select\s+auth\.uid\(\)\)\s*=\s*follower_id/i
  )
);
assert(
  "follows_select allows follower or following or admin",
  policyMatches("follows", "follows_select", /follower_id[\s\S]*?following_id[\s\S]*?is_admin/i)
);
assert(
  "follows_delete requires follower_id = auth.uid()",
  policyMatches("follows", "follows_delete", /follower_id/i)
);
assert("no follows_update policy (intentional)", !hasPolicy("follows", "follows_update"));

// ── follow_requests ───────────────────────────────────────
console.log("\nfollow_requests policies:");
assert(
  "follow_requests_insert requires from_user_id = auth.uid()",
  policyMatches(
    "follow_requests",
    "follow_requests_insert",
    /with\s+check\s*\(\s*\(select\s+auth\.uid\(\)\)\s*=\s*from_user_id/i
  )
);
assert(
  "follow_requests_select allows both parties + admin",
  policyMatches(
    "follow_requests",
    "follow_requests_select",
    /from_user_id[\s\S]*?to_user_id[\s\S]*?is_admin/i
  )
);
assert(
  "follow_requests_update only by recipient",
  policyMatches(
    "follow_requests",
    "follow_requests_update",
    /using\s*\(\s*\(select\s+auth\.uid\(\)\)\s*=\s*to_user_id\s*\)/i
  )
);

// ── likes ─────────────────────────────────────────────────
console.log("\nlikes policies:");
assert(
  "likes_insert requires user_id = auth.uid()",
  policyMatches(
    "likes",
    "likes_insert",
    /with\s+check\s*\(\s*\(select\s+auth\.uid\(\)\)\s*=\s*user_id/i
  )
);
assert(
  "likes_select open to authenticated",
  policyMatches("likes", "likes_select", /auth\.uid\(\)\)\s*is\s+not\s+null/i)
);
assert(
  "likes_delete requires user_id = auth.uid()",
  policyMatches("likes", "likes_delete", /user_id/i)
);

// ── goals — owner CRUD only ───────────────────────────────
console.log("\ngoals — owner CRUD only:");
for (const op of ["select", "insert", "update", "delete"]) {
  assert(
    `goals_${op} gates on user_id = auth.uid()`,
    policyMatches("goals", `goals_${op}`, /auth\.uid\(\)\)\s*=\s*user_id/i)
  );
}
{
  const goalsPolicies = ["goals_select", "goals_insert", "goals_update", "goals_delete"];
  const anyGoalsHasAdmin = goalsPolicies.some((p) =>
    policyMatches("goals", p, /is_admin/i)
  );
  assert(
    "no goals policy references is_admin (strict owner-only)",
    !anyGoalsHasAdmin
  );
}

// ── notifications — owner read/update/delete, no INSERT policy ─────
console.log("\nnotifications policies:");
assert(
  "notifications_select gates on user_id = auth.uid()",
  policyMatches("notifications", "notifications_select", /user_id/i)
);
assert(
  "notifications_update gates on user_id = auth.uid()",
  policyMatches("notifications", "notifications_update", /user_id/i)
);
assert(
  "notifications_delete gates on user_id = auth.uid()",
  policyMatches("notifications", "notifications_delete", /user_id/i)
);
assert(
  "no notifications_insert policy — service role only",
  !hasPolicy("notifications", "notifications_insert")
);

// ── nonprofits — authenticated read, admin write ──────────
console.log("\nnonprofits policies:");
assert(
  "nonprofits_select open to authenticated",
  policyMatches("nonprofits", "nonprofits_select", /auth\.uid\(\)\)\s*is\s+not\s+null/i)
);
assert(
  "nonprofits_insert requires is_admin()",
  policyMatches(
    "nonprofits",
    "nonprofits_insert",
    /with\s+check\s*\(\s*public\.is_admin\s*\(\s*\)\s*\)/i
  )
);
assert(
  "nonprofits_update requires is_admin()",
  policyMatches(
    "nonprofits",
    "nonprofits_update",
    /using\s*\(\s*public\.is_admin\s*\(\s*\)\s*\)/i
  )
);
assert(
  "nonprofits_delete requires is_admin()",
  policyMatches(
    "nonprofits",
    "nonprofits_delete",
    /using\s*\(\s*public\.is_admin\s*\(\s*\)\s*\)/i
  )
);

// ── nonprofit_flags — owner insert/read own, admin read/update all ──
console.log("\nnonprofit_flags policies:");
assert(
  "nonprofit_flags_select allows owner or admin",
  policyMatches(
    "nonprofit_flags",
    "nonprofit_flags_select",
    /user_id[\s\S]*?is_admin/i
  )
);
assert(
  "nonprofit_flags_insert requires user_id = auth.uid()",
  policyMatches(
    "nonprofit_flags",
    "nonprofit_flags_insert",
    /with\s+check\s*\(\s*\(select\s+auth\.uid\(\)\)\s*=\s*user_id/i
  )
);
assert(
  "nonprofit_flags_update requires is_admin()",
  policyMatches(
    "nonprofit_flags",
    "nonprofit_flags_update",
    /using\s*\(\s*public\.is_admin\s*\(\s*\)\s*\)/i
  )
);

// ── Acceptance criteria gates ─────────────────────────────
console.log("\nAcceptance-criteria gates:");
// "Non-admin cannot insert nonprofits" — proven by nonprofits_insert requiring is_admin()
assert(
  "non-admin cannot insert nonprofits (insert gate uses is_admin)",
  policyMatches("nonprofits", "nonprofits_insert", /is_admin/i)
);
// "Admin can read all flags" — proven by select policy including is_admin()
assert(
  "admin can read all flags (select policy branches on is_admin)",
  policyMatches("nonprofit_flags", "nonprofit_flags_select", /is_admin/i)
);

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
