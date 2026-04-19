/**
 * Unit tests for the derived-badges layer (DP-032).
 * Run with: npx tsx tests/badges.test.ts
 *
 * 17 badges across 4 categories:
 *   milestone (7) — first-donation + 3 salary + 3 count tiers
 *   consistency (3) — streak 3 / 6 / 12
 *   cause (4) — education, health, environment, diverse
 *   impact (3) — local, global, recurring
 */

import {
  BADGE_IDS,
  computeBadges,
  type BadgeRow,
} from "../src/lib/queries/badges";
import type { CauseTag, DonationScope } from "../src/types";

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

const NOW = new Date(2026, 3, 15); // April 15 2026 local

function row(partial: Partial<BadgeRow>): BadgeRow {
  return {
    amount: 50,
    donation_date: "2026-04-10",
    cause_tag: "education",
    scope: "local",
    is_recurring: false,
    status: "confirmed",
    ...partial,
  };
}

function rowsOf(n: number, partial: Partial<BadgeRow> = {}): BadgeRow[] {
  return Array.from({ length: n }, (_, i) =>
    row({ donation_date: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`, ...partial })
  );
}

// ── Shape ────────────────────────────────────────────────
console.log("\nbadge set shape:");

{
  const badges = computeBadges({
    rows: [],
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  assert(
    "returns all 17 badges (none earned when no data)",
    badges.length === 17 && badges.every((b) => !b.earned),
  );
  assert(
    "every badge id from BADGE_IDS appears exactly once",
    BADGE_IDS.every((id) => badges.filter((b) => b.id === id).length === 1),
  );
  const categories = new Set(badges.map((b) => b.category));
  assert(
    "uses exactly the 4 active categories (milestone/consistency/cause/impact)",
    categories.size === 4 &&
      categories.has("milestone") &&
      categories.has("consistency") &&
      categories.has("cause") &&
      categories.has("impact"),
  );
}

// ── Milestone: first-donation ────────────────────────────
console.log("\nmilestone: first-donation:");

{
  const badges = computeBadges({
    rows: [row({ donation_date: "2026-02-15" }), row({ donation_date: "2026-03-20" })],
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const first = badges.find((b) => b.id === "first-donation")!;
  assert("earned after any confirmed donation", first.earned);
  assert(
    "earnedDate pins to the oldest confirmed donation (not the newest)",
    first.earnedDate === "2026-02-15",
  );
}

{
  const badges = computeBadges({
    rows: [row({ status: "pending" })],
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const first = badges.find((b) => b.id === "first-donation")!;
  assert("pending donations do not earn first-donation", !first.earned);
}

// ── Milestone: count tiers ───────────────────────────────
console.log("\nmilestone: count tiers (10/50/100):");

{
  const badges = computeBadges({
    rows: rowsOf(10),
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const b10 = badges.find((b) => b.id === "10-donations")!;
  const b50 = badges.find((b) => b.id === "50-donations")!;
  assert("10-donations earned at 10", b10.earned);
  assert("50-donations not yet earned at 10", !b50.earned);
  assert("10-donations progress matches count", b10.progress === 10);
  assert(
    "50-donations progress advances (not stuck at 0)",
    b50.progress === 10,
  );
}

// ── Milestone: salary % ──────────────────────────────────
console.log("\nmilestone: salary percentage:");

{
  const badges = computeBadges({
    rows: [row({ amount: 1000 })],
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const oneP = badges.find((b) => b.id === "1-percent-club")!;
  assert(
    "1% club NOT earned when salary is null (skip gracefully)",
    !oneP.earned,
  );
  assert(
    "salary-badge progress is 0 when salary null (not NaN)",
    oneP.progress === 0,
  );
}

{
  const badges = computeBadges({
    rows: [row({ amount: 1000 })],
    salaryPercentage: 2.5,
    streakMonths: 0,
    now: NOW,
  });
  const oneP = badges.find((b) => b.id === "1-percent-club")!;
  const twoP = badges.find((b) => b.id === "2-percent-club")!;
  const fiveP = badges.find((b) => b.id === "5-percent-club")!;
  assert("1% earned at 2.5%", oneP.earned);
  assert("2% earned at 2.5%", twoP.earned);
  assert("5% NOT earned at 2.5%", !fiveP.earned);
  assert(
    "salary-badge progress reports actual percentage (2.5)",
    oneP.progress === 2.5,
  );
}

// ── Consistency: streak tiers ────────────────────────────
console.log("\nconsistency: streak tiers:");

{
  const badges = computeBadges({
    rows: rowsOf(5),
    salaryPercentage: null,
    streakMonths: 6,
    now: NOW,
  });
  const mg = badges.find((b) => b.id === "monthly-giver")!;
  const ck = badges.find((b) => b.id === "consistency-king")!;
  const yr = badges.find((b) => b.id === "year-round-giver")!;
  assert("3-month streak earns monthly-giver", mg.earned);
  assert("6-month streak earns consistency-king", ck.earned);
  assert("6-month streak does NOT earn year-round-giver (needs 12)", !yr.earned);
}

// ── Cause: single-tag champions ──────────────────────────
console.log("\ncause: single-tag champions (education/health/environment):");

{
  const causes: CauseTag[] = ["education", "health", "environment"];
  for (const tag of causes) {
    const badges = computeBadges({
      rows: rowsOf(5, { cause_tag: tag }),
      salaryPercentage: null,
      streakMonths: 0,
      now: NOW,
    });
    const badgeId =
      tag === "education"
        ? "education-champion"
        : tag === "health"
          ? "health-advocate"
          : "environment-hero";
    const badge = badges.find((b) => b.id === badgeId)!;
    assert(`${tag} champion earned at 5 donations`, badge.earned);
  }
}

{
  // 4 education donations should NOT earn the badge
  const badges = computeBadges({
    rows: rowsOf(4, { cause_tag: "education" }),
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const ec = badges.find((b) => b.id === "education-champion")!;
  assert("education-champion NOT earned at 4 (needs 5)", !ec.earned);
  assert("progress reports partial count", ec.progress === 4);
}

// ── Cause: diverse-giver ─────────────────────────────────
console.log("\ncause: diverse-giver:");

{
  const tags: CauseTag[] = [
    "education",
    "health",
    "environment",
    "poverty",
    "animal_welfare",
  ];
  const rows = tags.map((t) =>
    row({ cause_tag: t, donation_date: `2026-01-0${tags.indexOf(t) + 1}` })
  );
  const badges = computeBadges({
    rows,
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const diverse = badges.find((b) => b.id === "diverse-giver")!;
  assert("diverse-giver earned at 5 distinct cause tags", diverse.earned);
}

{
  // Same cause 10 times — only 1 distinct tag, should NOT earn
  const badges = computeBadges({
    rows: rowsOf(10, { cause_tag: "education" }),
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const diverse = badges.find((b) => b.id === "diverse-giver")!;
  assert(
    "diverse-giver NOT earned when 10 donations to one cause",
    !diverse.earned,
  );
  assert(
    "progress reflects distinct-count, not total-count",
    diverse.progress === 1,
  );
}

{
  // Null cause_tag donations should not count toward distinct causes
  const rows = [
    row({ cause_tag: null, donation_date: "2026-01-01" }),
    row({ cause_tag: "education", donation_date: "2026-01-02" }),
    row({ cause_tag: "health", donation_date: "2026-01-03" }),
  ];
  const badges = computeBadges({
    rows,
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const diverse = badges.find((b) => b.id === "diverse-giver")!;
  assert(
    "null cause_tag donations don't count toward distinct-causes",
    diverse.progress === 2,
  );
}

// ── Impact: scope and recurring ──────────────────────────
console.log("\nimpact: scope tiers + recurring:");

{
  const scopes: DonationScope[] = ["local", "national", "global"];
  for (const scope of scopes) {
    const badges = computeBadges({
      rows: rowsOf(10, { scope }),
      salaryPercentage: null,
      streakMonths: 0,
      now: NOW,
    });
    const local = badges.find((b) => b.id === "local-hero")!;
    const global = badges.find((b) => b.id === "global-citizen")!;
    assert(
      `local-hero ${scope === "local" ? "earned" : "NOT earned"} for 10 ${scope} donations`,
      local.earned === (scope === "local"),
    );
    assert(
      `global-citizen ${scope === "global" ? "earned" : "NOT earned"} for 10 ${scope} donations`,
      global.earned === (scope === "global"),
    );
  }
}

{
  const badges = computeBadges({
    rows: rowsOf(3, { is_recurring: true }),
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const recurring = badges.find((b) => b.id === "recurring-supporter")!;
  assert("recurring-supporter earned at 3 recurring donations", recurring.earned);
}

{
  const badges = computeBadges({
    rows: [...rowsOf(5, { is_recurring: false }), ...rowsOf(2, { is_recurring: true })],
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const recurring = badges.find((b) => b.id === "recurring-supporter")!;
  assert(
    "recurring-supporter NOT earned at 2 recurring (non-recurring don't count)",
    !recurring.earned,
  );
  assert(
    "progress reflects recurring count only, not total",
    recurring.progress === 2,
  );
}

// ── Sort: earned first ───────────────────────────────────
console.log("\nsort: earned first, stable within groups:");

{
  const badges = computeBadges({
    rows: rowsOf(10, { cause_tag: "education" }),
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  const firstUnearnedIdx = badges.findIndex((b) => !b.earned);
  const lastEarnedIdx = badges
    .map((b, i) => (b.earned ? i : -1))
    .filter((i) => i >= 0)
    .pop()!;
  assert(
    "all earned badges come before all unearned",
    firstUnearnedIdx === -1 || firstUnearnedIdx > lastEarnedIdx,
  );
}

// ── Pending rows ignored everywhere ──────────────────────
console.log("\npending rows are ignored for all counts:");

{
  const badges = computeBadges({
    rows: rowsOf(10, { status: "pending" }),
    salaryPercentage: null,
    streakMonths: 0,
    now: NOW,
  });
  assert(
    "no badges earned when all rows are pending",
    badges.every((b) => !b.earned),
  );
}

// ── Summary ──────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
