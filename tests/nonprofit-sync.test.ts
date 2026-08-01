/**
 * DP-064 — Pure tests for the nonprofit-sync layer.
 * Run with: npx tsx tests/nonprofit-sync.test.ts
 *
 * Covers the bits that don't talk to Supabase or Every.org:
 *   - mapEveryOrgToDbInsert: Every.org `Nonprofit` → DB row shape, with
 *     correct null-handling for empty fields and a synthesised
 *     synced_at stamp.
 *   - formatLocation: structured city/state/country → flat text.
 *   - pickLogoUrl (DP-064 extension to DP-063 every-org client):
 *     prefers explicit URL, falls back to a Cloudinary-built URL,
 *     null when neither is usable.
 *
 * The Supabase upsert + Every.org fetch are exercised end-to-end by
 * the manual checklist in the PR description.
 */

import {
  buildEveryOrgImageUrl,
  pickCoverUrl,
  pickLogoUrl,
} from "../src/lib/every-org";
import {
  formatLocation,
  mapEveryOrgToDbInsert,
} from "../src/lib/actions/nonprofit-sync-helpers";
import type { Nonprofit } from "../src/lib/fixtures/nonprofits";

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

function np(overrides: Partial<Nonprofit> = {}): Nonprofit {
  return {
    id: "every-org-slug",
    ein: "12-3456789",
    name: "Test Org",
    mission: "A mission",
    description: "A description",
    category: ["Health"],
    tags: ["medical"],
    location: { city: "Oakland", state: "CA", country: "USA" },
    website: "https://example.org",
    donationUrl: "https://every.org/test-org",
    logoUrl: "https://res.cloudinary.com/everydotorg/image/upload/abc123",
    coverImageUrl: "https://res.cloudinary.com/everydotorg/image/upload/cover_xyz",
    verified: true,
    flagged: false,
    flagCount: 0,
    ratings: [],
    ...overrides,
  };
}

// ── pickLogoUrl ───────────────────────────────────────────
console.log("pickLogoUrl");
{
  assert(
    "explicit URL wins over cloudinary id",
    pickLogoUrl("https://example.org/logo.png", "abc123") ===
      "https://example.org/logo.png"
  );
  {
    const got = pickLogoUrl(undefined, "abc123");
    assert(
      "builds a Cloudinary URL from id when no explicit URL",
      typeof got === "string" && got.includes("cloudinary") && got.endsWith("abc123")
    );
  }
  assert(
    "returns null when both inputs are empty",
    pickLogoUrl(undefined, undefined) === null
  );
  assert(
    "treats empty string explicit URL as missing",
    pickLogoUrl("", "abc123")?.includes("abc123") === true
  );
  assert(
    "treats empty cloudinary id as missing",
    pickLogoUrl(undefined, "") === null
  );
  assert(
    "treats whitespace-only cloudinary id as missing",
    pickLogoUrl(undefined, "   ") === null
  );
}

console.log("\npickCoverUrl");
{
  {
    const got = pickCoverUrl(undefined, "cover_abc");
    assert(
      "builds a 16:9 Cloudinary URL from id (different transform than logo)",
      typeof got === "string" &&
        got.includes("ar_16:9") &&
        got.includes("w_640") &&
        got.endsWith("cover_abc")
    );
  }
  {
    const got = pickLogoUrl(undefined, "logo_abc");
    assert(
      "logo URL still uses square transform (no regression)",
      typeof got === "string" && got.includes("ar_1:1") && got.endsWith("logo_abc")
    );
  }
  assert(
    "explicit cover URL wins over cloudinary id",
    pickCoverUrl("https://cdn.example/cover.jpg", "cover_abc") ===
      "https://cdn.example/cover.jpg"
  );
  assert("returns null when both inputs missing", pickCoverUrl(undefined, undefined) === null);
}

