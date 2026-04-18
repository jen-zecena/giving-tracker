/**
 * Profile query shape tests — exercise the aggregation helpers that
 * feed the /profile page without hitting Supabase.
 *
 * Run with: npx tsx tests/profile-queries.test.ts
 */
import { privacyTierMeta } from "../src/lib/queries/profile";
import type { PrivacyTier } from "../src/types";

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

// Replicates the aggregation block in getProfilePageData so we can
// unit-test it without standing up a Supabase session.
function computeStats(
  donations: Array<{ amount: number | string; organization_name: string }>,
  followerCount: number
) {
  return {
    total_donated: donations.reduce((s, d) => s + Number(d.amount), 0),
    donation_count: donations.length,
    organization_count: new Set(donations.map((d) => d.organization_name)).size,
    follower_count: followerCount,
  };
}

// ── privacyTierMeta ─────────────────────────────────────────
console.log("\nprivacyTierMeta:");

{
  const tiers: PrivacyTier[] = ["private", "friends_only", "open_giver"];
  for (const tier of tiers) {
    const meta = privacyTierMeta(tier);
    assert(
      `returns non-empty label for "${tier}"`,
      typeof meta.label === "string" && meta.label.length > 0
    );
    assert(
      `returns non-empty description for "${tier}"`,
      typeof meta.description === "string" && meta.description.length > 0
    );
  }
}

// ── computeStats ────────────────────────────────────────────
console.log("\ncomputeStats:");

{
  const stats = computeStats([], 0);
  assert("empty donations → zero total", stats.total_donated === 0);
  assert("empty donations → zero count", stats.donation_count === 0);
  assert("empty donations → zero orgs", stats.organization_count === 0);
  assert("no followers → 0 followers", stats.follower_count === 0);
}

{
  const donations = [
    { amount: 100, organization_name: "Red Cross" },
    { amount: "250.50", organization_name: "Red Cross" },
    { amount: 50, organization_name: "UNICEF" },
  ];
  const stats = computeStats(donations, 7);
  assert("sums numeric + string amounts", stats.total_donated === 400.5);
  assert("counts donation rows", stats.donation_count === 3);
  assert(
    "deduplicates organization names",
    stats.organization_count === 2
  );
  assert("pins follower count through", stats.follower_count === 7);
}

{
  // Amounts stored as Postgres numeric come back as strings — make sure
  // the aggregation never silently coerces to NaN.
  const donations = [
    { amount: "9999.99", organization_name: "A" },
    { amount: "0.01", organization_name: "B" },
  ];
  const stats = computeStats(donations, 0);
  assert(
    "handles string numerics (no NaN)",
    Number.isFinite(stats.total_donated) &&
      Math.abs(stats.total_donated - 10000) < 1e-9,
    `got ${stats.total_donated}`
  );
}

{
  // Case-sensitive org dedupe — matches how Supabase stores the name.
  const donations = [
    { amount: 10, organization_name: "redcross" },
    { amount: 10, organization_name: "RedCross" },
  ];
  const stats = computeStats(donations, 0);
  assert(
    "org dedupe is case-sensitive",
    stats.organization_count === 2
  );
}

// ── Summary ─────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
