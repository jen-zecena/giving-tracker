"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Search, UserPlus, UserMinus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  filterDiscoverUsers,
  getFollowButtonState,
  type FollowButtonState,
} from "@/lib/actions/discover-helpers";
import {
  acceptRequest,
  rejectRequest,
  type PendingRequest,
} from "@/lib/actions/follow-requests";
import { follow, unfollow } from "@/lib/actions/follows";
import { privacyTierMeta } from "@/lib/privacy-tier";
import type { DiscoverUser } from "@/lib/queries/discover";

type Props = {
  currentUserId: string;
  users: DiscoverUser[];
  followingIds: string[];
  pendingOutgoingIds: string[];
  incomingRequests: PendingRequest[];
};

function firstInitial(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function DiscoverClient({
  currentUserId,
  users,
  followingIds,
  pendingOutgoingIds,
  incomingRequests,
}: Props) {
  void currentUserId;

  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const followingSet = useMemo(() => new Set(followingIds), [followingIds]);
  const outgoingSet = useMemo(
    () => new Set(pendingOutgoingIds),
    [pendingOutgoingIds]
  );

  const filtered = useMemo(
    () => filterDiscoverUsers(users, query),
    [users, query]
  );

  function handleFollowClick(user: DiscoverUser, state: FollowButtonState) {
    setPendingTargetId(user.id);
    startTransition(async () => {
      if (state === "following") {
        const res = await unfollow(user.id);
        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(`Unfollowed ${user.display_name || "user"}`);
          router.refresh();
        }
      } else if (state === "follow" || state === "request") {
        const res = await follow(user.id);
        if (res.error) {
          toast.error(res.error);
        } else if (res.data?.kind === "follow") {
          toast.success(`Following ${user.display_name || "user"}`);
          router.refresh();
        } else {
          toast.success(`Follow request sent to ${user.display_name || "user"}`);
          router.refresh();
        }
      }
      setPendingTargetId(null);
    });
  }

  function handleAccept(req: PendingRequest) {
    setPendingRequestId(req.id);
    startTransition(async () => {
      const res = await acceptRequest(req.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`Accepted follow request from ${req.from_display_name || "user"}`);
        router.refresh();
      }
      setPendingRequestId(null);
    });
  }

  function handleReject(req: PendingRequest) {
    setPendingRequestId(req.id);
    startTransition(async () => {
      const res = await rejectRequest(req.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Request declined");
        router.refresh();
      }
      setPendingRequestId(null);
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Search ───────────────────────────────────────────── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or bio..."
          className="pl-9"
          aria-label="Search users"
        />
      </div>

      {/* ── Incoming pending requests ────────────────────────── */}
      {incomingRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Follow requests ({incomingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <PendingAvatar name={req.from_display_name} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${req.from_user_id}`}
                    className="block truncate font-medium text-foreground hover:underline"
                  >
                    {req.from_display_name || "Unknown user"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    wants to follow you
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(req)}
                    disabled={pendingRequestId === req.id}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(req)}
                    disabled={pendingRequestId === req.id}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── User grid ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={query ? "No matches" : "No one to discover yet"}
          description={
            query
              ? "Try a different name or bio keyword."
              : "As people join, they'll show up here for you to follow."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((user) => {
            const state = getFollowButtonState(
              user.privacy_tier,
              followingSet.has(user.id),
              outgoingSet.has(user.id)
            );
            return (
              <UserCard
                key={user.id}
                user={user}
                state={state}
                isPending={pendingTargetId === user.id}
                onClick={() => handleFollowClick(user, state)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── User card ────────────────────────────────────────────────

function UserCard({
  user,
  state,
  isPending,
  onClick,
}: {
  user: DiscoverUser;
  state: FollowButtonState;
  isPending: boolean;
  onClick: () => void;
}) {
  const tierMeta = privacyTierMeta(user.privacy_tier);
  const name = user.display_name?.trim() || "Anonymous";

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <GradientAvatar
            name={user.display_name}
            avatarUrl={user.avatar_url}
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${user.id}`}
              className="block truncate font-semibold text-foreground hover:underline"
            >
              {name}
            </Link>
            <Badge variant="outline" className="mt-1 text-xs font-normal">
              {tierMeta.label}
            </Badge>
          </div>
        </div>

        <p className="min-h-[2.5rem] text-sm text-muted-foreground line-clamp-2">
          {user.bio?.trim() || <span className="italic">No bio yet</span>}
        </p>

        <FollowButton state={state} isPending={isPending} onClick={onClick} />
      </CardContent>
    </Card>
  );
}

// ── Follow button ────────────────────────────────────────────

function FollowButton({
  state,
  isPending,
  onClick,
}: {
  state: FollowButtonState;
  isPending: boolean;
  onClick: () => void;
}) {
  if (state === "pending") {
    return (
      <Button variant="outline" disabled className="mt-auto w-full">
        Pending
      </Button>
    );
  }
  if (state === "following") {
    return (
      <Button
        variant="outline"
        onClick={onClick}
        disabled={isPending}
        className="mt-auto w-full"
      >
        <UserMinus className="mr-1.5 h-4 w-4" />
        Unfollow
      </Button>
    );
  }
  return (
    <Button
      onClick={onClick}
      disabled={isPending}
      className="mt-auto w-full"
    >
      <UserPlus className="mr-1.5 h-4 w-4" />
      {state === "follow" ? "Follow" : "Request"}
    </Button>
  );
}

// ── Gradient avatar ──────────────────────────────────────────

function GradientAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <span className="relative inline-flex size-10 shrink-0 overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt=""
          className="size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-sm font-semibold text-primary-foreground"
      aria-hidden="true"
    >
      {firstInitial(name)}
    </span>
  );
}

function PendingAvatar({ name }: { name: string | null }) {
  return (
    <span
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-sm font-semibold text-primary-foreground"
      aria-hidden="true"
    >
      {firstInitial(name)}
    </span>
  );
}
