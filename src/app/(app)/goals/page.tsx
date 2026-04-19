"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Info,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/nav/page-header";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { createGoal, deleteGoal, listGoals } from "@/lib/actions/goals";
import {
  GOAL_TIMEFRAME_LABELS,
  GOAL_TYPE_LABELS,
  formatGoalValue,
  isGoalComplete,
  progressPercent,
  summarizeGoals,
} from "@/lib/goals-display";
import type { Goal, GoalTimeframe, GoalType } from "@/types";

// ── Constants ─────────────────────────────────────────────

const TYPE_OPTIONS: { value: GoalType; label: string; hint: string }[] = [
  { value: "amount", label: "Total amount", hint: "Reach a dollar target" },
  { value: "count", label: "Number of donations", hint: "Give N times" },
  {
    value: "organizations",
    label: "Unique organizations",
    hint: "Support N distinct orgs",
  },
  { value: "causes", label: "Unique causes", hint: "Spread giving across causes" },
];

const TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "ongoing", label: "All time" },
];

// ── Page ──────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listGoals();
      if (result.error) {
        toast.error(result.error);
      } else if (result.data) {
        setGoals(result.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteGoal(deleteTarget.id);
    setDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Deleted "${deleteTarget.title}"`);
    setDeleteTarget(null);
    startTransition(() => {
      fetchGoals();
    });
  }

  const summary = summarizeGoals(goals);

  return (
    <>
      <PageHeader
        title="Personal Goals"
        subtitle="Set targets for your giving and track your progress"
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Alert>
          <Info />
          <AlertTitle>Goals update automatically</AlertTitle>
          <AlertDescription>
            Progress reflects your confirmed donations — no need to update
            anything by hand. Month/year goals reset on the first of each
            period.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading your goals..."
              : goals.length === 0
                ? "Create your first goal to start tracking progress."
                : `${goals.length} goal${goals.length === 1 ? "" : "s"}`}
          </p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New goal
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Set a personal goal to keep your giving intentional — a dollar target, a number of donations, or a spread across causes."
            action={{
              label: "Create your first goal",
              onClick: () => setCreateOpen(true),
            }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={() => setDeleteTarget(goal)}
                />
              ))}
            </div>

            <SummaryFooter summary={summary} />
          </>
        )}
      </div>

      <CreateGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          startTransition(() => {
            fetchGoals();
          });
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.title}" will be removed. Your donations aren't affected.`
                : null}
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

// ── Goal Card ─────────────────────────────────────────────

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: () => void }) {
  const complete = isGoalComplete(goal);
  const percent = progressPercent(goal.current, goal.target);

  return (
    <Card
      className={
        complete
          ? "border-[color:var(--success)]/30 bg-[color:var(--success)]/10"
          : undefined
      }
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              {complete && (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-[color:var(--success)]"
                  aria-label="Goal completed"
                />
              )}
              <h3 className="truncate font-semibold text-foreground">
                {goal.title}
              </h3>
            </div>
            {goal.description && (
              <p className="text-sm text-muted-foreground">
                {goal.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Delete goal ${goal.title}`}
            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{GOAL_TYPE_LABELS[goal.type]}</Badge>
          <Badge variant="outline">{GOAL_TIMEFRAME_LABELS[goal.timeframe]}</Badge>
          {complete && (
            <Badge className="bg-[color:var(--success)] text-white">
              Complete
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-mono font-medium text-foreground">
              {formatGoalValue(goal.current, goal.type)}
            </span>
            <span className="font-mono text-muted-foreground">
              of {formatGoalValue(goal.target, goal.type)}
            </span>
          </div>
          <Progress value={percent} className="h-2" />
          <p className="font-mono text-xs text-muted-foreground">
            {Math.round(percent)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Summary Footer ────────────────────────────────────────

function SummaryFooter({
  summary,
}: {
  summary: { total: number; completed: number; inProgress: number };
}) {
  return (
    <Card>
      <CardContent className="grid grid-cols-3 gap-4 p-5">
        <SummaryStat label="Completed" value={summary.completed} />
        <SummaryStat label="In progress" value={summary.inProgress} />
        <SummaryStat label="Total goals" value={summary.total} />
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Create Dialog ─────────────────────────────────────────

function CreateGoalDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<GoalType>("amount");
  const [target, setTarget] = useState("");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>("year");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setType("amount");
    setTarget("");
    setTimeframe("year");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedTarget = Number(target);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      toast.error("Target must be greater than zero.");
      return;
    }

    setSubmitting(true);
    const result = await createGoal({
      title: title.trim(),
      description: description.trim() || null,
      type,
      target: parsedTarget,
      timeframe,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Goal created");
    reset();
    onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New personal goal</DialogTitle>
            <DialogDescription>
              Pick a type and a target — progress updates from your confirmed
              donations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give $1,000 this year"
              maxLength={80}
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description">Description (optional)</Label>
            <Textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this goal matters to you"
              maxLength={280}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType((v ?? "amount") as GoalType)}
              >
                <SelectTrigger id="goal-type" className="w-full">
                  <SelectValue>
                    {(v: string | null) =>
                      v ? GOAL_TYPE_LABELS[v as GoalType] : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-timeframe">Timeframe</Label>
              <Select
                value={timeframe}
                onValueChange={(v) =>
                  setTimeframe((v ?? "year") as GoalTimeframe)
                }
              >
                <SelectTrigger id="goal-timeframe" className="w-full">
                  <SelectValue>
                    {(v: string | null) =>
                      v ? GOAL_TIMEFRAME_LABELS[v as GoalTimeframe] : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-target">
              Target {type === "amount" ? "(USD)" : ""}
            </Label>
            <Input
              id="goal-target"
              type="number"
              inputMode="decimal"
              min={type === "amount" ? "1" : "1"}
              step={type === "amount" ? "1" : "1"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={type === "amount" ? "1000" : "5"}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
