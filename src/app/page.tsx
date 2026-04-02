import Link from "next/link";
import { Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex items-center gap-2">
        <Heart className="h-8 w-8 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">Giving Tracker</h1>
      </div>
      <p className="max-w-md text-lg text-muted-foreground">
        Track, visualize, and share your charitable giving. Start building your
        giving story today.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
