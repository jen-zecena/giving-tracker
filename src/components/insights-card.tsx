import { Sparkles, TrendingUp, Heart, Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getInsights } from "@/lib/queries/dashboard";
import type { Insight, InsightIcon } from "@/lib/queries/dashboard-helpers";

const ICON_MAP: Record<
  InsightIcon,
  { Icon: typeof Sparkles; colorClass: string }
> = {
  "trending-up": { Icon: TrendingUp, colorClass: "text-success" },
  heart: { Icon: Heart, colorClass: "text-destructive" },
  "award-orgs": { Icon: Award, colorClass: "text-primary" },
  sparkles: { Icon: Sparkles, colorClass: "text-warning" },
  "award-month": { Icon: Award, colorClass: "text-info" },
};

export async function InsightsCard() {
  const insights = await getInsights();
  if (insights.length === 0) return null;

  return (
    <InsightsCardView insights={insights} />
  );
}

export function InsightsCardView({ insights }: { insights: Insight[] }) {
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-accent/40 to-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Impact This Month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const { Icon, colorClass } = ICON_MAP[insight.icon];
          return (
            <div key={insight.key} className="flex items-start gap-3">
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${colorClass}`}
                aria-hidden
              />
              <p className="text-sm text-foreground/80">{insight.text}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
