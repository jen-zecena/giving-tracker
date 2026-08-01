"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Shield,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateFlagStatus } from "@/lib/actions/nonprofit-flags";
import {
  countFlagStats,
  splitFlagsByTab,
  type ReviewQueueFlag,
} from "@/lib/queries/admin-flags-helpers";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  flags: ReviewQueueFlag[];
};

export function ReviewQueueClient({ flags }: Props) {
  // Per-card expand state. We track only the id of the actively-being-
  // reviewed flag so opening one closes any other (matches Figma).
  const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const buckets = useMemo(() => splitFlagsByTab(flags), [flags]);
  const stats = useMemo(() => countFlagStats(flags), [flags]);

  const closeReview = () => {
    setExpandedFlagId(null);
    setAdminNotes("");
    setPendingId(null);
  };

  const handleResolve = (
    flagId: string,
    nextStatus: "resolved" | "dismissed"
  ) => {
    if (!adminNotes.trim()) {
      toast.error("Please add admin notes");
      return;
    }

    setPendingId(flagId);
    startTransition(async () => {
      const result = await updateFlagStatus({
        flagId,
        status: nextStatus,
        adminNotes,
      });
      if (result.error) {
        toast.error(result.error);
        setPendingId(null);
        return;
      }
      toast.success(
        nextStatus === "resolved" ? "Flag resolved" : "Flag dismissed"
      );
      closeReview();
      // Refresh the server component so stats + tab counts reflect the
      // mutation. revalidatePath in the action invalidates the cache;
      // router.refresh() re-runs the page component.
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Admin Review Queue
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.pending} pending review
            </p>
          </div>
        </div>
      </header>

      {/* Info banner */}
      <Card className="bg-warning/10 border-warning/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-warning flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Community Moderation
              </h3>
              <p className="text-muted-foreground">
                Review flagged organizations reported by community members.
                Ensure the nonprofit directory maintains high quality and
                trustworthy information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Pending Review"
          value={stats.pending}
          tone="warning"
          icon={<AlertTriangle className="w-4 h-4" />}
          caption="Needs attention"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          tone="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
          caption="Action taken"
        />
        <StatCard
          label="Dismissed"
          value={stats.dismissed}
          tone="muted"
          icon={<XCircle className="w-4 h-4" />}
          caption="No action needed"
        />
        <StatCard
          label="Total Reports"
          value={stats.total}
          tone="muted"
          caption="All time"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({buckets.pending.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({buckets.reviewed.length})
          </TabsTrigger>
          <TabsTrigger value="dismissed">
            Dismissed ({buckets.dismissed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {buckets.pending.length === 0 ? (
            <EmptyState
              icon={
                <CheckCircle2 className="w-12 h-12 text-success/40 mx-auto mb-4" />
              }
              message="No pending flags to review"
            />
          ) : (
            buckets.pending.map((flag) => (
              <FlagCard
                key={flag.id}
                flag={flag}
                isExpanded={expandedFlagId === flag.id}
                isPending={isPending && pendingId === flag.id}
                adminNotes={adminNotes}
                onAdminNotesChange={setAdminNotes}
                onStartReview={() => {
                  setExpandedFlagId(flag.id);
                  setAdminNotes("");
                }}
                onCancelReview={closeReview}
                onResolve={() => handleResolve(flag.id, "resolved")}
                onDismiss={() => handleResolve(flag.id, "dismissed")}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4 mt-6">
          {buckets.reviewed.length === 0 ? (
            <EmptyState message="No reviewed flags" />
          ) : (
            buckets.reviewed.map((flag) => (
              <FlagCard key={flag.id} flag={flag} />
            ))
          )}
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-4 mt-6">
          {buckets.dismissed.length === 0 ? (
            <EmptyState message="No dismissed flags" />
          ) : (
            buckets.dismissed.map((flag) => (
              <FlagCard key={flag.id} flag={flag} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────

type StatTone = "warning" | "success" | "muted";

function StatCard({
  label,
  value,
  tone,
  icon,
  caption,
}: {
  label: string;
  value: number;
  tone: StatTone;
  icon?: React.ReactNode;
  caption: string;
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-muted-foreground";
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-mono tracking-tight">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-2 text-sm ${toneClass}`}>
          {icon}
          <span>{caption}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Flag card ────────────────────────────────────────────────────────

type FlagCardProps = {
  flag: ReviewQueueFlag;
  isExpanded?: boolean;
  isPending?: boolean;
  adminNotes?: string;
  onAdminNotesChange?: (value: string) => void;
  onStartReview?: () => void;
  onCancelReview?: () => void;
  onResolve?: () => void;
  onDismiss?: () => void;
};

function FlagCard({
  flag,
  isExpanded = false,
  isPending = false,
  adminNotes = "",
  onAdminNotesChange,
  onStartReview,
  onCancelReview,
  onResolve,
  onDismiss,
}: FlagCardProps) {
  const nonprofit = flag.nonprofit;
  const reporterName = flag.reporter_display_name ?? "Unknown reporter";
  const notesId = `notes-${flag.id}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <CardTitle className="text-lg">
                {nonprofit?.name ?? "Unknown Nonprofit"}
              </CardTitle>
              <Badge variant="outline" className="capitalize">
                {flag.reason}
              </Badge>
            </div>
            <CardDescription>
              Reported by {reporterName} on{" "}
              {format(new Date(flag.created_at), "MMM d, yyyy")}
            </CardDescription>
          </div>
          {flag.status !== "pending" && (
            <Badge
              variant={
                flag.status === "resolved"
                  ? "default"
                  : flag.status === "dismissed"
                    ? "secondary"
                    : "outline"
              }
              className="capitalize"
            >
              {flag.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {flag.description && (
          <div>
            <Label className="text-sm font-medium mb-1 block">
              Description
            </Label>
            <p className="text-sm text-muted-foreground">{flag.description}</p>
          </div>
        )}

        {nonprofit && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">EIN:</span>{" "}
                <span className="font-mono">{nonprofit.ein}</span>
              </p>
              {nonprofit.location && (
                <p>
                  <span className="font-medium">Location:</span>{" "}
                  {nonprofit.location}
                </p>
              )}
              <p>
                <span className="font-medium">Verified:</span>{" "}
                {nonprofit.verified ? "Yes" : "No"}
              </p>
            </div>
            <Button
              variant="link"
              size="sm"
              className="mt-2 p-0 h-auto"
              render={<Link href={`/nonprofits/${nonprofit.id}`} />}
            >
              <Eye className="w-4 h-4 mr-1" />
              View Full Details
            </Button>
          </div>
        )}

        {flag.admin_notes && (
          <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
            <Label className="text-sm font-medium mb-1 block">
              Admin Notes
            </Label>
            <p className="text-sm text-muted-foreground">{flag.admin_notes}</p>
          </div>
        )}

        {flag.status === "pending" && (
          <div className="space-y-3 pt-2 border-t border-border">
            {isExpanded && (
              <div className="space-y-2">
                <Label htmlFor={notesId}>Admin Notes</Label>
                <Textarea
                  id={notesId}
                  value={adminNotes}
                  onChange={(e) => onAdminNotesChange?.(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {!isExpanded ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStartReview}
                  disabled={!onStartReview}
                >
                  Review
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={onResolve}
                    disabled={isPending}
                    className="bg-success text-white hover:bg-success/90"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Resolve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onDismiss}
                    disabled={isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onCancelReview}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Empty state ──────────────────────────────────────────────────────

function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6 text-center py-12">
        {icon}
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
