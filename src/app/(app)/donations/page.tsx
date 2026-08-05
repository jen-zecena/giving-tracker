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
  Building2,
  HeartHandshake,
  Check,
  X as XIcon,
  Clock,
  List,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/nav/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
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
import { cn } from "@/lib/utils";
import type { Donation, CauseTag } from "@/types";

// ── Constants ─────────────────────────────────────────────

const CAUSE_TAGS: { value: CauseTag; label: string }[] = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "environment", label: "Environment" },
  { value: "poverty", label: "Poverty" },
  { value: "animal_welfare", label: "Animal welfare" },
  { value: "arts_culture", label: "Arts & culture" },
  { value: "disaster_relief", label: "Disaster relief" },
  { value: "human_rights", label: "Human rights" },
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

// DS eyebrow treatment — the only uppercase in the app (12px tracked mono).
const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.12em] text-text-faint";

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

  // DS controls: status tab (All / Pending; Recurring navigates away) and
  // a Table / Cards view toggle.
  const [statusTab, setStatusTab] = useState<"all" | "pending">("all");
  const [view, setView] = useState<"table" | "cards">("table");

  // Data state
  const [donations, setDonations] = useState<Donation[]>([]);
  const [pendingDonations, setPendingDonations] = useState<Donation[]>([]);
  const [summary, setSummary] = useState({
    count: 0,
    total: 0,
    organizations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
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

  // ── Derived ───────────────────────────────────────────

  const hasFilters = Boolean(search || causeFilter || yearFilter);
  const averageGift =
    summary.count > 0 ? Math.round(summary.total / summary.count) : 0;

  const summaryCells: [string, string][] = [
    ["Logged", `${summary.count} gift${summary.count === 1 ? "" : "s"}`],
    ["Total", formatCurrency(summary.total)],
    ["Average gift", formatCurrency(averageGift)],
    ["Organizations", String(summary.organizations)],
  ];

  // ── Render ────────────────────────────────────────────

  return (
    <>
      <PageHeader title="My giving" subtitle="Every gift you've logged" />

      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        {/* Summary strip — one white card, four divided columns */}
        <Card className="py-5">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {summaryCells.map(([label, value], i) => (
              <div
                key={label}
                className={cn(
                  "px-5 sm:px-6",
                  i > 0 && "lg:border-l lg:border-border",
                  i % 2 === 1 && "max-lg:border-l max-lg:border-border",
                  i >= 2 && "max-lg:mt-4"
                )}
              >
                <div className="text-xs text-muted-foreground">{label}</div>
                {loading ? (
                  <Skeleton className="mt-1.5 h-7 w-20" />
                ) : (
                  <div className="mt-1 font-mono text-[22px] font-semibold text-text-strong">
                    {value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Controls row — status tabs left, search + view toggle right */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs
            value={statusTab}
            onValueChange={(value) => {
              if (value === "recurring") {
                router.push("/donations/recurring");
                return;
              }
              setStatusTab(value as "all" | "pending");
            }}
          >
            <TabsList>
              <TabsTrigger value="all" className="px-2.5">
                All
                {!loading && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {summary.count}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="px-2.5">
                Pending
                {!loading && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {pendingDonations.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="recurring" className="px-2.5">
                Recurring
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint" />
              <Input
                placeholder="Search your giving…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Search your giving"
              />
            </div>
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as "table" | "cards")}
            >
              <TabsList>
                <TabsTrigger value="table" className="px-2.5">
                  Table
                </TabsTrigger>
                <TabsTrigger value="cards" className="px-2.5">
                  Cards
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Second compact row — cause / year / sort filters + export */}
        <div className="flex flex-wrap items-center gap-2.5">
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
            <SelectTrigger className="w-full sm:w-[120px]">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All years</SelectItem>
              {getYearOptions().map((y) => (
                <SelectItem key={y} value={y} className="font-mono">
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
            onClick={handleExportCSV}
            disabled={donations.length === 0}
            className="ml-auto shrink-0"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Pending section — needs action regardless of filters */}
        {!loading && pendingDonations.length > 0 && (
          <section id="pending" className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" aria-hidden />
              <h2 className="text-base font-semibold text-text-strong">
                Pending (
                <span className="font-mono">{pendingDonations.length}</span>)
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Confirm or skip these recurring gifts. They won&apos;t count
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

        {/* Pending tab with nothing waiting */}
        {!loading && statusTab === "pending" && pendingDonations.length === 0 && (
          <DashedEmpty
            icon={Clock}
            title="You're all caught up"
            description="Recurring gifts will wait here for your confirmation."
          />
        )}

        {/* Donation list — All tab only */}
        {loading ? (
          <LoadingSkeleton />
        ) : statusTab !== "all" ? null : donations.length === 0 ? (
          hasFilters && summary.count > 0 ? (
            <DashedEmpty
              icon={List}
              title="Nothing matches"
              description="Try a different filter, or log your next gift."
              action
            />
          ) : pendingDonations.length > 0 ? null : (
            <DashedEmpty
              icon={HeartHandshake}
              title="No donations yet"
              description="Log your first gift and it'll show up here."
              action
            />
          )
        ) : view === "table" ? (
          <Card className="gap-0 py-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn("px-4", EYEBROW, "font-medium")}>
                    Organization
                  </TableHead>
                  <TableHead className={cn("px-4", EYEBROW, "font-medium")}>
                    Date
                  </TableHead>
                  <TableHead className={cn("px-4", EYEBROW, "font-medium")}>
                    Cause
                  </TableHead>
                  <TableHead className={cn("px-4", EYEBROW, "font-medium")}>
                    Scope
                  </TableHead>
                  <TableHead
                    className={cn("px-4 text-right", EYEBROW, "font-medium")}
                  >
                    Amount
                  </TableHead>
                  <TableHead className="w-12 px-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donations.map((donation) => (
                  <DonationTableRow
                    key={donation.id}
                    donation={donation}
                    onDelete={() => {
                      setDeleteTarget(donation);
                      setDeleteDialogOpen(true);
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {donations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                onDelete={() => {
                  setDeleteTarget(donation);
                  setDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete donation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your{" "}
              {deleteTarget && (
                <span className="font-mono">
                  {formatCurrency(Number(deleteTarget.amount))}
                </span>
              )}{" "}
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
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Shared bits ───────────────────────────────────────────

function OrgIconSquare({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-soft text-green-700",
        size === "sm" ? "size-9" : "size-9.5"
      )}
      aria-hidden
    >
      <Building2 className={size === "sm" ? "h-4 w-4" : "h-4.5 w-4.5"} />
    </span>
  );
}

function RecurringBadge() {
  return (
    <Badge variant="secondary" className="bg-info-soft text-info">
      Recurring
    </Badge>
  );
}

function RowActionsMenu({
  donation,
  onDelete,
}: {
  donation: Donation;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for donation to ${donation.organization_name}`}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          render={<Link href={`/donations/${donation.id}/edit`} />}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Table row ─────────────────────────────────────────────

function DonationTableRow({
  donation,
  onDelete,
}: {
  donation: Donation;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="px-4 py-3">
        <span className="flex items-center gap-2.5">
          <OrgIconSquare />
          <span className="max-w-64 truncate font-semibold text-text-strong">
            {donation.organization_name}
          </span>
          {donation.is_recurring && <RecurringBadge />}
        </span>
      </TableCell>
      <TableCell className="px-4 py-3 font-mono text-sm">
        {format(
          new Date(donation.donation_date + "T00:00:00"),
          "MMM d, yyyy"
        )}
      </TableCell>
      <TableCell className="px-4 py-3">
        {donation.cause_tag ? (
          <Badge variant="outline">
            {CAUSE_LABEL_MAP[donation.cause_tag] ?? donation.cause_tag}
          </Badge>
        ) : (
          <span className="text-text-faint">—</span>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-muted-foreground">
        {SCOPE_LABELS[donation.scope] ?? donation.scope}
      </TableCell>
      <TableCell className="px-4 py-3 text-right font-mono font-semibold text-text-strong tabular-nums">
        {formatCurrency(Number(donation.amount))}
      </TableCell>
      <TableCell className="px-4 py-3 text-right">
        <RowActionsMenu donation={donation} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}

// ── Card view item ────────────────────────────────────────

function DonationCard({
  donation,
  onDelete,
}: {
  donation: Donation;
  onDelete: () => void;
}) {
  return (
    <Card className="gap-3">
      <CardContent className="flex items-center justify-between">
        <OrgIconSquare size="md" />
        <span className="flex items-center gap-1">
          {donation.is_recurring && <RecurringBadge />}
          <RowActionsMenu donation={donation} onDelete={onDelete} />
        </span>
      </CardContent>
      <CardContent>
        <div className="truncate font-semibold text-text-strong">
          {donation.organization_name}
        </div>
        <div className="mt-0.5 font-mono text-xs text-text-faint">
          {format(
            new Date(donation.donation_date + "T00:00:00"),
            "MMM d, yyyy"
          )}
        </div>
      </CardContent>
      <CardContent className="flex items-center justify-between">
        {donation.cause_tag ? (
          <Badge variant="outline">
            {CAUSE_LABEL_MAP[donation.cause_tag] ?? donation.cause_tag}
          </Badge>
        ) : (
          <Badge variant="outline">
            {SCOPE_LABELS[donation.scope] ?? donation.scope}
          </Badge>
        )}
        <span className="font-mono text-lg font-semibold text-text-strong tabular-nums">
          {formatCurrency(Number(donation.amount))}
        </span>
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
    <Card className="bg-warning-soft shadow-none ring-warning/25">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-card/80 text-warning"
            aria-hidden
          >
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-text-strong">
                {donation.organization_name}
              </span>
              <Badge variant="secondary" className="bg-warning/15 text-warning">
                <Clock className="h-3 w-3" />
                Pending
              </Badge>
              {donation.is_recurring && <RecurringBadge />}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-muted-foreground">
                {format(
                  new Date(donation.donation_date + "T00:00:00"),
                  "MMM d, yyyy"
                )}
              </span>
              <span className="font-mono font-semibold text-text-strong tabular-nums">
                {formatCurrency(Number(donation.amount))}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={busy}
            aria-label={`Skip pending donation to ${donation.organization_name}`}
          >
            <XIcon className="h-4 w-4" />
            Skip
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={busy}
            aria-label={`Confirm pending donation to ${donation.organization_name}`}
          >
            <Check className="h-4 w-4" />
            {busy ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty state (DS dashed block) ─────────────────────────

function DashedEmpty({
  icon: Icon,
  title,
  description,
  action = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-6 py-12 text-center">
      <span
        className="mx-auto flex size-11 items-center justify-center rounded-full bg-brand-soft text-green-700"
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-text-strong">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <Button
          size="sm"
          className="mt-5"
          render={<Link href="/donations/new" />}
        >
          Log a donation
        </Button>
      )}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4">
            <Skeleton className="size-9 rounded-lg" />
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
