import { RefreshCw } from "lucide-react";

/**
 * Inline "couldn't load" block for pages that degrade in place when a
 * query fails (DS dashed empty-state styling). The retry is a plain
 * anchor on purpose: a full navigation guarantees the server re-runs
 * the failed queries, with no client router cache in the way.
 */
export function LoadErrorState({
  title,
  description,
  retryHref,
}: {
  title: string;
  description: string;
  retryHref: string;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border-strong bg-transparent">
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
          <RefreshCw className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-text-strong">
          {title}
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
        <a
          href={retryHref}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Try again
        </a>
      </div>
    </div>
  );
}
