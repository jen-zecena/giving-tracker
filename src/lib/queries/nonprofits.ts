import "server-only";

/**
 * Read layer for the nonprofits surface (DP-060 directory + DP-061
 * detail). Currently reads from the static fixture defined in
 * `src/lib/data/nonprofits-fixture.ts` per the sprint plan ("fixture
 * data first; DP-064 swaps to Every.org sync").
 *
 * Keeping this in its own module means the swap to a real DB query in
 * DP-064 is a one-file change — page components never reach into the
 * fixture directly.
 */

import {
  NONPROFITS_FIXTURE,
  type NonprofitWithDetails,
} from "@/lib/data/nonprofits-fixture";

export type { NonprofitWithDetails };

/**
 * Returns the nonprofit with the given id, or `null` when no fixture
 * row matches. The detail page maps `null` to `notFound()` so the
 * Next.js 404 page renders.
 */
export async function getNonprofitById(
  id: string
): Promise<NonprofitWithDetails | null> {
  const found = NONPROFITS_FIXTURE.find((n) => n.id === id);
  return found ?? null;
}

/**
 * Lists every fixture nonprofit. Used by the directory port (DP-060)
 * and any other surface that wants the full set; exported here so the
 * directory PR doesn't need to also import from `data/`.
 */
export async function listNonprofits(): Promise<NonprofitWithDetails[]> {
  return NONPROFITS_FIXTURE;
}
