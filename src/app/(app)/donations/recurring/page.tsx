"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";

import { PageHeader } from "@/components/nav/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

import {
  createRecurringSchedule,
  deleteRecurringSchedule,
  listRecurringSchedules,
  pauseRecurringSchedule,
  resumeRecurringSchedule,
  updateRecurringSchedule,
} from "@/lib/actions/recurring";
import {
  CAUSE_TAG_LABELS,
  CAUSE_TAG_OPTIONS,
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  SCOPE_LABELS,
  SCOPE_OPTIONS,
  formatCurrency,
  formatDueDate,
  frequencyBgClass,
  sortSchedulesForList,
} from "@/lib/recurring-display";
import type {
  CauseTag,
  DonationScope,
  RecurringFrequency,
  RecurringSchedule,
} from "@/types";

// `cause_tag` of "" maps to null on submit — the Select primitive can't
// bind a null value directly.
const NO_CAUSE = "";

type FormState = {
  organization_name: string;
  amount: string;
  frequency: RecurringFrequency;
  scope: DonationScope;
  cause_tag: CauseTag | typeof NO_CAUSE;
  custom_tag: string;
  next_due_date: string;
};

function emptyForm(): FormState {
  // Default next-due to tomorrow so the user doesn't accidentally set it
  // in the past.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    organization_name: "",
    amount: "",
    frequency: "monthly",
    scope: "national",
    cause_tag: NO_CAUSE,
    custom_tag: "",
    next_due_date: tomorrow.toISOString().split("T")[0],
  };
}

function scheduleToForm(s: RecurringSchedule): FormState {
  return {
    organization_name: s.organization_name,
    amount: String(s.amount),
    frequency: s.frequency,
    scope: s.scope,
    cause_tag: (s.cause_tag ?? NO_CAUSE) as CauseTag | typeof NO_CAUSE,
    custom_tag: s.custom_tag ?? "",
    next_due_date: s.next_due_date,
  };
}

function formToPayload(form: FormState) {
  return {
    organization_name: form.organization_name,
    amount: Number(form.amount),
    frequency: form.frequency,
    scope: form.scope,
    cause_tag: form.cause_tag === NO_CAUSE ? null : form.cause_tag,
    custom_tag: form.custom_tag,
    next_due_date: form.next_due_date,
  };
}

