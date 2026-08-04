import { Award, Heart, Sparkles, TrendingUp } from "lucide-react";
import { getInsights } from "@/lib/queries/dashboard";
import type { Insight, InsightIcon } from "@/lib/queries/dashboard-helpers";

const ICON_MAP: Record<InsightIcon, typeof Sparkles> = {
  "trending-up": TrendingUp,
  heart: Heart,
  "award-orgs": Award,
  sparkles: Sparkles,
  "award-month": Award,
};

export async function InsightsCard() {
  const insights = await getInsights();
  if (insights.length === 0) return null;

  return <InsightsCardView insights={insights} />;
}

/**
 * DS app/InsightList: a brand-soft green card — insights celebrate, they
 * never scold. Icons take green-600; text sits in deep green.
 */
export function InsightsCardView({ insights }: { insights: Insight[] }) {
  return (
    <div
      className="rounded-xl bg-brand-soft p-6 flex flex-col gap-3.5"
      style={{ boxShadow: "inset 0 0 0 1px rgba(46,107,78,0.16)" }}
    >
      <h3 className="text-lg font-semibold tracking-tight text-green-900">
        Your impact this month
      </h3>
      <ul className="m-0 p-0 list-none grid gap-3">
        {insights.map((insight) => {
          const Icon = ICON_MAP[insight.icon];
          return (
            <li
              key={insight.key}
              className="flex items-start gap-2.5 text-sm text-green-900"
            >
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                aria-hidden
              />
              <span className="[text-wrap:pretty]">{insight.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
