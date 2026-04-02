import Link from "next/link";
import { Plus } from "lucide-react";

export default function DonationsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Donations</h1>
        <Link
          href="/donations/new"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Log a donation
        </Link>
      </div>
      <p className="mt-2 text-muted-foreground">
        Your donation history will appear here.
      </p>
    </div>
  );
}
