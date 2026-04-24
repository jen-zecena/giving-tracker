"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  Filter,
  MapPin,
  Search,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAverageRating,
  searchNonprofits,
  type Nonprofit,
  type NonprofitCategory,
} from "@/lib/fixtures/nonprofits";

type Props = {
  nonprofits: Nonprofit[];
  categories: NonprofitCategory[];
};

function getRatingBadgeClass(rating: number): string {
  if (rating >= 95) return "bg-success text-primary-foreground hover:bg-success/90";
  if (rating >= 85) return "bg-[color:var(--info)] text-primary-foreground hover:bg-[color:var(--info)]/90";
  if (rating >= 75) return "bg-warning text-primary-foreground hover:bg-warning/90";
  return "bg-muted text-muted-foreground hover:bg-muted/80";
}

function getRatingLabel(rating: number): string {
  if (rating >= 95) return "Excellent";
  if (rating >= 85) return "Very Good";
  return "Good";
}

export function NonprofitsClient({ nonprofits, categories }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<NonprofitCategory[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  void nonprofits;

  const results = useMemo(
    () =>
      searchNonprofits(searchQuery, {
        category: selectedCategories,
        verified: verifiedOnly || undefined,
        minRating,
      }),
    [searchQuery, selectedCategories, verifiedOnly, minRating],
  );

  const activeFilterCount =
    selectedCategories.length + (verifiedOnly ? 1 : 0) + (minRating ? 1 : 0);

  const toggleCategory = (category: NonprofitCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setVerifiedOnly(false);
    setMinRating(undefined);
  };

  const clearAll = () => {
    setSearchQuery("");
    clearAllFilters();
  };

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
              <p className="mb-2 text-foreground/80">
                All organizations in this directory are verified against the IRS
                501(c)(3) database. Ratings are sourced from Charity Navigator
                and GuideStar.
              </p>
              <p className="text-sm text-muted-foreground">
                See a suspicious organization?{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  Report it
                </button>{" "}
                to our team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, mission, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search nonprofits"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              aria-controls="nonprofit-filters"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide" : "Show"} Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div
              id="nonprofit-filters"
              className="space-y-4 border-t border-border pt-4"
            >
              {/* Category Filters */}
              <div>
                <Label className="mb-3 block font-semibold">Categories</Label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {categories.map((category) => {
                    const id = `cat-${category}`;
                    return (
                      <div key={category} className="flex items-center gap-2">
                        <Checkbox
                          id={id}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <label
                          htmlFor={id}
                          className="cursor-pointer text-sm text-foreground"
                        >
                          {category}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nonprofits-verified"
                    checked={verifiedOnly}
                    onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
                  />
                  <label
                    htmlFor="nonprofits-verified"
                    className="cursor-pointer text-sm font-medium text-foreground"
                  >
                    Verified Organizations Only
                  </label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nonprofits-min-rating">Minimum Rating</Label>
                  <Select
                    value={minRating?.toString() ?? "all"}
                    onValueChange={(value) => {
                      if (!value || value === "all") {
                        setMinRating(undefined);
                      } else {
                        setMinRating(parseInt(value, 10));
                      }
                    }}
                  >
                    <SelectTrigger id="nonprofits-min-rating">
                      <SelectValue placeholder="Any rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any rating</SelectItem>
                      <SelectItem value="95">95+ (Excellent)</SelectItem>
                      <SelectItem value="85">85+ (Very Good)</SelectItem>
                      <SelectItem value="75">75+ (Good)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="py-12 pt-6 text-center">
            <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              No nonprofits found matching your criteria
            </p>
            <Button variant="outline" className="mt-4" onClick={clearAll}>
              Clear Filters
            </Button>
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
  const avgRating = getAverageRating(nonprofit);
  const hasRatings = nonprofit.ratings.length > 0;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* Logo */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-3">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {nonprofit.name}
                  </h3>
                  {nonprofit.verified && (
                    <Badge className="bg-success text-primary-foreground hover:bg-success/90">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                  {nonprofit.flagged && (
                    <Badge variant="destructive">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Flagged
                    </Badge>
                  )}
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {nonprofit.location.city}, {nonprofit.location.state}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span className="font-mono">EIN: {nonprofit.ein}</span>
                </div>
              </div>

              {/* Rating */}
              {hasRatings && (
                <div className="text-right">
                  <div className="mb-1 flex items-center gap-1">
                    <Star className="h-5 w-5 fill-warning text-warning" />
                    <span className="font-mono text-lg font-bold text-foreground">
                      {avgRating.toFixed(0)}
                    </span>
                  </div>
                  <Badge className={getRatingBadgeClass(avgRating)}>
                    {getRatingLabel(avgRating)}
                  </Badge>
                </div>
              )}
            </div>

            <p className="mb-3 line-clamp-2 text-foreground/80">
              {nonprofit.mission}
            </p>

            {/* Tags */}
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

            {/* Ratings Details */}
            {hasRatings && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {nonprofit.ratings.map((rating) => (
                  <span key={rating.source}>
                    {rating.source}:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {rating.rating}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() =>
              window.open(nonprofit.donationUrl, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Donate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
