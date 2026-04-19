import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type EmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /**
   * When true, renders without the outer Card shell. Useful for pages that
   * already wrap the empty state in their own container (e.g. Dashboard
   * cards where the EmptyState is one section of a larger card).
   */
  unstyled?: boolean;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  unstyled = false,
  className,
}: EmptyStateProps) {
  const content = (
    <>
      <span
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden="true"
      >
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 mx-auto max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          {"href" in action && action.href !== undefined ? (
            <Button render={<Link href={action.href} />}>{action.label}</Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </>
  );

  if (unstyled) {
    return <div className={cn("text-center", className)}>{content}</div>;
  }

  return (
    <Card className={cn("p-10 text-center", className)}>{content}</Card>
  );
}
