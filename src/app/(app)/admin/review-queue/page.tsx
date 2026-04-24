import { ReviewQueueClient } from "@/components/admin/review-queue-client";
import { Card, CardContent } from "@/components/ui/card";
import { listFlagsForReviewQueue } from "@/lib/queries/admin-flags";

export const dynamic = "force-dynamic";

export default async function AdminReviewQueuePage() {
  const result = await listFlagsForReviewQueue();

  // The admin layout already gates this route, so an "Admins only" error
  // here would only happen on a race during is_admin demotion. We still
  // surface it gracefully rather than throw.
  if ("error" in result) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-destructive">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ReviewQueueClient flags={result.data} />
    </div>
  );
}
