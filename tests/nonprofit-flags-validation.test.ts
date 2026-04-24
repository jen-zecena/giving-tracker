/**
 * DP-065 — Pure validation tests for the nonprofit_flags action layer.
 * Run with: npx tsx tests/nonprofit-flags-validation.test.ts
 *
 * The DB-touching concerns (insert under RLS, admin check round-trip,
 * FK error surfacing) are exercised against a live Supabase instance —
 * the manual checklist for those lives in the PR description. This
 * file pins the pure pieces:
 *   - reason / status enum gating at the action boundary
 *   - id presence checks
 *   - description and admin-notes normalisation (trim, empty→null,
 *     length cap, type rejection)
 */

import {
  FLAG_ADMIN_NOTES_MAX_LENGTH,
  FLAG_DESCRIPTION_MAX_LENGTH,
  normalizeAdminNotes,
  normalizeDescription,
  validateFlagId,
  validateNonprofitId,
  validateReason,
  validateStatus,
} from "../src/lib/actions/nonprofit-flags-validation";

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

function eq<T>(name: string, got: T, want: T) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  assert(name, ok, ok ? undefined : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// ── validateNonprofitId / validateFlagId ──────────────────
console.log("validateNonprofitId");
assert("accepts a non-empty string", validateNonprofitId("a-uuid") === null);
assert("rejects empty string", typeof validateNonprofitId("") === "string");
assert("rejects whitespace-only", typeof validateNonprofitId("   ") === "string");
assert("rejects undefined", typeof validateNonprofitId(undefined) === "string");
assert("rejects number", typeof validateNonprofitId(42) === "string");
assert("rejects object", typeof validateNonprofitId({}) === "string");

console.log("\nvalidateFlagId");
assert("accepts a non-empty string", validateFlagId("flag-uuid") === null);
assert("rejects empty string", typeof validateFlagId("") === "string");
assert("rejects null", typeof validateFlagId(null) === "string");

// ── validateReason ────────────────────────────────────────
console.log("\nvalidateReason");
{
  const valid = ["fraud", "outdated", "duplicate", "inappropriate", "other"];
  for (const r of valid) {
    assert(`accepts "${r}"`, validateReason(r) === null);
  }
  assert("rejects unknown value", typeof validateReason("spam") === "string");
  assert("rejects empty string", typeof validateReason("") === "string");
  assert("rejects undefined", typeof validateReason(undefined) === "string");
  assert("rejects number", typeof validateReason(1) === "string");
  // Case sensitivity matters — DB enum is lower-case; UI never sends
  // upper-case but a stray request shouldn't slip through.
  assert(
    "rejects case-shifted value (enum is case-sensitive)",
    typeof validateReason("Fraud") === "string"
  );
}

// ── validateStatus ────────────────────────────────────────
console.log("\nvalidateStatus");
{
  const valid = ["pending", "reviewed", "resolved", "dismissed"];
  for (const s of valid) {
    assert(`accepts "${s}"`, validateStatus(s) === null);
  }
  assert("rejects unknown status", typeof validateStatus("done") === "string");
  assert("rejects empty string", typeof validateStatus("") === "string");
  assert("rejects null", typeof validateStatus(null) === "string");
}

// ── normalizeDescription ──────────────────────────────────
console.log("\nnormalizeDescription");
{
  eq("undefined → null value", normalizeDescription(undefined), { value: null });
  eq("null → null value", normalizeDescription(null), { value: null });
  eq("empty string → null value", normalizeDescription(""), { value: null });
  eq(
    "whitespace-only → null value (so we don't store junk)",
    normalizeDescription("   \n\t "),
    { value: null }
  );
  eq("trims surrounding whitespace", normalizeDescription("  hello  "), {
    value: "hello",
  });
  eq("preserves internal whitespace", normalizeDescription("hello world"), {
    value: "hello world",
  });
  eq(
    `accepts text at exactly ${FLAG_DESCRIPTION_MAX_LENGTH} chars`,
    normalizeDescription("x".repeat(FLAG_DESCRIPTION_MAX_LENGTH)),
    { value: "x".repeat(FLAG_DESCRIPTION_MAX_LENGTH) }
  );
  {
    const got = normalizeDescription("x".repeat(FLAG_DESCRIPTION_MAX_LENGTH + 1));
    assert(
      `rejects text longer than ${FLAG_DESCRIPTION_MAX_LENGTH} chars`,
      "error" in got
    );
  }
  {
    const got = normalizeDescription(42);
    assert("rejects non-string input", "error" in got);
  }
}

// ── normalizeAdminNotes ───────────────────────────────────
console.log("\nnormalizeAdminNotes");
{
  eq("undefined → null", normalizeAdminNotes(undefined), { value: null });
  eq("trims and stores", normalizeAdminNotes("  resolved offline "), {
    value: "resolved offline",
  });
  {
    const got = normalizeAdminNotes("y".repeat(FLAG_ADMIN_NOTES_MAX_LENGTH + 1));
    assert(
      `rejects notes longer than ${FLAG_ADMIN_NOTES_MAX_LENGTH} chars`,
      "error" in got
    );
  }
  {
    const got = normalizeAdminNotes({ not: "a string" });
    assert("rejects non-string input", "error" in got);
  }
}

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
