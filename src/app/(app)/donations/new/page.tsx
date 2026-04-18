import { PageHeader } from "@/components/nav/page-header";
import { getOrganizationSuggestions } from "@/lib/actions/donations";
import { NewDonationForm } from "./new-donation-form";

export default async function NewDonationPage() {
  const result = await getOrganizationSuggestions();
  const initialOrgs = result.data ?? [];

  return (
    <>
      <PageHeader
        title="Log a Donation"
        subtitle="Track your charitable contribution"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <NewDonationForm initialOrgs={initialOrgs} />
      </div>
    </>
  );
}
