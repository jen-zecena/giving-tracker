/**
 * Every.org API client tests (DP-063).
 * Run with: npx tsx tests/every-org.test.ts
 *
 * Strategy:
 *   1. Pure mapper + helper tests run against committed fixture JSON
 *      (recorded once from the live API; see tests/fixtures/every-org/).
 *      These give fast, deterministic coverage of the response → our
 *      Nonprofit shape translation.
 *
 *   2. HTTP-path tests stub global.fetch so we can assert error
 *      translation (404 → EveryOrgNotFoundError, 429 → rate-limit,
 *      5xx → generic EveryOrgError) without hitting the network.
 *
 * The live endpoint is intentionally NOT exercised here — the smoke
 * test happens manually before PR (see PR description).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  EveryOrgConfigError,
  EveryOrgError,
  EveryOrgNotFoundError,
  EveryOrgRateLimitError,
  formatEin,
  getEveryOrgBySlug,
  mapCauseCategoriesToNonprofitCategories,
  mapDetailToNonprofit,
  mapSearchResultToNonprofit,
  mapTagsToCategories,
  parseLocation,
  searchEveryOrg,
  type EveryOrgDetailResponse,
  type EveryOrgSearchResponse,
} from "../src/lib/every-org";

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

function loadFixture<T>(file: string): T {
  const path = join(__dirname, "fixtures/every-org", file);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

// Ensure we have the env var for the live-path tests (stubbed fetch
// never sees it, but requireKey() runs before fetch does).
process.env.EVERY_ORG_PUBLIC_KEY ??= "pk_test_fixture";

const searchFixture = loadFixture<EveryOrgSearchResponse>("search-water.json");
const detailFixture = loadFixture<EveryOrgDetailResponse>("nonprofit-solea-water.json");

// ── formatEin ─────────────────────────────────────────────────────────
console.log("\nformatEin:");

assert("formats 9-digit string to NN-NNNNNNN", formatEin("990382020") === "99-0382020");
assert("leaves already-dashed EIN alone (dashes preserved)", formatEin("13-1635294") === "13-1635294");
assert("strips non-digits then formats", formatEin("99.0382020") === "99-0382020");
assert("returns raw input if length != 9", formatEin("12345") === "12345");
assert("handles empty string", formatEin("") === "");

// ── parseLocation ─────────────────────────────────────────────────────
console.log("\nparseLocation:");

assert(
  "splits 'CITY, STATE' into title-cased city + upper state",
  (() => {
    const l = parseLocation("ST LOUIS, MO");
    return l.city === "St Louis" && l.state === "MO" && l.country === "United States";
  })(),
);
assert(
  "handles single-word cities",
  (() => {
    const l = parseLocation("CHICAGO, IL");
    return l.city === "Chicago" && l.state === "IL";
  })(),
);
assert(
  "empty/null input → blank city+state, fixed country",
  (() => {
    const a = parseLocation(undefined);
    const b = parseLocation(null);
    const c = parseLocation("");
    return (
      a.city === "" && b.city === "" && c.city === "" && a.country === "United States"
    );
  })(),
);
assert(
  "handles missing state gracefully",
  (() => {
    const l = parseLocation("PORTLAND");
    return l.city === "Portland" && l.state === "";
  })(),
);

// ── mapTagsToCategories (search response path) ────────────────────────
console.log("\nmapTagsToCategories:");

assert(
  "maps known tags to our categories",
  JSON.stringify(mapTagsToCategories(["education", "health", "animals"])) ===
    JSON.stringify(["Education", "Health", "Animal Welfare"]),
);
assert(
  "case-insensitive",
  JSON.stringify(mapTagsToCategories(["EDUCATION"])) === JSON.stringify(["Education"]),
);
assert(
  "drops unrecognized tags",
  mapTagsToCategories(["made-up-tag", "education"]).length === 1,
);
assert(
  "deduplicates when multiple tags map to the same category",
  JSON.stringify(mapTagsToCategories(["animals", "wildlife"])) ===
    JSON.stringify(["Animal Welfare"]),
);
assert("returns empty array for empty input", mapTagsToCategories([]).length === 0);

// ── mapCauseCategoriesToNonprofitCategories (detail response path) ────
console.log("\nmapCauseCategoriesToNonprofitCategories:");

assert(
  "maps causeCategory codes to our categories",
  JSON.stringify(mapCauseCategoriesToNonprofitCategories(["ENVIRONMENT", "HUMAN_SERVICES"])) ===
    JSON.stringify(["Environment", "Community"]),
);
assert(
  "deduplicates",
  JSON.stringify(mapCauseCategoriesToNonprofitCategories(["ARTS", "CULTURE"])) ===
    JSON.stringify(["Arts & Culture"]),
);
assert(
  "ignores unknown codes",
  mapCauseCategoriesToNonprofitCategories(["WHAT_IS_THIS"]).length === 0,
);

// ── mapSearchResultToNonprofit ────────────────────────────────────────
console.log("\nmapSearchResultToNonprofit:");

const firstSearchHit = searchFixture.nonprofits[0];
const mappedSearch = mapSearchResultToNonprofit(firstSearchHit);

assert("id comes from slug", mappedSearch.id === firstSearchHit.slug);
assert("ein is canonicalized", mappedSearch.ein === "99-0382020");
assert("name passes through", mappedSearch.name === firstSearchHit.name);
assert(
  "mission + description both populated from `description`",
  mappedSearch.mission === firstSearchHit.description &&
    mappedSearch.description === firstSearchHit.description,
);
assert("location parsed from 'ST LOUIS, MO'", mappedSearch.location.city === "St Louis");
assert("donationUrl points at Every.org profile", mappedSearch.donationUrl === firstSearchHit.profileUrl);
assert("verified defaults true for Every.org listings", mappedSearch.verified === true);
assert("flagged defaults false, no flags", mappedSearch.flagged === false && mappedSearch.flagCount === 0);
assert("ratings empty (Every.org doesn't provide)", mappedSearch.ratings.length === 0);
assert(
  "tags preserved (agriculture + humans)",
  mappedSearch.tags.join(",") === "agriculture,humans",
);
assert(
  "categories mapped from tags (agriculture → Environment, humans → Community)",
  mappedSearch.category.includes("Environment") && mappedSearch.category.includes("Community"),
);

// Missing-field resilience: search hits without description/tags/websiteUrl
const sparseSearch = mapSearchResultToNonprofit({
  ein: "123456789",
  name: "Sparse",
  profileUrl: "https://every.org/sparse",
  description: "",
  slug: "sparse",
});
assert("sparse search hit: mission/description default to empty string", sparseSearch.mission === "");
assert("sparse search hit: tags default to []", sparseSearch.tags.length === 0);
assert("sparse search hit: category defaults to []", sparseSearch.category.length === 0);
assert(
  "sparse search hit: website falls back to profileUrl when websiteUrl absent",
  sparseSearch.website === "https://every.org/sparse",
);

// ── mapDetailToNonprofit ──────────────────────────────────────────────
console.log("\nmapDetailToNonprofit:");

const mappedDetail = mapDetailToNonprofit(detailFixture);

assert("id comes from primarySlug", mappedDetail.id === "solea-water");
assert("ein canonicalized", mappedDetail.ein === "99-0382020");
assert(
  "subcategory from nteeCodeMeaning.decileMeaning",
  mappedDetail.subcategory === "Agricultural Programs",
);
assert(
  "categories mapped from nonprofitTags.causeCategory",
  mappedDetail.category.includes("Environment") && mappedDetail.category.includes("Community"),
);
assert(
  "tags come from nonprofitTags.tagName",
  mappedDetail.tags.join(",") === "agriculture,humans",
);
assert(
  "description non-empty (falls back to short description when descriptionLong null)",
  mappedDetail.description.length > 0,
);

// Detail resilience: construct a sparse detail payload (all optional
// fields null/missing) and confirm the mapper never throws and never
// produces undefined for required Nonprofit fields.
const sparseDetail = mapDetailToNonprofit({
  data: {
    nonprofit: {
      id: "abc",
      name: "Minimal Org",
      ein: "000000000",
      primarySlug: "minimal-org",
      profileUrl: "https://every.org/minimal-org",
    },
  },
});
assert("sparse detail: mission defaults to empty", sparseDetail.mission === "");
assert("sparse detail: description defaults to empty", sparseDetail.description === "");
assert("sparse detail: category []", sparseDetail.category.length === 0);
assert("sparse detail: tags []", sparseDetail.tags.length === 0);
assert("sparse detail: subcategory undefined", sparseDetail.subcategory === undefined);
assert(
  "sparse detail: website falls back to profileUrl",
  sparseDetail.website === "https://every.org/minimal-org",
);

// ── HTTP: error translation ───────────────────────────────────────────
const originalFetch = global.fetch;

function stubFetch(fn: typeof fetch) {
  global.fetch = fn as typeof fetch;
}
function restoreFetch() {
  global.fetch = originalFetch;
}

function mockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function expectThrow<T>(
  label: string,
  op: () => Promise<T>,
  matches: (err: unknown) => boolean,
) {
  try {
    await op();
    assert(label, false, "no error thrown");
  } catch (err) {
    assert(label, matches(err));
  }
}

async function runAsyncTests() {
  console.log("\nHTTP error translation:");

  // 404 → EveryOrgNotFoundError
  stubFetch(async () => mockResponse(404, { message: "Nonprofit not found" }));
  await expectThrow(
    "404 → EveryOrgNotFoundError with message",
    () => getEveryOrgBySlug("does-not-exist"),
    (err) => err instanceof EveryOrgNotFoundError && /not found/i.test((err as Error).message),
  );

  // 429 → EveryOrgRateLimitError
  stubFetch(async () => mockResponse(429, { message: "Rate limit exceeded" }));
  await expectThrow(
    "429 → EveryOrgRateLimitError",
    () => searchEveryOrg("water"),
    (err) => err instanceof EveryOrgRateLimitError,
  );

  // 500 → generic EveryOrgError
  stubFetch(async () => mockResponse(500, { message: "boom" }));
  await expectThrow(
    "500 → generic EveryOrgError with status",
    () => searchEveryOrg("water"),
    (err) => err instanceof EveryOrgError && (err as EveryOrgError).status === 500,
  );

  // Happy-path search uses stubbed fetch
  stubFetch(async () => mockResponse(200, searchFixture));
  const results = await searchEveryOrg("water", { take: 3 });
  assert("happy-path search returns mapped Nonprofit[]", results.length === searchFixture.nonprofits.length);
  assert("happy-path: first result has canonical EIN", results[0].ein === "99-0382020");

  // Happy-path detail
  stubFetch(async () => mockResponse(200, detailFixture));
  const detail = await getEveryOrgBySlug("solea-water");
  assert("happy-path detail returns single Nonprofit", detail.id === "solea-water");

  // Empty query short-circuits without a network call
  let fetchCalls = 0;
  stubFetch(async () => {
    fetchCalls++;
    return mockResponse(200, { nonprofits: [] });
  });
  const emptyResults = await searchEveryOrg("   ");
  assert("empty search query returns [] and does not call fetch", emptyResults.length === 0 && fetchCalls === 0);

  restoreFetch();

  // ── Missing env var → EveryOrgConfigError ───────────────────────────
  console.log("\nconfig:");

  const savedKey = process.env.EVERY_ORG_PUBLIC_KEY;
  delete process.env.EVERY_ORG_PUBLIC_KEY;
  await expectThrow(
    "missing EVERY_ORG_PUBLIC_KEY → EveryOrgConfigError",
    () => searchEveryOrg("anything"),
    (err) => err instanceof EveryOrgConfigError,
  );
  process.env.EVERY_ORG_PUBLIC_KEY = savedKey;
}

runAsyncTests().then(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
