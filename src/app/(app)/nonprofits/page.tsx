import { listNonprofits } from "@/lib/queries/nonprofits";

import { NonprofitsClient } from "./nonprofits-client";

/**
 * Directory landing — server-renders the most recently synced rows so
 * the page is non-empty on first load. Subsequent searches run live
 * against Every.org via the `syncNonprofitsFromSearch` action and
 * upsert into the same table.
 *
 * Per the DS, this screen has no PageHeader — it leads with the dark
 * green search band rendered inside NonprofitsClient.
 */
export default async function NonprofitsPage() {
  const initial = await listNonprofits();

  return <NonprofitsClient initial={initial} />;
}
