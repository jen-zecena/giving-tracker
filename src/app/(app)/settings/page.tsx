import { PageHeader } from "@/components/nav/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Manage your account"
        showAddButton={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-muted-foreground">
          Account settings will appear here.
        </p>
      </div>
    </>
  );
}
