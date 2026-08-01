import { PageHeader } from "@/components/nav/page-header";
import { listNonprofits } from "@/lib/queries/nonprofits";

import { NonprofitsClient } from "./nonprofits-client";

/**
 * Directory landing — server-renders the most recently synced rows so
 * the page is non-empty on first load. Subsequent searches run live
 * against Every.org via the `syncNonprofitsFromSearch` action and
 * upsert into the same table.
 */
export default async function NonprofitsPage() {
  const initial = await listNonprofits();

  return (
    <>
      <PageHeader
        title="Nonprofit Directory"
        subtitle={
          initial.length === 0
            ? "Search for an organization to get started"
            : `${initial.length} verified organizations`
        }
        showAddButton={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <NonprofitsClient initial={initial} />
      </div>
    </>
  );
}
