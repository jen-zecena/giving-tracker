/**
 * DP-046 tier-aware RLS migration validation tests.
 * Run with: npx tsx tests/migration-dp046.test.ts
 *
 * Parses the DP-046 migration SQL as text and asserts the tier-aware
 * SELECT policies are shaped the way FIGMA_PORT_PLAN §7 demands. Static
 * checks can't prove the runtime behavior — the behavioral assertions
 * live in supabase/tests/dp046_tier_rls.sql — but they do catch
 * regressions that would silently weaken the policy (e.g. a missing
 * hide_from_feed check, a dropped follow EXISTS clause, or forgetting
 * to re-create the dropped profiles_select policy).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260419_005_tier_aware_rls.sql"
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

function policyMatches(
  table: string,
  policyName: string,
  pattern: RegExp
): boolean {
  const body = policyBody(table, policyName);
  return body !== null && pattern.test(body);
}

// ── privacy_tier_of() helper ──────────────────────────────
console.log("\nprivacy_tier_of() helper:");

assert(
  "function is (re)created",
  /create\s+or\s+replace\s+function\s+public\.privacy_tier_of/i.test(sql)
);
assert(
  "uses SECURITY DEFINER to bypass profiles RLS",
  /privacy_tier_of[\s\S]*?security\s+definer/i.test(sql)
);
assert(
  "STABLE volatility",
  /privacy_tier_of[\s\S]*?\bstable\b/i.test(sql)
);
assert(
  "empty search_path (hardens against search-path injection)",
  /privacy_tier_of[\s\S]*?set\s+search_path\s*=\s*''/i.test(sql)
);
assert(
  "execute is revoked from public and granted to authenticated",
  /revoke\s+execute\s+on\s+function\s+public\.privacy_tier_of[\s\S]*?grant\s+execute\s+on\s+function\s+public\.privacy_tier_of\(uuid\)\s+to\s+authenticated/i.test(
    sql
  )
);

// ── donations_select ──────────────────────────────────────
console.log("\ndonations_select (tier-aware):");

assert(
  "placeholder is dropped first",
  /drop\s+policy\s+if\s+exists\s+donations_select\s+on\s+donations/i.test(sql)
);
assert("policy is re-created", policyBody("donations", "donations_select") !== null);
assert(
  "owner branch present",
  policyMatches("donations", "donations_select", /auth\.uid\(\)\s*\)\s*=\s*user_id/i)
);
assert(
  "admin branch present",
  policyMatches("donations", "donations_select", /public\.is_admin\(\)/i)
);
assert(
  "open_giver branch checks hide_from_feed AND tier",
  policyMatches(
    "donations",
    "donations_select",
    /hide_from_feed\s*=\s*false[\s\S]*?privacy_tier_of\([^)]*\)\s*=\s*'open_giver'/i
  )
);
assert(
  "friends_only branch checks tier",
  policyMatches(
    "donations",
    "donations_select",
    /privacy_tier_of\([^)]*\)\s*=\s*'friends_only'/i
  )
);
assert(
  "friends_only branch checks follows edge",
  policyMatches(
    "donations",
    "donations_select",
    /exists\s*\(\s*select\s+1\s+from\s+public\.follows[\s\S]*?follower_id\s*=\s*\(\s*select\s+auth\.uid\(\)[\s\S]*?following_id\s*=\s*donations\.user_id/i
  )
);
assert(
  "placeholder 'authenticated-other' read path is gone",
  !policyMatches(
    "donations",
    "donations_select",
    /auth\.uid\(\)\s*\)\s*is\s+not\s+null\s+and\s+hide_from_feed/i
  )
);

// ── profiles_select ───────────────────────────────────────
console.log("\nprofiles_select (re-asserted):");

assert(
  "placeholder is dropped first",
  /drop\s+policy\s+if\s+exists\s+profiles_select\s+on\s+profiles/i.test(sql)
);
assert("policy is re-created", policyBody("profiles", "profiles_select") !== null);
assert(
  "owner branch present",
  policyMatches("profiles", "profiles_select", /auth\.uid\(\)\s*\)\s*=\s*id/i)
);
assert(
  "admin branch present",
  policyMatches("profiles", "profiles_select", /public\.is_admin\(\)/i)
);
assert(
  "open_giver tier branch present",
  policyMatches("profiles", "profiles_select", /privacy_tier\s*=\s*'open_giver'/i)
);
assert(
  "friends_only branch checks follows edge",
  policyMatches(
    "profiles",
    "profiles_select",
    /privacy_tier\s*=\s*'friends_only'[\s\S]*?exists\s*\(\s*select\s+1\s+from\s+public\.follows[\s\S]*?follower_id\s*=\s*\(\s*select\s+auth\.uid\(\)[\s\S]*?following_id\s*=\s*profiles\.id/i
  )
);

// ── Migration is a net negative surface (shouldn't add new tables) ─
console.log("\nMigration surface:");

assert(
  "no CREATE TABLE statements",
  !/create\s+table\b/i.test(sql)
);
assert(
  "no enum type mutations",
  !/create\s+type\b/i.test(sql)
);

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
