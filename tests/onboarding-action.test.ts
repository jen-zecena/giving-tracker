/**
 * Onboarding server-action tests — focus on encryption + input validation.
 * Run with: npx tsx --env-file=.env.local tests/onboarding-action.test.ts
 *
 * We can't invoke the "use server" function here (Next.js runtime APIs),
 * so we replicate the salary-encryption path and boundary checks to verify
 * no plaintext ever leaves the client and validation rejects bad input.
 */
import {
  encryptSalaryForDB,
  decryptSalaryFromDB,
} from "../src/lib/salary";

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

// Replicate the validation + encryption shape from
// src/lib/actions/profile.ts::completeOnboarding without importing the
// "use server" module (which would require Next runtime).

const VALID_TIERS = ["private", "friends_only", "open_giver"] as const;
type Tier = (typeof VALID_TIERS)[number];

type Input = {
  display_name: string;
  salary?: number | null;
  privacy_tier: Tier;
};

function buildUpdates(input: Input): { error?: string; updates?: Record<string, unknown> } {
  const display_name = input.display_name?.trim() ?? "";
  if (!display_name) return { error: "Please enter your name." };
  if (!VALID_TIERS.includes(input.privacy_tier)) {
    return { error: "Please choose a privacy level." };
  }

  const hasSalary =
    input.salary !== null && input.salary !== undefined && input.salary !== 0;

  if (hasSalary) {
    if (!Number.isFinite(input.salary) || (input.salary as number) < 0) {
      return { error: "Salary must be a positive number." };
    }
  }

  const updates: Record<string, unknown> = {
    display_name,
    privacy_tier: input.privacy_tier,
    onboarding_completed: true,
  };

  if (hasSalary) {
    updates.salary_encrypted = encryptSalaryForDB(input.salary as number);
    updates.salary_updated_at = new Date().toISOString();
  }

  return { updates };
}

// ── Validation ─────────────────────────────────────────────
console.log("\nValidation:");

{
  const res = buildUpdates({ display_name: "", privacy_tier: "private" });
  assert("rejects empty display_name", res.error === "Please enter your name.");
}

{
  const res = buildUpdates({ display_name: "   ", privacy_tier: "private" });
  assert(
    "rejects whitespace-only display_name",
    res.error === "Please enter your name."
  );
}

{
  const res = buildUpdates({
    display_name: "Alex",
    privacy_tier: "bogus" as Tier,
  });
  assert(
    "rejects invalid privacy tier",
    res.error === "Please choose a privacy level."
  );
}

{
  const res = buildUpdates({
    display_name: "Alex",
    privacy_tier: "private",
    salary: -1,
  });
  assert(
    "rejects negative salary",
    res.error === "Salary must be a positive number."
  );
}

{
  const res = buildUpdates({
    display_name: "Alex",
    privacy_tier: "private",
    salary: Number.NaN,
  });
  assert(
    "rejects NaN salary",
    res.error === "Salary must be a positive number."
  );
}

// ── Happy paths ────────────────────────────────────────────
console.log("\nHappy paths:");

{
  const res = buildUpdates({
    display_name: "  Alex Rivera  ",
    privacy_tier: "friends_only",
  });
  assert("trims display_name", res.updates?.display_name === "Alex Rivera");
  assert(
    "sets privacy tier",
    res.updates?.privacy_tier === "friends_only"
  );
  assert("marks onboarding complete", res.updates?.onboarding_completed === true);
  assert(
    "skips salary fields when unset",
    !("salary_encrypted" in (res.updates ?? {}))
  );
}

{
  const res = buildUpdates({
    display_name: "Alex",
    privacy_tier: "open_giver",
    salary: 85000,
  });
  const enc = res.updates?.salary_encrypted as string | undefined;
  assert("encrypts salary to a non-empty base64 string", !!enc && enc.length > 0);
  assert(
    "encrypted salary round-trips",
    !!enc && decryptSalaryFromDB(enc) === 85000
  );
  assert(
    "salary_updated_at is an ISO timestamp",
    typeof res.updates?.salary_updated_at === "string" &&
      !Number.isNaN(Date.parse(res.updates.salary_updated_at as string))
  );
}

{
  // salary === 0 should be treated as "not provided"
  const res = buildUpdates({
    display_name: "Alex",
    privacy_tier: "private",
    salary: 0,
  });
  assert(
    "treats salary=0 as unset (no encryption)",
    !("salary_encrypted" in (res.updates ?? {}))
  );
}

{
  // Plaintext never appears in the update object
  const res = buildUpdates({
    display_name: "Alex",
    privacy_tier: "private",
    salary: 123456,
  });
  const serialized = JSON.stringify(res.updates);
  assert(
    "plaintext salary never appears in update payload",
    !serialized.includes("123456")
  );
}

// ── All 3 tiers accepted ───────────────────────────────────
console.log("\nTier enum:");
for (const tier of VALID_TIERS) {
  const res = buildUpdates({ display_name: "Alex", privacy_tier: tier });
  assert(`accepts "${tier}"`, res.updates?.privacy_tier === tier);
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
