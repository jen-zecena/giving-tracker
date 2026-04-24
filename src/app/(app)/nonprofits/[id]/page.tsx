import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Flag,
  Globe,
  MapPin,
  Star,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { listFlagsForNonprofit } from "@/lib/actions/nonprofit-flags";
import { getNonprofitById } from "@/lib/queries/nonprofits";
import {
  formatRevenue,
  getAverageRating,
  getRatingBandToken,
  type RatingBandToken,
} from "@/lib/queries/nonprofits-helpers";

import { FlagNonprofitDialog } from "./flag-dialog";

const RATING_BAND_BADGE: Record<RatingBandToken, string> = {
  success: "bg-success/10 text-success border-success/30",
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  muted: "bg-muted text-muted-foreground border-border",
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function NonprofitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nonprofit = await getNonprofitById(id);
  if (!nonprofit) notFound();

  // RLS-scoped — non-admin users only see their own flags. The header
  // badge therefore acts as a "you've already reported this" hint
  // rather than a public report counter.
  const flagsRes = await listFlagsForNonprofit(id);
  const visibleFlagCount = flagsRes.data?.length ?? 0;

  const avgRating = getAverageRating(nonprofit.ratings);
  const verifiedDate = formatDate(nonprofit.verification_date);
  const revenueDisplay = formatRevenue(nonprofit.revenue);

  const locationLine = nonprofit.location_detail
    ? `${nonprofit.location_detail.city}, ${nonprofit.location_detail.state}, ${nonprofit.location_detail.country}`
    : nonprofit.location;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button render={<Link href="/nonprofits" />} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Organization Header */}
        <Card className="mb-8">
          <CardContent className="pt-8">
            <div className="flex items-start gap-6">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-success">
                <Building2 className="h-12 w-12 text-primary-foreground" />
              </div>

              <div className="flex-1">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl font-bold tracking-tight">
                        {nonprofit.name}
                      </h1>
                      {nonprofit.verified && (
                        <Badge className="bg-success text-primary-foreground">
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Verified
                        </Badge>
                      )}
                      {visibleFlagCount > 0 && (
                        <Badge variant="destructive">
                          <AlertTriangle className="mr-1 h-4 w-4" />
                          {visibleFlagCount} Flag
                          {visibleFlagCount === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </div>
                    {nonprofit.mission && (
                      <p className="mb-3 text-lg text-foreground/80">
                        {nonprofit.mission}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {locationLine && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{locationLine}</span>
                        </div>
                      )}
                      {nonprofit.founded != null && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Founded {nonprofit.founded}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {nonprofit.ratings.length > 0 && (
                    <div className="rounded-lg border-2 border-warning/30 bg-warning/10 p-4 text-center">
                      <div className="mb-1 flex items-center justify-center gap-1">
                        <Star className="h-8 w-8 fill-warning text-warning" />
                        <span className="font-mono text-3xl font-bold">
                          {avgRating.toFixed(0)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Overall Rating
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {nonprofit.donation_url && (
                    <Button
                      render={
                        <a
                          href={nonprofit.donation_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Donate Now
                    </Button>
                  )}
                  {nonprofit.website && (
                    <Button
                      variant="outline"
                      render={
                        <a
                          href={nonprofit.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      Visit Website
                    </Button>
                  )}
                  <FlagNonprofitDialog
                    nonprofitId={nonprofit.id}
                    triggerVariant="ghost"
                    triggerLabel="Report Issue"
                    triggerIcon="flag"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                {nonprofit.description ? (
                  <p className="leading-relaxed text-foreground/80">
                    {nonprofit.description}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No description available yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Ratings & Verification */}
            <Card>
              <CardHeader>
                <CardTitle>Ratings &amp; Verification</CardTitle>
                <CardDescription>
                  Independent charity ratings and verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-success/30 bg-success/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-success" />
                    <div>
                      <h4 className="mb-1 font-semibold text-success">
                        IRS 501(c)(3) Verified
                      </h4>
                      <p className="font-mono text-sm">EIN: {nonprofit.ein}</p>
                      {verifiedDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last verified: {verifiedDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {nonprofit.ratings.map((rating) => {
                  const band = getRatingBandToken(
                    rating.score,
                    rating.maxScore
                  );
                  const lastUpdated = formatDate(rating.lastUpdated);
                  return (
                    <div
                      key={`${rating.source}-${rating.lastUpdated}`}
                      className="rounded-lg border p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="font-semibold">{rating.source}</h4>
                        <Badge
                          variant="outline"
                          className={RATING_BAND_BADGE[band]}
                        >
                          {rating.rating}
                        </Badge>
                      </div>
                      <div className="mb-1 flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{
                              width: `${
                                (rating.score / rating.maxScore) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-sm font-medium">
                          {rating.score}/{rating.maxScore}
                        </span>
                      </div>
                      {lastUpdated && (
                        <p className="text-xs text-muted-foreground">
                          Last updated: {lastUpdated}
                        </p>
                      )}
                    </div>
                  );
                })}

                {nonprofit.ratings.length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    No ratings available yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Focus Areas */}
            <Card>
              <CardHeader>
                <CardTitle>Focus Areas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-2 block text-sm text-muted-foreground">
                      Primary Categories
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {nonprofit.category.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          None on file.
                        </span>
                      ) : (
                        nonprofit.category.map((cat) => (
                          <Badge
                            key={cat}
                            variant="secondary"
                            className="text-sm"
                          >
                            {cat}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  {nonprofit.subcategory && (
                    <div>
                      <Label className="mb-2 block text-sm text-muted-foreground">
                        Subcategory
                      </Label>
                      <Badge variant="outline">{nonprofit.subcategory}</Badge>
                    </div>
                  )}
                  <div>
                    <Label className="mb-2 block text-sm text-muted-foreground">
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {nonprofit.tags.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          None on file.
                        </span>
                      ) : (
                        nonprofit.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            #{tag}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Facts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {locationLine && (
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <p className="pl-6 text-sm">
                      {nonprofit.location_detail
                        ? `${nonprofit.location_detail.city}, ${nonprofit.location_detail.state}`
                        : locationLine}
                    </p>
                  </div>
                )}

                {nonprofit.founded != null && (
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Founded</span>
                    </div>
                    <p className="pl-6 font-mono text-sm">{nonprofit.founded}</p>
                  </div>
                )}

                {nonprofit.size && (
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Organization Size
                      </span>
                    </div>
                    <p className="pl-6 text-sm">{nonprofit.size}</p>
                  </div>
                )}

                {revenueDisplay && (
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">Annual Revenue</span>
                    </div>
                    <p className="pl-6 font-mono text-sm">{revenueDisplay}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">
                    EIN
                  </div>
                  <p className="font-mono text-sm">{nonprofit.ein}</p>
                </div>
              </CardContent>
            </Card>

            {/* External Links */}
            <Card>
              <CardHeader>
                <CardTitle>External Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {nonprofit.website && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    render={
                      <a
                        href={nonprofit.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Official Website
                  </Button>
                )}
                {nonprofit.donation_url && (
                  <Button
                    className="w-full justify-start"
                    render={
                      <a
                        href={nonprofit.donation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Donation Page
                  </Button>
                )}
                {!nonprofit.website && !nonprofit.donation_url && (
                  <p className="text-sm text-muted-foreground">
                    No external links on file.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Trust & Safety */}
            <Card>
              <CardHeader>
                <CardTitle>Trust &amp; Safety</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span>IRS 501(c)(3) Verified</span>
                  </div>
                  {nonprofit.ratings.length > 0 && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                      <span>
                        Rated by {nonprofit.ratings.length} charity watchdog
                        {nonprofit.ratings.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Flag className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span>
                      {visibleFlagCount} user report
                      {visibleFlagCount === 1 ? "" : "s"} from you
                    </span>
                  </div>
                </div>
                <Separator className="my-3" />
                <FlagNonprofitDialog
                  nonprofitId={nonprofit.id}
                  triggerVariant="outline"
                  triggerLabel="Report an Issue"
                  triggerIcon="alert"
                  triggerClassName="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
