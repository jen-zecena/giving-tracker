/**
 * Follow-request server-action validation tests (DP-041).
 * Run with: npx tsx tests/follow-requests-actions.test.ts
 *
 * Exercises the pure input validator used by every follow-request
 * action. The DB-touching branches (RLS recipient check, follow insert
 * via service role, notification emit) depend on a live Supabase
 * environment and are exercised end-to-end in integration, not here.
 */

import { parseUuid } from "../src/lib/actions/follow-requests-validation";

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

// ── parseUuid ─────────────────────────────────────────────
console.log("\nparseUuid:");

{
  const got = parseUuid("11111111-1111-1111-1111-111111111111");
  assert("accepts lowercase uuid", got.ok === true && got.data === "11111111-1111-1111-1111-111111111111");
}

{
  const got = parseUuid("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE");
  assert("accepts uppercase uuid", got.ok === true);
}

{
  const got = parseUuid("00000000-0000-0000-0000-000000000000");
  assert("accepts nil uuid", got.ok === true);
}

{
  const got = parseUuid("");
  assert(
    "rejects empty string with 'missing'",
    got.ok === false && /missing/i.test(got.error)
  );
}

{
  const got = parseUuid(undefined);
  assert(
    "rejects undefined",
    got.ok === false && /missing/i.test(got.error)
  );
}

{
  const got = parseUuid(null);
  assert("rejects null", got.ok === false);
}

{
  const got = parseUuid(12345);
  assert("rejects numbers", got.ok === false);
}

{
  const got = parseUuid("not-a-uuid");
  assert(
    "rejects malformed string with 'invalid'",
    got.ok === false && /invalid/i.test(got.error)
  );
}

{
  // Missing one hex digit in the last group
  const got = parseUuid("11111111-1111-1111-1111-11111111111");
  assert("rejects truncated uuid", got.ok === false);
}

{
  // 'g' is not hex
  const got = parseUuid("gggggggg-1111-1111-1111-111111111111");
  assert("rejects non-hex characters", got.ok === false);
}

{
  const got = parseUuid("not-a-uuid", "request id");
  assert(
    "uses supplied field label in error",
    got.ok === false && got.error.includes("request id")
  );
}

// ── Summary ───────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
