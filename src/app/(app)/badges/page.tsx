import { Award } from "lucide-react";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/nav/page-header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/server";
import { getBadges } from "@/lib/queries/badges";

import { BadgesBoard } from "./badges-board";

export default async function BadgesPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const badges = await getBadges();
  const earnedCount = badges.filter((b) => b.earned).length;
  const totalCount = badges.length;
  const progressPct =
    totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <>
      <PageHeader title="Milestones" subtitle="Badges earned on your giving journey" />

      <div className="mx-auto grid max-w-5xl gap-6 p-4 sm:p-6 lg:p-8">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your progress
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                <span className="font-mono">{earnedCount}</span>
                <span className="text-muted-foreground">
                  {" "}
                  / {totalCount} earned
                </span>
              </p>
            </div>
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <Award className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <Progress
              value={progressPct}
              aria-label={`${progressPct}% of badges earned`}
              className="h-2"
            />
            <p className="font-mono text-xs text-muted-foreground">
              {progressPct}% complete
            </p>
          </div>
        </Card>

        <BadgesBoard badges={badges} />
      </div>
    </>
  );
}
