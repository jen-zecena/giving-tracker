"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * App-wide error boundary. Any server-render or unhandled action throw
 * (a failed feed query, a misconfigured env var, …) lands here instead
 * of the platform's raw "This page couldn't load" screen. DS dashed
 * empty-state styling; the reset retries the failed segment in place.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real cause in logs/monitoring while the member sees
    // the friendly copy below.
    console.error("[app-error-boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-xl border-2 border-dashed border-border-strong">
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
            <RefreshCw className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-text-strong">
            Something went wrong
          </h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Your data is safe — this page just hit a snag. Try again, and if
            it keeps happening, we&apos;d like to know.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-text-faint">
              Ref {error.digest}
            </p>
          )}
          <Button className="mt-5" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
