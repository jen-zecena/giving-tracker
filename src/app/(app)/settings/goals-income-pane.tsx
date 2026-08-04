"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import {
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
} from "@/lib/actions/goals";
import { updateSettings } from "@/lib/actions/profile";
import { celebrateGoal, newlyCompletedGoalIds } from "@/lib/celebrations";
import {
  formatGoalValue,
  isGoalComplete,
  progressPercent,
  summarizeGoals,
} from "@/lib/goals-display";
import type { Goal, GoalTimeframe, GoalType } from "@/types";

// ── Constants ─────────────────────────────────────────────

// Sentence-case (DS voice) variants of the shared goals-display labels.
// The Title Case originals in lib/goals-display stay untouched — they're
// covered by tests and predate the redesign.
const TYPE_LABELS: Record<GoalType, string> = {
  amount: "Total amount",
  count: "Number of donations",
  organizations: "Different organizations",
  causes: "Different causes",
};

const TIMEFRAME_LABELS: Record<GoalTimeframe, string> = {
  month: "This month",
  year: "This year",
  ongoing: "Ongoing",
};

// Order mirrors the original Goals dialog: count first, then amount,
// orgs, causes.
const TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "count", label: TYPE_LABELS.count },
  { value: "amount", label: `${TYPE_LABELS.amount} ($)` },
  { value: "organizations", label: TYPE_LABELS.organizations },
  { value: "causes", label: TYPE_LABELS.causes },
];

const TIMEFRAME_OPTIONS: { value: GoalTimeframe; label: string }[] = [
  { value: "month", label: TIMEFRAME_LABELS.month },
  { value: "year", label: TIMEFRAME_LABELS.year },
  { value: "ongoing", label: TIMEFRAME_LABELS.ongoing },
];

// ── Pane ──────────────────────────────────────────────────

/**
 * DS Settings → "Goals & income" pane. Carries the income (salary) field
 * that used to live on the flat settings form, plus the full goals
 * list/create/edit/delete experience relocated from the old /goals page
 * (which now redirects here).
 */
export function GoalsIncomePane({ initialSalary }: { initialSalary: string }) {
  return (
    <>
      <IncomeCard initialSalary={initialSalary} />
      <GoalsCard />
    </>
  );
}

// ── Income ────────────────────────────────────────────────

