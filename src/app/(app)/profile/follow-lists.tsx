"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { removeFollower, unfollow } from "@/lib/actions/follows";
import type { ProfileSummary } from "@/lib/queries/profile";

import { tierLabel } from "./profile-blocks";

function firstInitial(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

function FollowUserRow({
  user,
  pending,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
}: {
  user: ProfileSummary;
  pending: boolean;
  actionLabel: string;
  actionIcon: typeof UserMinus;
  onAction: (user: ProfileSummary) => void;
}) {
  const displayName = user.display_name?.trim() || "Unnamed giver";

  return (
    <li className="flex items-center gap-3 px-5 py-4">
      <Avatar className="h-10 w-10 shrink-0">
        {user.avatar_url ? (
          <AvatarImage src={user.avatar_url} alt="" />
        ) : null}
        <AvatarFallback className="bg-[var(--green-500)] font-sans text-sm font-semibold text-primary-foreground">
          {firstInitial(user.display_name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${user.id}`}
            className="truncate text-sm font-medium hover:underline focus-visible:underline"
          >
            {displayName}
          </Link>
          <Badge variant="outline" className="shrink-0 font-normal">
            {tierLabel(user.privacy_tier)}
          </Badge>
        </div>
        {user.bio?.trim() ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {user.bio.trim()}
          </p>
        ) : null}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => onAction(user)}
        disabled={pending}
        aria-label={`${actionLabel} ${displayName}`}
      >
        <ActionIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        {pending ? "Working…" : actionLabel}
      </Button>
    </li>
  );
}

export function FollowersTab({ followers }: { followers: ProfileSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (followers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No followers yet"
        description="When people follow you, they'll show up here."
      />
    );
  }

  function handleRemove(user: ProfileSummary) {
    setPendingId(user.id);
    startTransition(async () => {
      const res = await removeFollower(user.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`Removed ${user.display_name || "follower"}`);
        router.refresh();
      }
      setPendingId(null);
    });
  }

  return (
    <Card className="divide-y divide-border overflow-hidden p-0">
      <ul className="divide-y divide-border">
        {followers.map((u) => (
          <FollowUserRow
            key={u.id}
            user={u}
            pending={pendingId === u.id}
            actionLabel="Remove"
            actionIcon={UserMinus}
            onAction={handleRemove}
          />
        ))}
      </ul>
    </Card>
  );
}

export function FollowingTab({ following }: { following: ProfileSummary[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (following.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Not following anyone yet"
        description="Find other givers on the Discover tab."
        action={{ label: "Open Discover", href: "/discover" }}
      />
    );
  }

  function handleUnfollow(user: ProfileSummary) {
    setPendingId(user.id);
    startTransition(async () => {
      const res = await unfollow(user.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`Unfollowed ${user.display_name || "user"}`);
        router.refresh();
      }
      setPendingId(null);
    });
  }

  return (
    <Card className="divide-y divide-border overflow-hidden p-0">
      <ul className="divide-y divide-border">
        {following.map((u) => (
          <FollowUserRow
            key={u.id}
            user={u}
            pending={pendingId === u.id}
            actionLabel="Unfollow"
            actionIcon={UserMinus}
            onAction={handleUnfollow}
          />
        ))}
      </ul>
    </Card>
  );
}
