"use client";

/**
 * Flag dialog for the NonprofitDetail page (DP-061).
 *
 * Wraps the DP-065 `createNonprofitFlag` server action. Two trigger
 * variants are exposed so the same dialog can be opened from the
 * header (`variant="ghost"`, "Report Issue") and from the Trust &
 * Safety sidebar (`variant="outline"`, "Report an Issue") without
 * each call site duplicating the dialog markup.
 *
 * Validation is intentionally minimal client-side — the action's
 * pure validators (DP-065) catch missing reason / oversize description
 * server-side, and we surface those errors through `toast.error` so
 * users see the same wording the server returns.
 */

import { useState, useTransition } from "react";
import { AlertTriangle, Flag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createNonprofitFlag } from "@/lib/actions/nonprofit-flags";

type Props = {
  nonprofitId: string;
  /** Header trigger uses ghost; sidebar uses outline. */
  triggerVariant: "ghost" | "outline";
  triggerLabel: string;
  triggerIcon: "flag" | "alert";
  triggerSize?: "sm" | "default";
  triggerClassName?: string;
};

const REASON_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "fraud", label: "Suspected fraud" },
  { value: "outdated", label: "Outdated information" },
  { value: "duplicate", label: "Duplicate listing" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

export function FlagNonprofitDialog({
  nonprofitId,
  triggerVariant,
  triggerLabel,
  triggerIcon,
  triggerSize = "sm",
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const TriggerIcon = triggerIcon === "flag" ? Flag : AlertTriangle;

  function handleSubmit() {
    if (!reason) {
      toast.error("Please choose a reason.");
      return;
    }

    startTransition(async () => {
      const result = await createNonprofitFlag({
        nonprofitId,
        reason,
        description: description || null,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Flag submitted. Our team will review it shortly.");
      setOpen(false);
      setReason("");
      setDescription("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={triggerClassName}
          >
            <TriggerIcon className="mr-2 h-4 w-4" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Help us maintain directory quality by reporting suspicious
            organizations or incorrect information.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="flag-reason">Reason</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value ?? "")}
            >
              <SelectTrigger id="flag-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="flag-description">Description</Label>
            <Textarea
              id="flag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about the issue..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Submitting…" : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