function IncomeCard({ initialSalary }: { initialSalary: string }) {
  const [salary, setSalary] = useState(initialSalary);
  const [saved, setSaved] = useState(initialSalary);
  const [isPending, startTransition] = useTransition();

  const dirty = salary !== saved;

  function handleSave() {
    const parsed =
      salary.trim() === "" ? null : Number(salary.replace(/[,$\s]/g, ""));

    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error("Income must be a positive number.");
      return;
    }

    startTransition(async () => {
      const result = await updateSettings({ salary: parsed });
      if (result.error) {
        toast.error(result.error);
      } else {
        setSaved(salary);
        toast.success(parsed === null ? "Income cleared." : "Income saved.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income</CardTitle>
        <CardDescription>
          Used only to calculate your percentage. Encrypted, and never shown
          to anyone.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2.5">
        <div className="relative w-full max-w-[260px]">
          <span
            className="absolute top-1/2 left-2.5 -translate-y-1/2 font-mono text-sm text-muted-foreground"
            aria-hidden
          >
            $
          </span>
          <Input
            aria-label="Yearly income"
            inputMode="numeric"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            placeholder="Not set"
            className="pl-6 font-mono"
            disabled={isPending}
          />
        </div>
        <Button onClick={handleSave} disabled={!dirty || isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Goals ─────────────────────────────────────────────────

function GoalsCard() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Goal | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tracks the goals snapshot from the previous fetch so we can fire
  // celebrateGoal() exactly once per not-complete → complete transition.
  // Ref rather than state because we don't want refs to re-render on write.
  const previousGoalsRef = useRef<Goal[]>([]);
  // Skip the celebration diff on the very first load — otherwise every
  // already-completed goal would fire confetti on pane mount.
  const hasLoadedOnceRef = useRef(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listGoals();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const nextGoals = result.data ?? [];
      if (hasLoadedOnceRef.current) {
        const newlyComplete = newlyCompletedGoalIds(
          previousGoalsRef.current,
          nextGoals
        );
        if (newlyComplete.length > 0) {
          celebrateGoal();
        }
      }
      previousGoalsRef.current = nextGoals;
      hasLoadedOnceRef.current = true;
      setGoals(nextGoals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditTarget(goal);
    setDialogOpen(true);
  }

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

  return (
    <>
      <Card className="gap-4 pb-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Personal goals</CardTitle>
          <CardDescription>
            {loading
              ? "Loading your goals…"
              : goals.length === 0
                ? "Private and just for you."
                : `${goals.length} active ${
                    goals.length === 1 ? "goal" : "goals"
                  } — private and just for you.`}
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-3.5" aria-hidden />
              New goal
            </Button>
          </CardAction>
        </CardHeader>

        {loading ? (
          <GoalsSkeleton />
        ) : goals.length === 0 ? (
          <GoalsEmptyState onCreate={openCreate} />
        ) : (
          <div>
            {goals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                onEdit={() => openEdit(goal)}
                onDelete={() => setDeleteTarget(goal)}
              />
            ))}
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-border bg-surface-sunken/60 px-6 py-3 text-sm text-muted-foreground">
              <SummaryStat value={summary.completed} label="completed" />
              <SummaryStat value={summary.inProgress} label="in progress" />
              <SummaryStat value={summary.total} label="total" />
            </div>
          </div>
        )}
      </Card>

      <GoalDialog
        open={dialogOpen}
        goal={editTarget}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setEditTarget(null);
        }}
        onSaved={() => {
          setDialogOpen(false);
          setEditTarget(null);
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
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Goal row ──────────────────────────────────────────────

function GoalRow({
  goal,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const complete = isGoalComplete(goal);
  const percent = progressPercent(goal.current, goal.target);

  return (
    <div className="grid gap-2.5 border-t border-border px-6 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-text-strong">
              {goal.title}
            </span>
            <Badge variant="outline">{TIMEFRAME_LABELS[goal.timeframe]}</Badge>
            {complete && (
              <Badge variant="secondary">
                <Check aria-hidden />
                Complete
              </Badge>
            )}
          </div>
          {goal.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {goal.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`Edit goal ${goal.title}`}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={`Delete goal ${goal.title}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-muted-foreground">{TYPE_LABELS[goal.type]}</span>
        <span className="font-mono font-semibold text-text-strong">
          {formatGoalValue(goal.current, goal.type)}
          <span className="font-normal text-muted-foreground">
            {" / "}
            {formatGoalValue(goal.target, goal.type)}
          </span>
        </span>
      </div>

      <Progress value={percent} className="h-2" />
      <div className="flex justify-between font-mono text-xs text-text-faint">
        <span>{Math.round(percent)}% complete</span>
        {!complete && goal.timeframe !== "ongoing" && (
          <span>{remainingLabel(goal)}</span>
        )}
      </div>
    </div>
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

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="font-mono font-semibold text-text-strong">{value}</span>{" "}
      {label}
    </span>
  );
}

// ── Empty state ───────────────────────────────────────────

function GoalsEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid justify-items-center gap-2 border-t border-border px-6 py-10 text-center">
      <span className="mb-1 inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Target className="size-5" aria-hidden />
      </span>
      <h3 className="font-semibold text-text-strong">No goals yet</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Set a personal goal to start tracking your giving journey.
      </p>
      <Button size="sm" className="mt-2 mb-2" onClick={onCreate}>
        <Plus className="size-3.5" aria-hidden />
        Create your first goal
      </Button>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────

function GoalsSkeleton() {
  return (
    <div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="grid gap-2.5 border-t border-border px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="size-7 shrink-0 rounded-md" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

// ── Create / edit dialog ──────────────────────────────────

function GoalDialog({
  open,
  goal,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  /** When set, the dialog edits this goal; otherwise it creates one. */
  goal: Goal | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {/* Keyed remount initializes the form from the goal being edited
            (or blank for create); the popup unmounts on close, so state
            never leaks between sessions. */}
        <GoalForm
          key={goal?.id ?? "new"}
          goal={goal}
          onCancel={() => onOpenChange(false)}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({
  goal,
  onCancel,
  onSaved,
}: {
  goal: Goal | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const editing = goal !== null;

  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [type, setType] = useState<GoalType>(goal?.type ?? "count");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [timeframe, setTimeframe] = useState<GoalTimeframe>(
    goal?.timeframe ?? "year"
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedTarget = Number(target);
    if (!title.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      type,
      target: parsedTarget,
      timeframe,
    };

    setSubmitting(true);
    const result = editing
      ? await updateGoal(goal.id, payload)
      : await createGoal(payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Goal updated." : "Goal created!");
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {editing ? "Edit goal" : "Create a new goal"}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? "Adjust the goal whenever your plans change."
            : "Set a personal goal for your giving journey. This is private and just for you."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Label htmlFor="goal-title">Title</Label>
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
        <Label htmlFor="goal-description">
          Description
          <span className="font-normal text-text-faint">Optional</span>
        </Label>
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
          <Label htmlFor="goal-type">Type</Label>
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
          <Label htmlFor="goal-target">Target</Label>
          <Input
            id="goal-target"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g., 10"
            className="font-mono"
            required
          />
        </div>
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
                v ? TIMEFRAME_LABELS[v as GoalTimeframe] : null
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
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : editing ? "Save changes" : "Create goal"}
        </Button>
      </DialogFooter>
    </form>
  );
}
