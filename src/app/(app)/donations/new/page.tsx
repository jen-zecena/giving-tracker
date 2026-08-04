import { PageHeader } from "@/components/nav/page-header";
import { getOrganizationSuggestions } from "@/lib/actions/donations";
import { DonationForm } from "./new-donation-form";

export default async function NewDonationPage() {
  const result = await getOrganizationSuggestions();
  const initialOrgs = result.data ?? [];

  return (
    <>
      <PageHeader
        title="Log a donation"
        subtitle="Tracking only — we never move your money"
        showAddButton={false}
      />
      <div className="px-4 sm:px-6 lg:px-8 pb-12">
        <DonationForm initialOrgs={initialOrgs} />
      </div>
    </>
  );
}
