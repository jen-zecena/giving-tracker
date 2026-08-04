import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NonprofitsLoading() {
  return (
    <div>
      {/* Dark hero band */}
      <div className="bg-surface-inverse px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-[680px] space-y-3">
          <Skeleton className="h-3 w-20 bg-white/15" />
          <Skeleton className="h-9 w-72 max-w-full bg-white/15" />
          <Skeleton className="h-4 w-96 max-w-full bg-white/15" />
          <Skeleton className="h-10 w-full max-w-[520px] bg-white/15" />
        </div>
      </div>

      <div className="space-y-6 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-3 w-28" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="gap-0 py-0">
              <Skeleton className="h-24 w-full rounded-none" />
              <div className="px-6 pb-6">
                <Skeleton className="-mt-7 mb-3 h-14 w-14 rounded-lg ring-4 ring-card" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-1.5 h-4 w-3/4" />
                <div className="mt-4 flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-4xl" />
                  <Skeleton className="h-5 w-16 rounded-4xl" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
