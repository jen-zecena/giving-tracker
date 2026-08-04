"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Search, UserPlus, UserMinus, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { DiscoverUser } from "@/lib/queries/discover";
import { cn } from "@/lib/utils";

type Props = {
  currentUserId: string;
  users: DiscoverUser[];
  followingIds: string[];
  pendingOutgoingIds: string[];
  incomingRequests: PendingRequest[];
};

/** DS sentence-case tier labels + soft badge tones. */
const TIER_BADGES: Record<
  DiscoverUser["privacy_tier"],
  { label: string; className: string }
> = {
  open_giver: {
    label: "Open giver",
    className: "bg-brand-soft text-green-700",
  },
  friends_only: {
    label: "Friends only",
    className: "bg-surface-sunken text-muted-foreground",
  },
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
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-faint" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or bio…"
          className="h-10 rounded-lg border-border-strong bg-card pl-10 shadow-2xs"
          aria-label="Search people"
        />
      </div>

      {/* ── Incoming pending requests ────────────────────────── */}
      {incomingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Follow requests{" "}
              <span className="font-mono tabular-nums text-muted-foreground">
                ({incomingRequests.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center gap-3 rounded-lg bg-surface-sunken p-3"
              >
                <Avatar>
                  <AvatarFallback className="bg-brand-soft text-green-700 text-xs font-semibold">
                    {firstInitial(req.from_display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${req.from_user_id}`}
                    className="block truncate text-sm font-medium text-text-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
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
                    <X aria-hidden />
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(req)}
                    disabled={pendingRequestId === req.id}
                  >
                    <Check aria-hidden />
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
        <div className="rounded-xl border-2 border-dashed border-border-strong bg-transparent">
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Search className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-text-strong">
              {query ? "No matches" : "No one to find yet"}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {query
                ? "Try a different name or bio keyword."
                : "As people join, they'll show up here for you to follow."}
            </p>
          </div>
        </div>
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
  const tierBadge = TIER_BADGES[user.privacy_tier];
  const name = user.display_name?.trim() || "Anonymous";

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
            <AvatarFallback className="bg-brand-soft text-green-700 text-sm font-semibold">
              {firstInitial(user.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${user.id}`}
              className="block truncate font-semibold text-text-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
            >
              {name}
            </Link>
            <Badge
              className={cn("mt-1 border-transparent", tierBadge.className)}
            >
              {tierBadge.label}
            </Badge>
          </div>
        </div>

        <p className="min-h-[2.5rem] text-sm text-muted-foreground line-clamp-2">
          {user.bio?.trim() || (
            <span className="italic text-text-faint">No bio yet</span>
          )}
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
        <UserMinus aria-hidden />
        Unfollow
      </Button>
    );
  }
  if (state === "request") {
    return (
      <Button
        variant="outline"
        onClick={onClick}
        disabled={isPending}
        className="mt-auto w-full"
      >
        <UserPlus aria-hidden />
        Request
      </Button>
    );
  }
  return (
    <Button onClick={onClick} disabled={isPending} className="mt-auto w-full">
      <UserPlus aria-hidden />
      Follow
    </Button>
  );
}
