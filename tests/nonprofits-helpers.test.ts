/**
 * DP-061 — Pure helper tests for the nonprofit detail page.
 * Run with: npx tsx tests/nonprofits-helpers.test.ts
 *
 * Covers:
 *   - getAverageRating (mean across sources, normalised to 0-100,
 *     handles empty + pathological maxScore)
 *   - getRatingBandToken (Figma 95/85/75 thresholds → semantic tokens)
 *   - formatRevenue ($M, $K, raw, null)
 */

import {
  formatRevenue,
  getAverageRating,
  getRatingBandToken,
} from "../src/lib/queries/nonprofits-helpers";

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

function approxEq(name: string, got: number, want: number, eps = 1e-6) {
  const ok = Math.abs(got - want) < eps;
  assert(name, ok, ok ? undefined : `got ${got}, want ${want}`);
}

// ── getAverageRating ──────────────────────────────────────
console.log("getAverageRating");
{
  approxEq("empty list returns 0", getAverageRating([]), 0);

  approxEq(
    "single source: 92/100 → 92",
    getAverageRating([
      { source: "CN", rating: "Four Stars", score: 92, maxScore: 100, lastUpdated: "2026-01-01" },
    ]),
    92
  );

  approxEq(
    "two sources: (92/100 + 88/100) / 2 → 90",
    getAverageRating([
      { source: "CN", rating: "Four Stars", score: 92, maxScore: 100, lastUpdated: "2026-01-01" },
      { source: "GS", rating: "Gold", score: 88, maxScore: 100, lastUpdated: "2026-01-01" },
    ]),
    90
  );

  approxEq(
    "different maxScores normalise correctly: 5/5 + 50/100 → (100+50)/2 = 75",
    getAverageRating([
      { source: "A", rating: "—", score: 5, maxScore: 5, lastUpdated: "2026-01-01" },
      { source: "B", rating: "—", score: 50, maxScore: 100, lastUpdated: "2026-01-01" },
    ]),
    75
  );

  // Pathological inputs shouldn't blow up — defensive guard returns
  // a finite number instead of NaN/Infinity.
  approxEq(
    "skips zero-maxScore entries instead of dividing by zero",
    getAverageRating([
      { source: "A", rating: "—", score: 90, maxScore: 100, lastUpdated: "2026-01-01" },
      { source: "B", rating: "—", score: 1, maxScore: 0, lastUpdated: "2026-01-01" },
    ]),
    // 90 contribution / 2 sources = 45 (we still divide by total length;
    // see helper docstring — the bad source contributes 0)
    45
  );
}

// ── getRatingBandToken ────────────────────────────────────
console.log("\ngetRatingBandToken");
{
  // Boundary tests pin the Figma 95/85/75 thresholds.
  assert("95% → success", getRatingBandToken(95, 100) === "success");
  assert("100% → success", getRatingBandToken(100, 100) === "success");
  assert("94.99% → info (just under success boundary)", getRatingBandToken(94, 100) === "info");
  assert("85% → info", getRatingBandToken(85, 100) === "info");
  assert("84% → warning (just under info boundary)", getRatingBandToken(84, 100) === "warning");
  assert("75% → warning", getRatingBandToken(75, 100) === "warning");
  assert("74% → muted (just under warning boundary)", getRatingBandToken(74, 100) === "muted");
  assert("50% → muted", getRatingBandToken(50, 100) === "muted");
  assert("0% → muted", getRatingBandToken(0, 100) === "muted");

  // Different scales should map identically to percentages.
  assert(
    "5/5 → success (handles non-100 scales)",
    getRatingBandToken(5, 5) === "success"
  );
  assert("4/5 (80%) → warning", getRatingBandToken(4, 5) === "warning");

  // Pathological: maxScore 0 returns muted (defensive).
  assert(
    "maxScore 0 returns muted instead of dividing by zero",
    getRatingBandToken(10, 0) === "muted"
  );
}

// ── formatRevenue ─────────────────────────────────────────
console.log("\nformatRevenue");
{
  assert("null → null", formatRevenue(null) === null);
  assert("NaN → null", formatRevenue(NaN) === null);
  assert("Infinity → null", formatRevenue(Infinity) === null);

  assert("$2.9B-ish → $2900.0M", formatRevenue(2_900_000_000) === "$2900.0M");
  assert("$700M → $700.0M", formatRevenue(700_000_000) === "$700.0M");
  assert("$1.2M → $1.2M", formatRevenue(1_200_000) === "$1.2M");
  assert("exactly $1M → $1.0M", formatRevenue(1_000_000) === "$1.0M");
  assert("$999K (under 1M) → $999K", formatRevenue(999_000) === "$999K");
  assert("$5,500 → $6K (rounds to nearest)", formatRevenue(5_500) === "$6K");
  assert("$999 (under 1K) → $999", formatRevenue(999) === "$999");
  assert("0 → $0", formatRevenue(0) === "$0");
}

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
