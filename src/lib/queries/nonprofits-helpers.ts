/**
 * Pure helpers for the nonprofit detail view (DP-061). Lives outside
 * the page module so the math is unit-testable without mounting the
 * server component or loading the fixture.
 */

import type { NonprofitRatingSource } from "@/lib/queries/nonprofits";

/**
 * Average score across all rating sources, normalised to a 0-100 scale.
 * Matches the Figma `getAverageRating` helper: each source contributes
 * its `score / maxScore * 100` value; the result is the arithmetic mean.
 *
 * Returns `0` for an empty list so the caller can early-out without
 * dealing with NaN. The detail page only renders the rating callout
 * when `ratings.length > 0` anyway, so this is a defensive fallback.
 */
export function getAverageRating(
  ratings: ReadonlyArray<NonprofitRatingSource>
): number {
  if (ratings.length === 0) return 0;
  let total = 0;
  for (const r of ratings) {
    if (r.maxScore <= 0) continue; // skip pathological inputs rather than crash
    total += (r.score / r.maxScore) * 100;
  }
  return total / ratings.length;
}

/**
 * Rating-band → semantic theme token. The Figma source uses literal
 * Tailwind palette colors (`text-green-600`, `text-blue-600`, …). We
 * map them to the project's theme tokens so the page stays in sync
 * with the global palette.
 *
 * Bands match the Figma thresholds (95 / 85 / 75) so existing visual
 * comparisons hold.
 */
export type RatingBandToken = "success" | "info" | "warning" | "muted";

export function getRatingBandToken(
  score: number,
  maxScore: number
): RatingBandToken {
  if (maxScore <= 0) return "muted";
  const pct = (score / maxScore) * 100;
  if (pct >= 95) return "success";
  if (pct >= 85) return "info";
  if (pct >= 75) return "warning";
  return "muted";
}

/**
 * Format a fixture revenue (raw dollars) for the Quick Facts sidebar.
 * Matches the Figma display: "$2.9M". Values under $1M show one
 * decimal of "thousands" instead so a $1.2M-revenue feed item stays
 * readable next to a $400K one.
 */
export function formatRevenue(revenue: number | null): string | null {
  if (revenue == null || !Number.isFinite(revenue)) return null;
  if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M`;
  if (revenue >= 1_000) return `$${(revenue / 1_000).toFixed(0)}K`;
  return `$${revenue.toFixed(0)}`;
}
