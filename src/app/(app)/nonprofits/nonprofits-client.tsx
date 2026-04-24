"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { syncNonprofitsFromSearch } from "@/lib/actions/nonprofit-sync";
import type { Nonprofit } from "@/types";

type Props = {
  initial: Nonprofit[];
};

/**
 * Directory search surface (DP-064).
 *
 * - First render shows the most recently synced rows (server-fetched
 *   in the page component).
 * - User submits a query → `syncNonprofitsFromSearch` hits Every.org,
 *   upserts results, returns DB rows. We replace the visible list.
 * - Each card links to `/nonprofits/{db_id}` so the detail page can
 *   read the same row out of the table.
 *
 * The previous in-memory category / minRating filters were dropped
 * here: Every.org doesn't return charity-watchdog ratings, and its
 * cause-category mapping is sparse on search results. The detail page
 * still renders any cause categories the row carries.
 */
export function NonprofitsClient({ initial }: Props) {
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<Nonprofit[]>(initial);
  const [pending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = draft.trim();
    if (!query) {
      // Empty query resets to the initial server-fetched rows.
      setResults(initial);
      setHasSearched(false);
      return;
    }
    startTransition(async () => {
      const res = await syncNonprofitsFromSearch(query);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setResults(res.data ?? []);
      setHasSearched(true);
    });
  }

  function handleClear() {
    setDraft("");
    setResults(initial);
    setHasSearched(false);
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Info Banner */}
      <Card className="mb-6 border-[color:var(--success)]/30 bg-gradient-to-r from-[color:var(--metric-green)] to-[color:var(--metric-blue)]">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-success" />
            <div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                Verified Nonprofits
              </h3>
              <p className="text-foreground/80">
                Search results come live from Every.org and are restricted
                to IRS-verified 501(c)(3) organizations. Every result you
                see has been cross-checked against the federal database.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search Every.org by name or keyword (e.g. 'water', 'red cross')…"
                className="pl-10"
                aria-label="Search nonprofits"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
              {(hasSearched || draft.length > 0) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  disabled={pending}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 pt-6 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {hasSearched
                ? "No organizations match your search. Try a broader keyword."
                : "Search above to discover verified nonprofits."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {results.map((nonprofit) => (
            <li key={nonprofit.id}>
              <NonprofitCard nonprofit={nonprofit} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NonprofitCard({ nonprofit }: { nonprofit: Nonprofit }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* Logo */}
          <NonprofitLogo
            src={nonprofit.logo_url}
            alt={`${nonprofit.name} logo`}
          />

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">
                    <Link
                      href={`/nonprofits/${nonprofit.id}`}
                      className="hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                      {nonprofit.name}
                    </Link>
                  </h3>
                  {nonprofit.verified && (
                    <Badge className="bg-success text-primary-foreground hover:bg-success/90">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  {nonprofit.location && (
                    <>
                      <MapPin className="h-4 w-4" />
                      <span>{nonprofit.location}</span>
                      <span aria-hidden="true">•</span>
                    </>
                  )}
                  <span className="font-mono">EIN: {nonprofit.ein}</span>
                </div>
              </div>
            </div>

            {nonprofit.mission && (
              <p className="mb-3 line-clamp-2 text-foreground/80">
                {nonprofit.mission}
              </p>
            )}

            {nonprofit.category.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {nonprofit.category.slice(0, 3).map((cat) => (
                  <Badge key={cat} variant="outline">
                    {cat}
                  </Badge>
                ))}
                {nonprofit.category.length > 3 && (
                  <Badge variant="outline">
                    +{nonprofit.category.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Action Button */}
          {nonprofit.donation_url && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              render={
                <a
                  href={nonprofit.donation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Donate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NonprofitLogo({
  src,
  alt,
}: {
  src: string | null;
  alt: string;
}) {
  // Cloudinary URLs occasionally 404 if Every.org clears an image; we
  // render the icon fallback in that case via onError.
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-3"
        aria-hidden="true"
      >
        <Building2 className="h-8 w-8 text-primary-foreground" />
      </div>
    );
  }
  // Arbitrary Cloudinary / Every.org S3 hosts; sizing is fixed so no
  // layout shift. Skip next/image to avoid registering each remote
  // host in next.config and to keep onError fallback semantics.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={64}
      height={64}
      className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}
