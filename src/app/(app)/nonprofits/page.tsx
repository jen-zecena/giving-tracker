import { PageHeader } from "@/components/nav/page-header";
import {
  MOCK_NONPROFITS,
  NONPROFIT_CATEGORIES,
} from "@/lib/fixtures/nonprofits";

import { NonprofitsClient } from "./nonprofits-client";

export default function NonprofitsPage() {
  return (
    <>
      <PageHeader
        title="Nonprofit Directory"
        subtitle={`${MOCK_NONPROFITS.length} verified organizations`}
        showAddButton={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <NonprofitsClient
          nonprofits={MOCK_NONPROFITS}
          categories={[...NONPROFIT_CATEGORIES]}
        />
      </div>
    </>
  );
}
