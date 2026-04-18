/**
 * DP-006 migration validation tests
 * Run with: npx tsx tests/migration-dp006.test.ts
 *
 * Parses the migration SQL as text and asserts the required tables,
 * columns, constraints, indexes, and enum values are present. Also
 * asserts that the TypeScript string-union types mirror the SQL enums
 * so drift between schema and types gets caught at CI time.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  FollowRequestStatus,
  GoalTimeframe,
  GoalType,
  NonprofitFlagReason,
  NonprofitFlagStatus,
  NotificationType,
} from "../src/types";

const MIGRATION_PATH = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260417_003_create_figma_tables.sql"
);

const sql = readFileSync(MIGRATION_PATH, "utf8");
const sqlLower = sql.toLowerCase();

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

function hasCreateTable(name: string) {
  const re = new RegExp(`create\\s+table\\s+${name}\\b`, "i");
  return re.test(sql);
}

function tableHasColumn(table: string, column: string) {
  const tableRe = new RegExp(
    `create\\s+table\\s+${table}\\s*\\(([\\s\\S]*?)\\);`,
    "i"
  );
  const match = sql.match(tableRe);
  if (!match) return false;
  const body = match[1];
  const colRe = new RegExp(`\\b${column}\\b`, "i");
  return colRe.test(body);
}

function hasUniqueConstraint(table: string, columns: string[]) {
  const tableRe = new RegExp(
    `create\\s+table\\s+${table}\\s*\\(([\\s\\S]*?)\\);`,
    "i"
  );
  const match = sql.match(tableRe);
  if (!match) return false;
  const body = match[1].toLowerCase();
  const colList = columns.map((c) => c.toLowerCase()).join("\\s*,\\s*");
  const re = new RegExp(`unique\\s*\\(\\s*${colList}\\s*\\)`);
  return re.test(body);
}

function hasIndex(pattern: RegExp) {
  return pattern.test(sql);
}

function enumValues(enumName: string): string[] {
  const re = new RegExp(
    `create\\s+type\\s+${enumName}\\s+as\\s+enum\\s*\\(([^)]*)\\)`,
    "i"
  );
  const match = sql.match(re);
  if (!match) return [];
  return Array.from(match[1].matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

// ── Tables exist ──────────────────────────────────────────
console.log("\nRequired tables:");
for (const t of [
  "follows",
  "follow_requests",
  "likes",
  "goals",
  "notifications",
  "nonprofits",
  "nonprofit_flags",
]) {
  assert(`table ${t} is created`, hasCreateTable(t));
}

// ── Column shapes per FIGMA_PORT_PLAN §3 ──────────────────
console.log("\nColumn shapes:");

const required: Record<string, string[]> = {
  follows: ["id", "follower_id", "following_id", "created_at"],
  follow_requests: ["id", "from_user_id", "to_user_id", "status", "created_at"],
  likes: ["id", "user_id", "donation_id", "donation_user_id", "created_at"],
  goals: [
    "id",
    "user_id",
    "title",
    "description",
    "type",
    "target",
    "current",
    "timeframe",
    "created_at",
  ],
  notifications: [
    "id",
    "user_id",
    "type",
    "title",
    "message",
    "read",
    "action_url",
    "metadata",
    "created_at",
  ],
  nonprofits: [
    "id",
    "ein",
    "name",
    "mission",
    "category",
    "location",
    "website",
    "donation_url",
    "verified",
    "logo_url",
    "description",
    "founded",
    "size",
    "revenue",
    "tags",
    "synced_at",
  ],
  nonprofit_flags: [
    "id",
    "nonprofit_id",
    "user_id",
    "reason",
    "description",
    "status",
    "admin_notes",
    "created_at",
  ],
};

for (const [table, columns] of Object.entries(required)) {
  for (const col of columns) {
    assert(`${table}.${col}`, tableHasColumn(table, col));
  }
}

// ── Unique constraints ────────────────────────────────────
console.log("\nUnique constraints:");
assert(
  "follows unique(follower_id, following_id)",
  hasUniqueConstraint("follows", ["follower_id", "following_id"])
);
assert(
  "follow_requests unique(from_user_id, to_user_id)",
  hasUniqueConstraint("follow_requests", ["from_user_id", "to_user_id"])
);
assert(
  "likes unique(user_id, donation_id)",
  hasUniqueConstraint("likes", ["user_id", "donation_id"])
);
assert("nonprofits.ein unique", /ein\s+text\s+not\s+null\s+unique/i.test(sql));

// ── Indexes required by the issue ─────────────────────────
console.log("\nRequired indexes:");
assert(
  "donations(user_id, donation_date DESC)",
  hasIndex(/create\s+index[\s\S]+?donations\s*\(\s*user_id\s*,\s*donation_date\s+desc\s*\)/i)
);
assert(
  "follows(follower_id)",
  hasIndex(/create\s+index[\s\S]+?follows\s*\(\s*follower_id\s*\)/i)
);
assert(
  "follows(following_id)",
  hasIndex(/create\s+index[\s\S]+?follows\s*\(\s*following_id\s*\)/i)
);
assert(
  "notifications(user_id, read, created_at DESC)",
  hasIndex(
    /create\s+index[\s\S]+?notifications\s*\(\s*user_id\s*,\s*read\s*,\s*created_at\s+desc\s*\)/i
  )
);
assert(
  "nonprofit_flags(status)",
  hasIndex(/create\s+index[\s\S]+?nonprofit_flags\s*\(\s*status\s*\)/i)
);
assert(
  "nonprofits(name)",
  hasIndex(/create\s+index[\s\S]+?nonprofits\s*\(\s*name\s*\)/i)
);
assert(
  "nonprofits GIN(category)",
  hasIndex(/create\s+index[\s\S]+?nonprofits\s+using\s+gin\s*\(\s*category\s*\)/i)
);

// ── Defaults & NOT NULLs that the plan implies ────────────
console.log("\nDefaults and NOT NULL:");
assert(
  "follow_requests.status defaults to 'pending'",
  /status\s+follow_request_status\s+not\s+null\s+default\s+'pending'/i.test(sql)
);
assert(
  "notifications.read defaults to false",
  /read\s+boolean\s+not\s+null\s+default\s+false/i.test(sql)
);
assert(
  "notifications.metadata jsonb default '{}'",
  /metadata\s+jsonb\s+not\s+null\s+default\s+'\{\}'::jsonb/i.test(sql)
);
assert(
  "nonprofits.verified defaults to false",
  /verified\s+boolean\s+not\s+null\s+default\s+false/i.test(sql)
);
assert(
  "nonprofit_flags.status defaults to 'pending'",
  /status\s+nonprofit_flag_status\s+not\s+null\s+default\s+'pending'/i.test(sql)
);
assert(
  "goals.current defaults to 0",
  /current\s+numeric\([^)]+\)\s+not\s+null\s+default\s+0/i.test(sql)
);

// ── Primary keys ──────────────────────────────────────────
console.log("\nPrimary keys:");
for (const t of [
  "follows",
  "follow_requests",
  "likes",
  "goals",
  "notifications",
  "nonprofits",
  "nonprofit_flags",
]) {
  const tableRe = new RegExp(
    `create\\s+table\\s+${t}\\s*\\(([\\s\\S]*?)\\);`,
    "i"
  );
  const body = sql.match(tableRe)?.[1] ?? "";
  assert(`${t} has primary key`, /primary\s+key/i.test(body));
}

// ── RLS: must NOT be enabled on new tables (DP-007) ───────
console.log("\nRLS is deferred to DP-007:");
for (const t of [
  "follows",
  "follow_requests",
  "likes",
  "goals",
  "notifications",
  "nonprofits",
  "nonprofit_flags",
]) {
  const re = new RegExp(`alter\\s+table\\s+${t}\\s+enable\\s+row\\s+level\\s+security`, "i");
  assert(`${t} does not enable RLS`, !re.test(sql));
}

// ── Enum values match TypeScript unions ───────────────────
console.log("\nEnum / TS union parity:");

function expectEnum<T extends string>(
  enumName: string,
  expected: readonly T[]
) {
  const got = enumValues(enumName);
  const same =
    got.length === expected.length &&
    expected.every((v) => got.includes(v));
  assert(
    `${enumName} = [${expected.join(", ")}]`,
    same,
    same ? undefined : `got [${got.join(", ")}]`
  );
}

const followRequestStatuses: readonly FollowRequestStatus[] = [
  "pending",
  "accepted",
  "rejected",
];
expectEnum("follow_request_status", followRequestStatuses);

const goalTypes: readonly GoalType[] = [
  "amount",
  "count",
  "organizations",
  "causes",
];
expectEnum("goal_type", goalTypes);

const goalTimeframes: readonly GoalTimeframe[] = ["month", "year", "ongoing"];
expectEnum("goal_timeframe", goalTimeframes);

const notificationTypes: readonly NotificationType[] = [
  "like",
  "follow",
  "follow_request",
  "badge",
  "milestone",
  "pending_donation",
];
expectEnum("notification_type", notificationTypes);

const flagReasons: readonly NonprofitFlagReason[] = [
  "fraud",
  "outdated",
  "duplicate",
  "inappropriate",
  "other",
];
expectEnum("nonprofit_flag_reason", flagReasons);

const flagStatuses: readonly NonprofitFlagStatus[] = [
  "pending",
  "reviewed",
  "resolved",
  "dismissed",
];
expectEnum("nonprofit_flag_status", flagStatuses);

// ── Array columns use PG array type ───────────────────────
console.log("\nArray columns:");
assert("nonprofits.category is text[]", /category\s+text\[\]/i.test(sql));
assert("nonprofits.tags is text[]", /tags\s+text\[\]/i.test(sql));

// ── Sanity: one CREATE TABLE per target table ─────────────
console.log("\nNo duplicate table definitions:");
for (const t of Object.keys(required)) {
  const count = (sqlLower.match(new RegExp(`create\\s+table\\s+${t}\\b`, "g")) ?? []).length;
  assert(`${t} declared exactly once`, count === 1, `count=${count}`);
}

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
