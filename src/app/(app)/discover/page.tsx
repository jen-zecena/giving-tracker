import { redirect } from "next/navigation";

import { LoadErrorState } from "@/components/load-error-state";
import { PageHeader } from "@/components/nav/page-header";
import { getDiscoverPageData } from "@/lib/queries/discover";

import { DiscoverClient } from "./discover-client";

export default async function DiscoverPage() {
  const data = await getDiscoverPageData();
  if (data === null) redirect("/login");

  if (data === "error") {
    return (
      <>
        <PageHeader
          title="Find people"
          subtitle="Follow people to see their giving in your feed"
          showAddButton={false}
        />
        <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12">
          <LoadErrorState
            title="People couldn't load"
            description="Something hiccuped on our side — try again in a moment."
            retryHref="/discover"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Find people"
        subtitle="Follow people to see their giving in your feed"
        showAddButton={false}
      />
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12">
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
