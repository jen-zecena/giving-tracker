import { redirect } from "next/navigation";

import { PageHeader } from "@/components/nav/page-header";
import { getDiscoverPageData } from "@/lib/queries/discover";

import { DiscoverClient } from "./discover-client";

export default async function DiscoverPage() {
  const data = await getDiscoverPageData();
  if (!data) redirect("/login");

  return (
    <>
      <PageHeader title="Discover" subtitle="Find people to follow" showAddButton={false} />
      <div className="p-4 sm:p-6 lg:p-8">
        <DiscoverClient
          currentUserId={data.currentUserId}
          users={data.users}
          followingIds={data.followingIds}
          pendingOutgoingIds={data.pendingOutgoingIds}
          incomingRequests={data.incomingRequests}
        />
      </div>
    </>
  );
}