export default function RecurringPage() {
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm());
  const [creating, setCreating] = useState(false);

  const [editTarget, setEditTarget] = useState<RecurringSchedule | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());
  const [editing, setEditing] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<RecurringSchedule | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const [toggling, setToggling] = useState<string | null>(null);

  // ── Initial load ─────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const res = await listRecurringSchedules();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setSchedules(sortSchedulesForList(res.data ?? []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Create ───────────────────────────────────────────────
  function openCreate() {
    setCreateForm(emptyForm());
    setCreateOpen(true);
  }

  async function handleCreate() {
    setCreating(true);
    const res = await createRecurringSchedule(formToPayload(createForm));
    setCreating(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Recurring schedule created");
    setCreateOpen(false);
    startTransition(() => void refresh());
  }

  // ── Edit ─────────────────────────────────────────────────
  function openEdit(s: RecurringSchedule) {
    setEditTarget(s);
    setEditForm(scheduleToForm(s));
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditing(true);
    const res = await updateRecurringSchedule(
      editTarget.id,
      formToPayload(editForm)
    );
    setEditing(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Schedule updated");
    setEditTarget(null);
    startTransition(() => void refresh());
  }

  // ── Delete ───────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteRecurringSchedule(deleteTarget.id);
    setDeleting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Canceled recurring donation to ${deleteTarget.organization_name}`);
    setDeleteTarget(null);
    startTransition(() => void refresh());
  }

  // ── Pause / Resume ───────────────────────────────────────
  async function handleToggleActive(s: RecurringSchedule) {
    setToggling(s.id);
    const res = s.is_active
      ? await pauseRecurringSchedule(s.id)
      : await resumeRecurringSchedule(s.id);
    setToggling(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(s.is_active ? "Schedule paused" : "Schedule resumed");
    startTransition(() => void refresh());
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Recurring Donations"
        subtitle="Manage your scheduled donations"
        showAddButton={false}
      />

      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ── Top action bar ─────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Repeat className="h-4 w-4" />
            <span>
              {loading
                ? "Loading schedules..."
                : `${schedules.length} ${schedules.length === 1 ? "schedule" : "schedules"}`}
            </span>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Recurring
          </Button>
        </div>

        {/* ── Body ───────────────────────────────────────── */}
        {loading ? (
          <LoadingGrid />
        ) : schedules.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No recurring donations"
            description="Set up a schedule to automate pending donations for a cause you give to regularly."
            action={{ label: "New Recurring", onClick: openCreate }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {schedules.map((s) => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleteTarget(s)}
                onToggleActive={() => handleToggleActive(s)}
                isToggling={toggling === s.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create dialog ──────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New recurring donation</DialogTitle>
            <DialogDescription>
              We&apos;ll create a pending donation on the schedule you set.
              You confirm each one.
            </DialogDescription>
          </DialogHeader>
          <ScheduleForm form={createForm} onChange={setCreateForm} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !canSubmit(createForm)}
            >
              {creating ? "Creating..." : "Create schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit recurring donation</DialogTitle>
            <DialogDescription>
              Changes apply to future pending donations only.
            </DialogDescription>
          </DialogHeader>
          <ScheduleForm form={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editing || !canSubmit(editForm)}
            >
              {editing ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel alert ──────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel recurring donation?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the schedule for{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.organization_name}
              </span>
              . Past donations are preserved, but no new pending donations
              will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Canceling..." : "Cancel schedule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Schedule card ────────────────────────────────────────────

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onToggleActive,
  isToggling,
}: {
  schedule: RecurringSchedule;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isToggling: boolean;
}) {
  const paused = !schedule.is_active;
  const freqLabel = FREQUENCY_LABELS[schedule.frequency];
  const scopeLabel = SCOPE_LABELS[schedule.scope];
  const causeLabel = schedule.cause_tag
    ? CAUSE_TAG_LABELS[schedule.cause_tag]
    : null;

  return (
    <Card className={paused ? "opacity-75" : undefined}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${frequencyBgClass(schedule.frequency)}`}
          >
            <Building2 className="h-5 w-5 text-foreground/80" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">
              {schedule.organization_name}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {freqLabel} · Next: {formatDueDate(schedule.next_due_date)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-semibold font-mono tabular-nums text-foreground">
              {formatCurrency(schedule.amount)}
            </p>
            {paused && (
              <Badge
                variant="secondary"
                className="mt-1 bg-warning/15 text-warning"
              >
                Paused
              </Badge>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{scopeLabel}</Badge>
          {causeLabel && <Badge variant="outline">{causeLabel}</Badge>}
          {schedule.custom_tag && (
            <Badge variant="outline">{schedule.custom_tag}</Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5 border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleActive}
            disabled={isToggling}
            aria-label={paused ? "Resume schedule" : "Pause schedule"}
          >
            {paused ? (
              <>
                <Play className="mr-1 h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="mr-1 h-4 w-4" />
                Pause
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={`Edit ${schedule.organization_name}`}
          >
            <Pencil className="mr-1 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Cancel schedule for ${schedule.organization_name}`}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Schedule form (shared by create + edit dialogs) ─────────

function ScheduleForm({
  form,
  onChange,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
}) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="org">Organization</Label>
        <Input
          id="org"
          value={form.organization_name}
          onChange={(e) => set("organization_name", e.target.value)}
          placeholder="Red Cross, Food Bank, ..."
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="amount">Amount ($)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="frequency">Frequency</Label>
          <Select
            value={form.frequency}
            onValueChange={(v) => set("frequency", v as RecurringFrequency)}
          >
            <SelectTrigger id="frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="next-due">Next due date</Label>
          <Input
            id="next-due"
            type="date"
            value={form.next_due_date}
            onChange={(e) => set("next_due_date", e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="scope">Scope</Label>
          <Select
            value={form.scope}
            onValueChange={(v) => set("scope", v as DonationScope)}
          >
            <SelectTrigger id="scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="cause">Cause</Label>
          <Select
            value={form.cause_tag}
            onValueChange={(v) =>
              set("cause_tag", (v as CauseTag | typeof NO_CAUSE) ?? NO_CAUSE)
            }
          >
            <SelectTrigger id="cause">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CAUSE}>None</SelectItem>
              {CAUSE_TAG_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="custom-tag">Custom tag (optional)</Label>
          <Input
            id="custom-tag"
            value={form.custom_tag}
            onChange={(e) => set("custom_tag", e.target.value)}
            placeholder="Tithe, Pledge, ..."
            maxLength={40}
          />
        </div>
      </div>
    </div>
  );
}

function canSubmit(form: FormState): boolean {
  if (!form.organization_name.trim()) return false;
  const n = Number(form.amount);
  if (!Number.isFinite(n) || n <= 0) return false;
  if (!form.next_due_date) return false;
  return true;
}

// ── Loading skeleton ─────────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