console.log("\nbuildEveryOrgImageUrl");
{
  // The generic builder is what `pickLogoUrl` and `pickCoverUrl`
  // delegate to. Pin its kind switching so a future "thumbnail" preset
  // can be added without rewiring the call sites.
  assert(
    "kind=logo produces square crop",
    buildEveryOrgImageUrl(undefined, "x", "logo")?.includes("ar_1:1") === true
  );
  assert(
    "kind=cover produces 16:9 crop",
    buildEveryOrgImageUrl(undefined, "x", "cover")?.includes("ar_16:9") === true
  );
  assert(
    "kind=cover prefers explicit URL too",
    buildEveryOrgImageUrl("https://x/y.png", "x", "cover") === "https://x/y.png"
  );
}

// ── formatLocation ────────────────────────────────────────
console.log("\nformatLocation");
{
  eq(
    "all parts present",
    formatLocation({ city: "Oakland", state: "CA", country: "USA" }),
    "Oakland, CA, USA"
  );
  eq(
    "trims surrounding whitespace on each part",
    formatLocation({ city: "  Oakland ", state: " CA ", country: " USA " }),
    "Oakland, CA, USA"
  );
  eq(
    "skips empty parts (no stray comma)",
    formatLocation({ city: "Oakland", state: "", country: "USA" }),
    "Oakland, USA"
  );
  eq("null input → null", formatLocation(null), null);
  eq("undefined input → null", formatLocation(undefined), null);
  eq(
    "all-empty input → null",
    formatLocation({ city: "", state: "", country: "" }),
    null
  );
}

// ── mapEveryOrgToDbInsert ─────────────────────────────────
console.log("\nmapEveryOrgToDbInsert");
{
  const before = Date.now();
  const row = mapEveryOrgToDbInsert(np());
  const after = Date.now();

  eq("ein passes through", row.ein, "12-3456789");
  eq("name passes through", row.name, "Test Org");
  eq("mission passes through", row.mission, "A mission");
  eq("category[] passes through", row.category, ["Health"]);
  eq("tags[] passes through", row.tags, ["medical"]);
  eq(
    "structured location collapses to flat text",
    row.location,
    "Oakland, CA, USA"
  );
  eq("website passes through", row.website, "https://example.org");
  eq(
    "donationUrl maps to donation_url",
    row.donation_url,
    "https://every.org/test-org"
  );
  eq("verified passes through", row.verified, true);
  eq(
    "logoUrl maps to logo_url",
    row.logo_url,
    "https://res.cloudinary.com/everydotorg/image/upload/abc123"
  );
  eq(
    "coverImageUrl maps to cover_image_url",
    row.cover_image_url,
    "https://res.cloudinary.com/everydotorg/image/upload/cover_xyz"
  );
  eq("description passes through", row.description, "A description");

  const stamp = Date.parse(row.synced_at);
  assert(
    "synced_at is an ISO timestamp at-or-after call start",
    !Number.isNaN(stamp) && stamp >= before && stamp <= after + 100
  );
}

{
  // Empty / whitespace strings normalise to null so DB columns reflect
  // "no data" rather than a hollow value.
  const row = mapEveryOrgToDbInsert(
    np({ mission: "  ", description: "", website: "", donationUrl: "" })
  );
  eq("blank mission → null", row.mission, null);
  eq("empty description → null", row.description, null);
  eq("empty website → null", row.website, null);
  eq("empty donation_url → null", row.donation_url, null);
}

{
  // Missing logoUrl on the input → null (renderer falls back to icon).
  const row = mapEveryOrgToDbInsert(np({ logoUrl: undefined }));
  eq("missing logoUrl → null", row.logo_url, null);
}

{
  // Missing coverImageUrl → null (renderer falls back to gradient).
  const row = mapEveryOrgToDbInsert(np({ coverImageUrl: undefined }));
  eq("missing coverImageUrl → null", row.cover_image_url, null);
}

{
  // Repeated mapping yields identical row except synced_at, which is
  // the upsert dedupe key's freshness signal — must always advance.
  const a = mapEveryOrgToDbInsert(np());
  // Tiny delay so the timestamp ms differs.
  const start = Date.now();
  while (Date.now() === start) { /* spin briefly */ }
  const b = mapEveryOrgToDbInsert(np());
  assert("ein matches across calls (dedupe key stable)", a.ein === b.ein);
  assert("synced_at advances on re-map", b.synced_at >= a.synced_at);
}

// ── Report ────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
