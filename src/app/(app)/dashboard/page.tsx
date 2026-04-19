import { PageHeader } from "@/components/nav/page-header";
import { WelcomeChecklist } from "@/components/welcome-checklist";
import { getChecklistStatus } from "@/lib/queries/welcome-checklist";

export default async function DashboardPage() {
  const checklistStatus = await getChecklistStatus();

  return (
    <>
      <PageHeader title="Overview" subtitle="Welcome back" />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <WelcomeChecklist status={checklistStatus} />
        <p className="text-muted-foreground">
          Your giving overview will appear here.
        </p>
      </div>
    </>
  );
}
