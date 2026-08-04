import { Download, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * DS Settings → Account pane. Upstream has no email/password change
 * actions, so the DS "Account" card is omitted. CSV export and account
 * deletion were already surfaced on the old settings page as disabled
 * "Coming soon" placeholders — kept here, restyled to the DS "Your data"
 * card, so nothing users could see disappears.
 */
export function AccountPane() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your data</CardTitle>
        <CardDescription>
          Everything you&apos;ve logged is yours.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2.5">
        <Button variant="outline" disabled>
          <Download aria-hidden />
          Export as CSV
        </Button>
        <Button variant="destructive" disabled>
          <Trash2 aria-hidden />
          Delete account
        </Button>
        <Badge variant="outline">Coming soon</Badge>
      </CardContent>
    </Card>
  );
}
