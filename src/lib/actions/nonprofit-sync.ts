"use server";

/**
 * Server actions for nonprofit data sync (DP-064).
 *
 * The flow:
 *   1. User types a query in the directory.
 *   2. The directory calls `syncNonprofitsFromSearch(query)` from a
 *      transition.
 *   3. We hit Every.org for live results, map them to our DB shape,
 *      and upsert into `nonprofits` keyed by EIN. The unique index on
 *      `nonprofits.ein` handles dedupe — repeated searches that return
 *      the same orgs just bump `synced_at` instead of inserting again.
 *   4. Return the upserted DB rows. The client renders those (so each
 *      card has a stable DB `id` to link the detail page at).
 *
 * `nonprofits` has admin-only INSERT/UPDATE policies, so we use the
 * service-role client. End users never write directly — they trigger
 * the sync, the action runs as service-role on their behalf with a
 * tightly bounded input (a search query), and Every.org's IRS-verified
 * data is the only thing that can land in the table.
 */

import "server-only";

import { searchEveryOrg } from "@/lib/every-org";
import type { Nonprofit as EveryOrgNonprofit } from "@/lib/fixtures/nonprofits";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Nonprofit as DbNonprofit } from "@/types";

import { mapEveryOrgToDbInsert } from "./nonprofit-sync-helpers";

export type ActionResult<T = null> = {
  error?: string;
  data?: T;
};

/**
 * Searches Every.org and upserts every result into our `nonprofits`
 * table. Returns the resulting DB rows so the directory client can
 * render them with stable DB ids.
 *
 * Empty / whitespace queries short-circuit to an empty array; the
 * directory uses that to render the empty-state without a round-trip.
 */
export async function syncNonprofitsFromSearch(
  query: string,
): Promise<ActionResult<DbNonprofit[]>> {
  const trimmed = typeof query === "string" ? query.trim() : "";
  if (!trimmed) return { data: [] };

  let results: EveryOrgNonprofit[];
  try {
    results = await searchEveryOrg(trimmed, { take: 20 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[nonprofit-sync] every.org search failed", message);
    return { error: `Search failed: ${message}` };
  }

  if (results.length === 0) return { data: [] };

  const inserts = results.map(mapEveryOrgToDbInsert);
  const supabase = createServiceRoleClient();

  // Upsert by `ein` (UNIQUE) — dedupes across users searching the same
  // org. We update *every* column on conflict so a stale row picks up
  // any new logo / tags / website Every.org has since added; the
  // tradeoff is that admin-edited rows can be overwritten by a sync,
  // which is fine for the freemium tier where we don't have an editor.
  const { data, error } = await supabase
    .from("nonprofits")
    .upsert(inserts, { onConflict: "ein" })
    .select("*");

  if (error) {
    console.error("[nonprofit-sync] upsert failed", error);
    return { error: `Failed to save results: ${error.message}` };
  }

  // The action returns the freshly upserted rows directly, so the
  // client never re-reads from cache for this batch. Stale Every.org
  // results from a re-search clear naturally on the 1h revalidate
  // window the fetch wrapper sets in `lib/every-org.ts`.

  return { data: (data ?? []) as DbNonprofit[] };
}
