import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-6xl font-bold tracking-tight text-muted-foreground">
        404
      </h1>
      <p className="text-lg text-muted-foreground">
        This page could not be found.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
