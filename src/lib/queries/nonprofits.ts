import "server-only";

/**
 * Read layer for the nonprofits surface (DP-060 directory + DP-061
 * detail). Reads from the live `nonprofits` table in Supabase — the
 * DP-064 sync action keeps the table populated as users search.
 *
 * The detail page only ever lands here via a click from the directory
 * (which just upserted the row), so a "not found" result genuinely
 * means the row is gone (admin deleted, FK cascade, …) — we surface
 * that as `null` so the page can `notFound()`.
 */

import { createClient } from "@/lib/supabase/server";
import type { Nonprofit } from "@/types";

/**
 * Optional view-only fields the detail page renders. Kept on the read
 * type rather than forcing every page to special-case nullness — the
 * DB doesn't store ratings or a structured location yet, so these
 * always come back empty/null in the wild. A future watchdog-rating
 * sync would flip them on without page changes.
 */
export type NonprofitRatingSource = {
  source: string;
  rating: string;
  score: number;
  maxScore: number;
  lastUpdated: string;
};

export type NonprofitWithDetails = Nonprofit & {
  location_detail: { city: string; state: string; country: string } | null;
  subcategory: string | null;
  verification_date: string | null;
  ratings: NonprofitRatingSource[];
};

/**
 * Returns the nonprofit with the given DB id, or `null` when the row
 * doesn't exist (or isn't visible — RLS allows read for any signed-in
 * user, so the only no-row cases are deletion and a bogus id). The
 * detail page maps `null` to `notFound()`.
 */
export async function getNonprofitById(
  id: string,
): Promise<NonprofitWithDetails | null> {
  if (!id || typeof id !== "string") return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nonprofits")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[queries/nonprofits] getNonprofitById failed", error);
    return null;
  }
  if (!data) return null;

  return decorateForDetail(data as Nonprofit);
}

/**
 * Lists every nonprofit currently in the table, newest sync first.
 * Used as the directory's initial render before the user types — keeps
 * the page non-empty if previous searches have populated rows. Capped
 * to a generous page size; the directory has its own search box.
 */
export async function listNonprofits(
  limit = 60,
): Promise<NonprofitWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nonprofits")
    .select("*")
    .order("synced_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[queries/nonprofits] listNonprofits failed", error);
    return [];
  }
  return ((data ?? []) as Nonprofit[]).map(decorateForDetail);
}

/**
 * Fold the flat `location` text into the structured shape the detail
 * page uses. Best-effort: if the string isn't "City, ST, Country" the
 * structured field stays null and the page falls back to the raw line.
 */
function decorateForDetail(n: Nonprofit): NonprofitWithDetails {
  return {
    ...n,
    location_detail: parseLocationText(n.location),
    subcategory: null,
    verification_date: n.synced_at,
    ratings: [],
  };
}

function parseLocationText(
  raw: string | null,
): { city: string; state: string; country: string } | null {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const [city, state, country] = parts;
  return {
    city: city ?? "",
    state: state ?? "",
    country: country ?? "",
  };
}
