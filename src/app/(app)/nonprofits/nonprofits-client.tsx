"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { syncNonprofitsFromSearch } from "@/lib/actions/nonprofit-sync";
import type { Nonprofit } from "@/types";

type Props = {
  initial: Nonprofit[];
};

/**
 * Directory search surface (DP-064), restyled to the earth-tone DS.
 *
 * - First render shows the most recently synced rows (server-fetched
 *   in the page component).
 * - User submits a query → `syncNonprofitsFromSearch` hits Every.org,
 *   upserts results, returns DB rows. We replace the visible list.
 * - Each card links to `/nonprofits/{db_id}` so the detail page can
 *   read the same row out of the table.
 * - Category pills are derived client-side from whatever categories the
 *   loaded rows carry (Every.org's mapping is sparse, so the row hides
 *   itself when no categories are present).
 */
export function NonprofitsClient({ initial }: Props) {
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<Nonprofit[]>(initial);
  const [category, setCategory] = useState("All");
  const [pending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(results.flatMap((n) => n.category))).sort(),
    [results]
  );
  // A stale selection (category no longer in the result set) falls back
  // to "All" without needing an effect.
  const effectiveCategory = categories.includes(category) ? category : "All";

  const shown = useMemo(
    () =>
      effectiveCategory === "All"
        ? results
        : results.filter((n) => n.category.includes(effectiveCategory)),
    [results, effectiveCategory]
  );

  const filtersActive =
    hasSearched || draft.length > 0 || effectiveCategory !== "All";

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
    setCategory("All");
  }

  return (
    <div>
      {/* Dark hero band — full-bleed; inner content aligns to the 1180
          column */}
      <section className="bg-surface-inverse px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1180px]">
        <div className="max-w-[680px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">
            Directory
          </span>
          <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-[-0.025em] text-white lg:text-[34px]">
            Find a verified nonprofit.
          </h1>
          <p className="mt-2 text-base text-white/66">
            Results come live from Every.org — every one an IRS-verified
            501(c)(3), cross-checked against the federal database.
          </p>
          <form
            onSubmit={handleSubmit}
            className="mt-5 flex max-w-[520px] flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Search Every.org by name or keyword…"
                className="h-10 rounded-lg border-transparent bg-card pl-9 shadow-xs"
                aria-label="Search nonprofits"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                disabled={pending}
                className="h-10"
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search aria-hidden="true" />
                    Search
                  </>
                )}
              </Button>
              {(hasSearched || draft.length > 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={handleClear}
                  disabled={pending}
                  className="h-10 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pt-6 pb-12 sm:px-6 lg:px-8">
        {/* Filter pills + count row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {categories.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter organizations by category"
            >
              {["All", ...categories].map((cat) => {
                const active = effectiveCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-px",
                      active
                        ? "border-brand bg-brand-soft text-green-700"
                        : "border-border-strong bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
          <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em] text-text-faint">
            {shown.length} organization{shown.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Results */}
        {shown.length === 0 ? (
          <DirectoryEmpty filtersActive={filtersActive} onClear={handleClear} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((nonprofit) => (
              <li key={nonprofit.id} className="min-w-0">
                <NonprofitCard nonprofit={nonprofit} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DirectoryEmpty({
  filtersActive,
  onClear,
}: {
  filtersActive: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border-strong px-6 py-16 text-center">
      <span
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand"
        aria-hidden="true"
      >
        <Building2 className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-text-strong">
        {filtersActive ? "No organizations match" : "No organizations yet"}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {filtersActive
          ? "Try a broader keyword — ‘water’, ‘literacy’, ‘shelter’."
          : "Search above to discover verified nonprofits."}
      </p>
      {filtersActive && (
        <Button size="sm" className="mt-5" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

function NonprofitCard({ nonprofit }: { nonprofit: Nonprofit }) {
  return (
    <Card className="h-full gap-0 py-0">
      {/* Cover area */}
      <CoverBanner
        src={nonprofit.cover_image_url}
        alt={`${nonprofit.name} cover image`}
      />

      <div className="flex flex-1 flex-col px-6 pb-6">
        {/* Logo overlapping the cover */}
        <div className="-mt-7 mb-3">
          <NonprofitLogo
            src={nonprofit.logo_url}
            name={nonprofit.name}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="text-lg leading-snug font-semibold text-text-strong">
            <Link
              href={`/nonprofits/${nonprofit.id}`}
              className="hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {nonprofit.name}
            </Link>
          </h3>
          {nonprofit.verified && (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-success"
              role="img"
              aria-label="Verified 501(c)(3)"
            />
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {nonprofit.location && (
            <>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {nonprofit.location}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="font-mono">EIN {nonprofit.ein}</span>
        </div>

        {nonprofit.mission && (
          <p className="mt-2.5 line-clamp-2 text-sm text-muted-foreground">
            {nonprofit.mission}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3.5">
          <div className="flex flex-wrap gap-1.5">
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
              <ExternalLink aria-hidden="true" />
              Donate
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function CoverBanner({ src, alt }: { src: string | null; alt: string }) {
  // Cloudinary URLs occasionally 404 if Every.org clears an image; we
  // render the DS green→blue wash in that case via onError. This is the
  // one gradient the DS allows on this screen.
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div
        className="h-24 w-full"
        style={{
          background:
            "linear-gradient(120deg, var(--green-600), var(--blue-600))",
        }}
        aria-hidden="true"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-24 w-full object-cover"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}

function NonprofitLogo({ src, name }: { src: string | null; name: string }) {
  // Cloudinary URLs occasionally 404 if Every.org clears an image; we
  // render the DS letter fallback in that case via onError. The 4-px
  // ring matches the card surface so the logo floats over the cover.
  const ringClasses = "shrink-0 rounded-lg ring-4 ring-card bg-card";
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <span
        className={`flex h-14 w-14 items-center justify-center bg-(--green-500) font-display text-2xl text-white ${ringClasses}`}
        aria-hidden="true"
      >
        {(name.trim()[0] ?? "?").toUpperCase()}
      </span>
    );
  }
  // Arbitrary Cloudinary / Every.org S3 hosts; sizing is fixed so no
  // layout shift. Skip next/image to avoid registering each remote
  // host in next.config and to keep onError fallback semantics.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} logo`}
      width={56}
      height={56}
      className={`h-14 w-14 object-cover ${ringClasses}`}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}
