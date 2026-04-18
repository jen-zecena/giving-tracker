import { PageHeader } from "@/components/nav/page-header";

export default function AdminReviewQueuePage() {
  return (
    <>
      <PageHeader
        title="Admin Review Queue"
        subtitle="Review flagged organizations"
        showAddButton={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-muted-foreground">
          The review queue will appear here once nonprofits are ported (DP-062).
        </p>
      </div>
    </>
  );
}
