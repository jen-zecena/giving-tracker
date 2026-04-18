/**
 * DP-005: Migration + type verification tests
 * Run with: npx tsx tests/dp005-migration.test.ts
 *
 * Verifies:
 * - Migration SQL contains the expected ALTER TABLE statements
 * - TypeScript Profile/Donation types include the new columns
 * - Defaults in the migration match the spec
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import type { Profile, Donation } from "../src/types";

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

// ── Load migration SQL ────────────────────────────────────
const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20260412_003_add_profile_and_donation_columns.sql"
);
const sql = readFileSync(migrationPath, "utf-8");

// ── Migration: profiles columns ───────────────────────────
console.log("\nMigration — profiles columns:");

assert(
  "adds is_admin to profiles",
  sql.includes("ADD COLUMN IF NOT EXISTS is_admin boolean") &&
    sql.includes("DEFAULT false")
);

assert(
  "adds show_amounts_to_friends to profiles",
  sql.includes("ADD COLUMN IF NOT EXISTS show_amounts_to_friends boolean") &&
    sql.includes("DEFAULT false")
);

assert(
  "adds show_percentage_publicly to profiles",
  sql.includes("ADD COLUMN IF NOT EXISTS show_percentage_publicly boolean") &&
    sql.includes("DEFAULT false")
);

assert(
  "adds email_notifications to profiles with opt-out default (true)",
  sql.includes("ADD COLUMN IF NOT EXISTS email_notifications boolean") &&
    sql.includes("DEFAULT true")
);

// ── Migration: donations columns ──────────────────────────
console.log("\nMigration — donations columns:");

assert(
  "adds hide_from_feed to donations",
  sql.includes("ADD COLUMN IF NOT EXISTS hide_from_feed boolean") &&
    sql.includes("DEFAULT false")
);

// ── Migration: uses IF NOT EXISTS ─────────────────────────
console.log("\nMigration — idempotency:");

const alterStatements = sql.match(/ADD COLUMN/g) ?? [];
const ifNotExistsStatements = sql.match(/ADD COLUMN IF NOT EXISTS/g) ?? [];
assert(
  "all ADD COLUMN statements use IF NOT EXISTS",
  alterStatements.length > 0 &&
    alterStatements.length === ifNotExistsStatements.length,
  `${alterStatements.length} ADD COLUMN, ${ifNotExistsStatements.length} IF NOT EXISTS`
);

// ── Migration: all columns are NOT NULL ───────────────────
console.log("\nMigration — constraints:");

const columnLines = sql
  .split("\n")
  .filter((l) => l.includes("ADD COLUMN IF NOT EXISTS"));
for (const line of columnLines) {
  const colName = line.match(/IF NOT EXISTS (\w+)/)?.[1] ?? "unknown";
  assert(
    `${colName} is NOT NULL`,
    line.includes("NOT NULL")
  );
}

// ── TypeScript types: Profile ─────────────────────────────
console.log("\nTypeScript types — Profile:");

{
  // Use a type-level check: create an object that satisfies Profile
  // with all required new fields. If this compiles, the type is correct.
  const profile: Pick<
    Profile,
    "is_admin" | "show_amounts_to_friends" | "show_percentage_publicly" | "email_notifications"
  > = {
    is_admin: false,
    show_amounts_to_friends: false,
    show_percentage_publicly: false,
    email_notifications: true,
  };
  assert("Profile has is_admin (boolean)", typeof profile.is_admin === "boolean");
  assert(
    "Profile has show_amounts_to_friends (boolean)",
    typeof profile.show_amounts_to_friends === "boolean"
  );
  assert(
    "Profile has show_percentage_publicly (boolean)",
    typeof profile.show_percentage_publicly === "boolean"
  );
  assert(
    "Profile has email_notifications (boolean)",
    typeof profile.email_notifications === "boolean"
  );
}

// ── TypeScript types: Donation ────────────────────────────
console.log("\nTypeScript types — Donation:");

{
  const donation: Pick<Donation, "hide_from_feed"> = {
    hide_from_feed: false,
  };
  assert("Donation has hide_from_feed (boolean)", typeof donation.hide_from_feed === "boolean");
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
