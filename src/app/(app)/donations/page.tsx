"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Search,
  Download,
  Pencil,
  Trash2,
  Heart,
  Building2,
  DollarSign,
  RefreshCw,
  HeartHandshake,
  Check,
  X as XIcon,
  Clock,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/nav/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import {
  getDonations,
  getDonationsSummary,
  deleteDonation,
  confirmDonation,
} from "@/lib/actions/donations";
import { usePendingDonations } from "@/components/nav/pending-donations-context";
import type { Donation, CauseTag } from "@/types";

// ── Constants ─────────────────────────────────────────────

const CAUSE_TAGS: { value: CauseTag; label: string }[] = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "environment", label: "Environment" },
  { value: "poverty", label: "Poverty" },
  { value: "animal_welfare", label: "Animal Welfare" },
  { value: "arts_culture", label: "Arts & Culture" },
  { value: "disaster_relief", label: "Disaster Relief" },
  { value: "human_rights", label: "Human Rights" },
  { value: "community", label: "Community" },
  { value: "religious", label: "Religious" },
];

const CAUSE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  CAUSE_TAGS.map((t) => [t.value, t.label])
);

const SCOPE_LABELS: Record<string, string> = {
  local: "Local",
  national: "National",
  global: "Global",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
] as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Year options ──────────────────────────────────────────

function getYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(String(y));
  }
  return years;
}

// ── Page Component ────────────────────────────────────────

