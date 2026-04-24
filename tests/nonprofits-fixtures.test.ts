/**
 * Nonprofit fixture helper tests (DP-060).
 * Run with: npx tsx tests/nonprofits-fixtures.test.ts
 *
 * Covers the pure pieces of src/lib/fixtures/nonprofits.ts that power the
 * NonprofitDirectory page:
 *   - getAverageRating — simple mean over ratings[]
 *   - searchNonprofits — text search + category/verified/minRating filters
 *
 * These helpers run client-side against static fixture data until DP-064 swaps
 * in the Every.org-backed table, so pure-function tests are the entire surface.
 */
import {
  MOCK_NONPROFITS,
  NONPROFIT_CATEGORIES,
  getAverageRating,
  getNonprofitById,
  searchNonprofits,
} from "../src/lib/fixtures/nonprofits";

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

// ── fixture sanity ────────────────────────────────────────
console.log("\nfixture sanity:");

assert(
  "MOCK_NONPROFITS has at least 10 entries",
  MOCK_NONPROFITS.length >= 10,
  `got ${MOCK_NONPROFITS.length}`,
);
assert(
  "all ids are unique",
  new Set(MOCK_NONPROFITS.map((n) => n.id)).size === MOCK_NONPROFITS.length,
);
assert(
  "all eins are unique",
  new Set(MOCK_NONPROFITS.map((n) => n.ein)).size === MOCK_NONPROFITS.length,
);
assert(
  "every category referenced in a fixture is in NONPROFIT_CATEGORIES",
  MOCK_NONPROFITS.every((n) =>
    n.category.every((c) => (NONPROFIT_CATEGORIES as readonly string[]).includes(c)),
  ),
);
assert(
  "every donationUrl is absolute http(s)",
  MOCK_NONPROFITS.every((n) => /^https?:\/\//.test(n.donationUrl)),
);
assert(
  "at least one fixture has ratings (to exercise rating UI)",
  MOCK_NONPROFITS.some((n) => n.ratings.length > 0),
);
assert(
  "at least one fixture has NO ratings (to exercise empty-ratings branch)",
  MOCK_NONPROFITS.some((n) => n.ratings.length === 0),
);

// ── getAverageRating ──────────────────────────────────────
console.log("\ngetAverageRating:");

assert(
  "returns 0 when ratings is empty",
  getAverageRating({
    ...MOCK_NONPROFITS[0],
    ratings: [],
  }) === 0,
);
assert(
  "averages scores (not ratings strings)",
  getAverageRating({
    ...MOCK_NONPROFITS[0],
    ratings: [
      { source: "A", rating: "X", score: 80, maxScore: 100, lastUpdated: "2025-01-01" },
      { source: "B", rating: "Y", score: 100, maxScore: 100, lastUpdated: "2025-01-01" },
    ],
  }) === 90,
);
assert(
  "single-rating average equals that rating's score",
  getAverageRating({
    ...MOCK_NONPROFITS[0],
    ratings: [
      { source: "A", rating: "X", score: 73, maxScore: 100, lastUpdated: "2025-01-01" },
    ],
  }) === 73,
);

// ── searchNonprofits: text ────────────────────────────────
console.log("\nsearchNonprofits — text query:");

assert(
  "empty query returns all fixtures",
  searchNonprofits("").length === MOCK_NONPROFITS.length,
);
assert(
  "whitespace-only query returns all fixtures",
  searchNonprofits("   ").length === MOCK_NONPROFITS.length,
);
const wildlifeHits = searchNonprofits("wildlife");
assert(
  "case-insensitive match on name ('wildlife' matches 'World Wildlife Fund')",
  wildlifeHits.some((n) => n.name === "World Wildlife Fund"),
);
assert(
  "matches on mission text",
  searchNonprofits("drinking water").some((n) => n.name === "charity: water"),
);
assert(
  "matches on tag",
  searchNonprofits("blood-donation").some((n) => n.name === "American Red Cross"),
);
assert(
  "no match returns empty array",
  searchNonprofits("zzz-nothing-matches-this").length === 0,
);

// ── searchNonprofits: category filter ─────────────────────
console.log("\nsearchNonprofits — category filter:");

const envResults = searchNonprofits("", { category: ["Environment"] });
assert(
  "filters to nonprofits including the selected category",
  envResults.length > 0 && envResults.every((n) => n.category.includes("Environment")),
);
const multiCat = searchNonprofits("", { category: ["Environment", "Education"] });
assert(
  "multiple categories use OR (any match is kept)",
  multiCat.every((n) =>
    n.category.includes("Environment") || n.category.includes("Education"),
  ) && multiCat.length >= envResults.length,
);
assert(
  "empty category array is treated as 'no filter'",
  searchNonprofits("", { category: [] }).length === MOCK_NONPROFITS.length,
);

// ── searchNonprofits: verified filter ─────────────────────
console.log("\nsearchNonprofits — verified filter:");

assert(
  "verified: true drops unverified entries",
  searchNonprofits("", { verified: true }).every((n) => n.verified === true),
);
assert(
  "there IS an unverified fixture that gets dropped when verified:true",
  MOCK_NONPROFITS.some((n) => !n.verified) &&
    searchNonprofits("", { verified: true }).length < MOCK_NONPROFITS.length,
);
assert(
  "verified: undefined does not filter",
  searchNonprofits("", { verified: undefined }).length === MOCK_NONPROFITS.length,
);

// ── searchNonprofits: minRating filter ────────────────────
console.log("\nsearchNonprofits — minRating filter:");

const top = searchNonprofits("", { minRating: 95 });
assert(
  "minRating 95 keeps only avg >= 95",
  top.every((n) => getAverageRating(n) >= 95),
);
const good = searchNonprofits("", { minRating: 75 });
assert(
  "minRating 75 is more permissive than 95",
  good.length >= top.length,
);
assert(
  "minRating drops entries with no ratings (avg is 0)",
  searchNonprofits("", { minRating: 75 }).every((n) => n.ratings.length > 0),
);

// ── searchNonprofits: combined ────────────────────────────
console.log("\nsearchNonprofits — combined filters:");

const combined = searchNonprofits("health", {
  category: ["Health"],
  verified: true,
  minRating: 85,
});
assert(
  "combined: text + category + verified + minRating all apply",
  combined.length > 0 &&
    combined.every(
      (n) =>
        n.verified &&
        n.category.includes("Health") &&
        getAverageRating(n) >= 85,
    ),
);
assert(
  "combined never returns more than the narrowest single filter would",
  combined.length <= searchNonprofits("", { category: ["Health"] }).length,
);

// ── getNonprofitById ──────────────────────────────────────
console.log("\ngetNonprofitById:");

assert(
  "returns the matching fixture",
  getNonprofitById("np-001")?.name === "World Wildlife Fund",
);
assert(
  "returns undefined for unknown id",
  getNonprofitById("does-not-exist") === undefined,
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
