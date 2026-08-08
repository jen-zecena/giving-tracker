import Link from "next/link";
import { SearchX } from "lucide-react";

import { PageHeader } from "@/components/nav/page-header";
import { Button } from "@/components/ui/button";
import {
  getDonation,
  getOrganizationSuggestions,
} from "@/lib/actions/donations";
import { DonationForm } from "../../new/new-donation-form";

export default async function EditDonationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [donationResult, orgsResult] = await Promise.all([
    getDonation(id),
    getOrganizationSuggestions(),
  ]);

  if (donationResult.error || !donationResult.data) {
    return (
      <>
        <PageHeader title="Edit donation" showAddButton={false} />
        <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12">
          <div className="rounded-xl border border-dashed border-border-strong px-6 py-12 text-center">
            <span
              className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand-soft text-green-700"
              aria-hidden
            >
              <SearchX className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-text-strong">
              Donation not found
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              It may have been deleted, or the link is wrong.
            </p>
            <Button
              size="sm"
              className="mt-5"
              render={<Link href="/donations" />}
            >
              Back to my giving
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit donation"
        subtitle="Tracking only — we never move your money"
        showAddButton={false}
      />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12">
        <DonationForm
          initialOrgs={orgsResult.data ?? []}
          donation={donationResult.data}
        />
      </div>
    </>
  );
}