export default function DonationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search is local-only — intentionally NOT persisted to the URL so the
  // address bar stays quiet as the user types. cause/year/sort still sync
  // to the URL below so those filters remain shareable.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [causeFilter, setCauseFilter] = useState(
    searchParams.get("cause") ?? ""
  );
  const [yearFilter, setYearFilter] = useState(
    searchParams.get("year") ?? ""
  );
  const [sortBy, setSortBy] = useState(searchParams.get("sort") ?? "newest");

  // Data state
  const [donations, setDonations] = useState<Donation[]>([]);
  const [pendingDonations, setPendingDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    count: 0,
    total: 0,
    organizations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { refresh: refreshPendingBadge } = usePendingDonations();

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Donation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pending confirm/skip state (disables buttons on the row being acted on)
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  // ── Sync filters to URL ───────────────────────────────

  const syncUrl = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val) sp.set(key, val);
      }
      const qs = sp.toString();
      router.replace(`/donations${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  // ── Fetch data ────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [donationsResult, summaryResult, pendingResult] = await Promise.all([
        getDonations({
          search: debouncedSearch || undefined,
          causeTag: (causeFilter as CauseTag) || undefined,
          dateFrom: yearFilter ? `${yearFilter}-01-01` : undefined,
          dateTo: yearFilter ? `${yearFilter}-12-31` : undefined,
          sortBy: sortBy as "newest" | "oldest" | "highest" | "lowest",
          // Main list shows confirmed donations only; pending rows render in
          // their own section at the top and skipped rows are deleted outright.
          status: "confirmed",
          pageSize: 100,
        }),
        getDonationsSummary(),
        // Always load the full pending set, ignoring filters — pending
        // donations need user action regardless of what the list is filtered to.
        getDonations({ status: "pending", sortBy: "newest", pageSize: 100 }),
      ]);

      if (donationsResult.data) {
        setDonations(donationsResult.data.items);
        setTotal(donationsResult.data.total);
      }
      if (summaryResult.data) {
        setSummary(summaryResult.data);
      }
      if (pendingResult.data) {
        setPendingDonations(pendingResult.data.items);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, causeFilter, yearFilter, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filter handlers ───────────────────────────────────

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = {
        cause: causeFilter,
        year: yearFilter,
        sort: sortBy,
        ...updates,
      };
      syncUrl(params);
    },
    [causeFilter, yearFilter, sortBy, syncUrl]
  );

  // Debounce the search term before it hits the server so typing doesn't
  // fire a query per keystroke. Search stays out of the URL entirely.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Delete handler ────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteDonation(deleteTarget.id);
    setDeleting(false);
    setDeleteDialogOpen(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `Deleted donation to ${deleteTarget.organization_name}`
      );
      startTransition(() => {
        fetchData();
      });
    }
    setDeleteTarget(null);
  }

  // ── Confirm / Skip handlers ───────────────────────────

  async function handleConfirm(donation: Donation) {
    setActingOnId(donation.id);
    const result = await confirmDonation(donation.id);
    setActingOnId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Confirmed donation to ${donation.organization_name}`);
    await refreshPendingBadge();
    startTransition(() => {
      fetchData();
    });
  }

  async function handleSkip(donation: Donation) {
    setActingOnId(donation.id);
    const result = await deleteDonation(donation.id);
    setActingOnId(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Skipped donation to ${donation.organization_name}`);
    await refreshPendingBadge();
    startTransition(() => {
      fetchData();
    });
  }

  // ── CSV Export ────────────────────────────────────────

  function handleExportCSV() {
    if (donations.length === 0) return;

    const headers = [
      "Date",
      "Organization",
      "Amount",
      "Scope",
      "Cause",
      "Status",
      "Tax Deductible",
      "Recurring",
      "Notes",
    ];
    const rows = donations.map((d) => [
      d.donation_date,
      `"${d.organization_name.replace(/"/g, '""')}"`,
      d.amount,
      d.scope,
      d.cause_tag ? CAUSE_LABEL_MAP[d.cause_tag] : "",
      d.status,
      d.is_tax_deductible ? "Yes" : "No",
      d.is_recurring ? "Yes" : "No",
      d.notes ? `"${d.notes.replace(/"/g, '""')}"` : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `donations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }

  // ── Render ────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="My Donations"
        subtitle="View and manage your giving history"
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            label="Total Donations"
            value={loading ? null : String(summary.count)}
            icon={<Heart className="h-5 w-5 text-primary" />}
            bgClass="bg-metric-purple"
          />
          <SummaryCard
            label="Total Given"
            value={loading ? null : formatCurrency(summary.total)}
            icon={<DollarSign className="h-5 w-5 text-success" />}
            bgClass="bg-metric-green"
          />
          <SummaryCard
            label="Organizations"
            value={loading ? null : String(summary.organizations)}
            icon={<Building2 className="h-5 w-5 text-info" />}
            bgClass="bg-metric-blue"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select
            value={causeFilter}
            onValueChange={(val) => {
              setCauseFilter(val ?? "");
              updateFilters({ cause: val ?? "" });
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="All causes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All causes</SelectItem>
              {CAUSE_TAGS.map((tag) => (
                <SelectItem key={tag.value} value={tag.value}>
                  {tag.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={yearFilter}
            onValueChange={(val) => {
              setYearFilter(val ?? "");
              updateFilters({ year: val ?? "" });
            }}
          >
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All years</SelectItem>
              {getYearOptions().map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(val) => {
              setSortBy(val ?? "newest");
              updateFilters({ sort: val ?? "newest" });
            }}
          >
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={donations.length === 0}
            className="shrink-0"
          >
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
        </div>

        {/* Pending section — always at the top when there are pending rows */}
        {!loading && pendingDonations.length > 0 && (
          <section id="pending" className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" aria-hidden />
              <h2 className="text-base font-semibold text-foreground">
                Pending ({pendingDonations.length})
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Confirm or skip these recurring donations. They won&apos;t count
              toward your totals until you confirm.
            </p>
            <div className="space-y-3">
              {pendingDonations.map((donation) => (
                <PendingDonationRow
                  key={donation.id}
                  donation={donation}
                  busy={actingOnId === donation.id}
                  onConfirm={() => handleConfirm(donation)}
                  onSkip={() => handleSkip(donation)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Donation List */}
        {loading ? (
          <LoadingSkeleton />
        ) : donations.length === 0 ? (
          (search || causeFilter || yearFilter) && summary.count > 0 ? (
            <EmptyState
              icon={Search}
              title="No matching donations"
              description="Try adjusting your search or filters to find what you're looking for."
            />
          ) : pendingDonations.length > 0 ? null : (
            <EmptyState
              icon={HeartHandshake}
              title="No donations yet"
              description="Once you log a donation it'll show up here. You can always come back and edit or remove it."
              action={{ label: "Log a donation", href: "/donations/new" }}
            />
          )
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {total} donation{total !== 1 ? "s" : ""}
              {(search || causeFilter || yearFilter) &&
                total !== summary.count &&
                ` (filtered from ${summary.count})`}
            </p>

            <div className="space-y-3">
              {donations.map((donation) => (
                <DonationRow
                  key={donation.id}
                  donation={donation}
                  onDelete={() => {
                    setDeleteTarget(donation);
                    setDeleteDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete donation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your{" "}
              {deleteTarget && formatCurrency(Number(deleteTarget.amount))}{" "}
              donation to {deleteTarget?.organization_name}. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Summary Card ──────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  bgClass,
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  bgClass: string;
}) {
  return (
    <Card className={`${bgClass} border-0`}>
      <CardContent className="flex items-center gap-4 p-4 sm:p-5">
        <div className="rounded-lg bg-card/60 p-2.5">{icon}</div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {value === null ? (
            <Skeleton className="h-7 w-20 mt-1" />
          ) : (
            <p className="text-xl font-semibold text-foreground font-mono tracking-tight">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Donation Row ──────────────────────────────────────────

function DonationRow({
  donation,
  onDelete,
}: {
  donation: Donation;
  onDelete: () => void;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
        {/* Left: org + badges */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">
              {donation.organization_name}
            </span>
            {donation.is_recurring && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Recurring
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {donation.cause_tag && (
              <Badge variant="outline">
                {CAUSE_LABEL_MAP[donation.cause_tag] ?? donation.cause_tag}
              </Badge>
            )}
            <Badge variant="outline">
              {SCOPE_LABELS[donation.scope] ?? donation.scope}
            </Badge>
            {donation.status === "pending" && (
              <Badge
                variant="secondary"
                className="bg-warning/10 text-warning"
              >
                Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Right: date + amount + actions */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <span className="text-sm text-muted-foreground font-mono">
            {format(new Date(donation.donation_date + "T00:00:00"), "MMM d, yyyy")}
          </span>
          <span className="text-base font-semibold text-foreground font-mono tabular-nums min-w-[80px] text-right">
            {formatCurrency(Number(donation.amount))}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link href={`/donations/${donation.id}/edit`} />}
              aria-label={`Edit donation to ${donation.organization_name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              aria-label={`Delete donation to ${donation.organization_name}`}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Pending Donation Row ──────────────────────────────────

function PendingDonationRow({
  donation,
  busy,
  onConfirm,
  onSkip,
}: {
  donation: Donation;
  busy: boolean;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">
              {donation.organization_name}
            </span>
            <Badge variant="secondary" className="gap-1 bg-warning/10 text-warning">
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
            {donation.is_recurring && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Recurring
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-mono">
              {format(new Date(donation.donation_date + "T00:00:00"), "MMM d, yyyy")}
            </span>
            <span className="font-mono tabular-nums text-foreground font-semibold">
              {formatCurrency(Number(donation.amount))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={busy}
            aria-label={`Skip pending donation to ${donation.organization_name}`}
          >
            <XIcon className="h-4 w-4 mr-1" />
            Skip
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={busy}
            aria-label={`Confirm pending donation to ${donation.organization_name}`}
          >
            <Check className="h-4 w-4 mr-1" />
            {busy ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Loading Skeleton ──────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
