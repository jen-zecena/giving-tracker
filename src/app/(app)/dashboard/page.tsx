import { PageHeader } from "@/components/nav/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Overview" subtitle="Welcome back" />
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-muted-foreground">
          Your giving overview will appear here.
        </p>
      </div>
    </>
  );
}
