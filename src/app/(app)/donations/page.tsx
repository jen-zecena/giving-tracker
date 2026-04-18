import { PageHeader } from "@/components/nav/page-header";

export default function DonationsPage() {
  return (
    <>
      <PageHeader
        title="My Donations"
        subtitle="View and manage your giving history"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-muted-foreground">
          Your donation history will appear here.
        </p>
      </div>
    </>
  );
}
