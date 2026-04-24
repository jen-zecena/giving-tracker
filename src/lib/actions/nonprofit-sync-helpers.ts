/**
 * Pure mappers for the nonprofit-sync action (DP-064). Lives outside
 * the `"use server"` module so the row shape is unit-testable without
 * touching Supabase.
 */

import type { Nonprofit as EveryOrgNonprofit } from "@/lib/fixtures/nonprofits";

/**
 * Row shape for `supabase.from("nonprofits").upsert(...)`. Mirrors the
 * DB columns from the migration with `synced_at` stamped to "now" so
 * a repeated upsert advances the freshness clock.
 */
export type NonprofitDbInsert = {
  ein: string;
  name: string;
  mission: string | null;
  category: string[];
  location: string | null;
  website: string | null;
  donation_url: string | null;
  verified: boolean;
  logo_url: string | null;
  description: string | null;
  tags: string[];
  synced_at: string;
};

/**
 * Convert the in-memory Every.org `Nonprofit` (DP-063 shape) into a
 * DB-shaped row ready for upsert. The structured location is collapsed
 * to a single text field — that's all the schema currently stores; the
 * detail page reconstructs a "City, ST, Country" line if it has one.
 *
 * Empty strings are normalised to `null` so the column reflects "no
 * data" rather than a hollow value (helps callers gate UI on nullness).
 */
export function mapEveryOrgToDbInsert(
  n: EveryOrgNonprofit,
): NonprofitDbInsert {
  return {
    ein: n.ein,
    name: n.name,
    mission: emptyToNull(n.mission),
    category: n.category as string[],
    location: formatLocation(n.location),
    website: emptyToNull(n.website),
    donation_url: emptyToNull(n.donationUrl),
    verified: n.verified,
    logo_url: n.logoUrl ?? null,
    description: emptyToNull(n.description),
    tags: n.tags,
    synced_at: new Date().toISOString(),
  };
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Render the Every.org structured location back to "City, ST, Country"
 * so the DB's flat `location` text column carries the same readable
 * string the page shows. Skips empty parts so a missing state doesn't
 * leave a stray comma.
 */
export function formatLocation(
  loc: { city: string; state: string; country: string } | null | undefined,
): string | null {
  if (!loc) return null;
  const parts = [loc.city, loc.state, loc.country]
    .map((p) => p?.trim() ?? "")
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  return parts.join(", ");
}
