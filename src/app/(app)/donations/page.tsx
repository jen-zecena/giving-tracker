import { HeartHandshake } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/nav/page-header";

export default function DonationsPage() {
  return (
    <>
      <PageHeader
        title="My Donations"
        subtitle="View and manage your giving history"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState
          icon={HeartHandshake}
          title="No donations yet"
          description="Once you log a donation it'll show up here. You can always come back and edit or remove it."
          action={{ label: "Log a donation", href: "/donations/new" }}
        />
      </div>
    </>
  );
}
