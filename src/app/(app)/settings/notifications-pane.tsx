"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateSettings } from "@/lib/actions/profile";

/**
 * DS Settings → Notifications pane. The only preference that exists
 * upstream is `profiles.email_notifications`, which gates the daily
 * pending-donation digest email (DP-055) — so this pane carries exactly
 * one switch. The DS's other notification switches (weekly digest,
 * friend activity, milestone celebrations) have no backing functionality
 * and are omitted.
 */
export function NotificationsPane({
  initialEmailNotifications,
}: {
  initialEmailNotifications: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEmailNotifications);
  const [isPending, startTransition] = useTransition();

  function save(next: boolean) {
    setEnabled(next);
    startTransition(async () => {
      const result = await updateSettings({ email_notifications: next });
      if (result.error) {
        setEnabled(!next);
        toast.error(result.error);
      } else {
        toast.success("Saved.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>We keep these light.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label htmlFor="email-notifications">
              Recurring gift reminders
            </Label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              A nudge when a scheduled gift is waiting for your confirmation.
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={enabled}
            disabled={isPending}
            onCheckedChange={(next) => save(next)}
            className="mt-0.5"
          />
        </div>
      </CardContent>
    </Card>
  );
}
