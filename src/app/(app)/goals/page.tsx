"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Plus, Target, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/nav/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Order mirrors the Figma Make dialog: count first, then amount, orgs, causes.
const TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "count", label: "Number of Donations" },
  { value: "amount", label: "Total Amount ($)" },
  { value: "organizations", label: "Different Organizations" },
  { value: "causes", label: "Different Causes" },
];

const TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string }[] = [
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "ongoing", label: "Ongoing" },
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
    toast.success("Goal deleted");
    setDeleteTarget(null);
    startTransition(() => {
      fetchGoals();
    });
  }

  const summary = summarizeGoals(goals);
  const showSummary = goals.length > 0;

  return (
    <>
      <PageHeader
        title="Personal Goals"
        subtitle="Set and track your giving journey"
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Info Banner — matches Figma Make gradient card */}
          <Card className="mb-8 border-[color:var(--info)]/30 bg-gradient-to-r from-[color:var(--metric-blue)] to-[color:var(--metric-purple)]">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Target
                  className="mt-1 h-8 w-8 flex-shrink-0 text-[color:var(--info)]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Your Personal Giving Journey
                  </h3>
                  <p className="text-foreground/80">
                    Set meaningful goals that reflect your values and giving
                    style. These are private and just for you — no pressure,
                    no competition, just tracking what matters to you.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Header row */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                My Goals
              </h2>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading your goals..."
                  : `${goals.length} active ${
                      goals.length === 1 ? "goal" : "goals"
                    }`}
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </div>

          {/* Body */}
          {loading ? (
            <LoadingSkeleton />
          ) : goals.length === 0 ? (
            <EmptyState onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={() => setDeleteTarget(goal)}
                />
              ))}
            </div>
          )}

          {/* Quick Stats footer */}
          {showSummary && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
                <CardDescription>Overview of all your goals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <SummaryStat
                    value={summary.completed}
                    label="Completed"
                    colorClass="text-[color:var(--info)]"
                  />
                  <SummaryStat
                    value={summary.inProgress}
                    label="In Progress"
                    colorClass="text-[color:var(--chart-2)]"
                  />
                  <SummaryStat
                    value={summary.total}
                    label="Total Goals"
                    colorClass="text-muted-foreground"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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
      <CardContent className="pt-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {goal.title}
              </h3>
              {complete && (
                <Badge className="bg-[color:var(--success)] text-white hover:bg-[color:var(--success)]/90">
                  <Check className="mr-1 h-3 w-3" />
                  Complete
                </Badge>
              )}
              <Badge variant="outline">
                {GOAL_TIMEFRAME_LABELS[goal.timeframe]}
              </Badge>
            </div>
            {goal.description && (
              <p className="mb-3 text-sm text-muted-foreground">
                {goal.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{GOAL_TYPE_LABELS[goal.type]}</span>
              <span aria-hidden="true">•</span>
              <span className="font-medium text-foreground font-mono">
                {formatGoalValue(goal.current, goal.type)} of{" "}
                {formatGoalValue(goal.target, goal.type)}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            aria-label={`Delete goal ${goal.title}`}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Progress value={percent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>{Math.round(percent)}% complete</span>
            {!complete && goal.timeframe !== "ongoing" && (
              <span>{remainingLabel(goal)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function remainingLabel(goal: Goal): string {
  const remaining = Math.max(goal.target - goal.current, 0);
  const formatted = formatGoalValue(remaining, goal.type);
  if (goal.type === "amount") return `${formatted} remaining`;
  const unit =
    goal.type === "count"
      ? remaining === 1
        ? "donation"
        : "donations"
      : goal.type === "organizations"
        ? remaining === 1
          ? "organization"
          : "organizations"
        : remaining === 1
          ? "cause"
          : "causes";
  return `${formatted} ${unit} remaining`;
}

// ── Summary Footer ────────────────────────────────────────

function SummaryStat({
  value,
  label,
  colorClass,
}: {
  value: number;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="text-center">
      <div
        className={`text-3xl font-bold font-mono tracking-tight ${colorClass}`}
      >
        {value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card>
      <CardContent className="pt-12 pb-12 text-center">
        <Target
          className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40"
          aria-hidden="true"
        />
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          No Goals Yet
        </h3>
        <p className="mb-6 text-muted-foreground">
          Create your first personal goal to start tracking your giving journey
        </p>
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Your First Goal
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Loading Skeleton ──────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
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
  const [type, setType] = useState<GoalType>("count");
  const [target, setTarget] = useState("");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>("year");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setType("count");
    setTarget("");
    setTimeframe("year");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedTarget = Number(target);
    if (!title.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      toast.error("Please fill in all required fields");
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
    toast.success("Goal created!");
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Create a New Goal</DialogTitle>
            <DialogDescription>
              Set a personal goal for your giving journey. This is private and
              just for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="goal-title">Goal Title *</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Support local charities"
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
              placeholder="Why is this goal meaningful to you?"
              maxLength={280}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-type">Goal Type *</Label>
              <Select
                value={type}
                onValueChange={(v) => setType((v ?? "count") as GoalType)}
              >
                <SelectTrigger id="goal-type" className="w-full">
                  <SelectValue>
                    {(v: string | null) => {
                      if (!v) return null;
                      const opt = TYPE_OPTIONS.find((o) => o.value === v);
                      return opt?.label ?? null;
                    }}
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
              <Label htmlFor="goal-target">Target *</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g., 10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-timeframe">Timeframe *</Label>
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
              {submitting ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
