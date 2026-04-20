"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { follow, unfollow } from "@/lib/actions/follows";
import type { PublicFollowButtonState } from "@/lib/queries/public-profile-helpers";

type Props = {
  targetUserId: string;
  targetName: string;
  initialState: PublicFollowButtonState;
};

export function PublicProfileFollowButton({
  targetUserId,
  targetName,
  initialState,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<PublicFollowButtonState>(initialState);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (state === "private" || isPending) return;

    startTransition(async () => {
      if (state === "following") {
        const res = await unfollow(targetUserId);
        if (res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(`Unfollowed ${targetName}`);
        setState("follow");
        router.refresh();
        return;
      }

      if (state === "pending") {
        // No endpoint yet to cancel an outgoing request — matches the
        // Discover card behavior. Tell the user and bail.
        toast.info("Request already sent");
        return;
      }

      const res = await follow(targetUserId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.data?.kind === "follow") {
        toast.success(`Following ${targetName}`);
        setState("following");
      } else {
        toast.success(`Follow request sent to ${targetName}`);
        setState("pending");
      }
      router.refresh();
    });
  }

  if (state === "private") {
    return (
      <Button variant="outline" disabled className="gap-1.5">
        <Lock className="h-4 w-4" aria-hidden="true" />
        Private
      </Button>
    );
  }

  if (state === "following") {
    return (
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
        className="gap-1.5"
      >
        <UserMinus className="h-4 w-4" aria-hidden="true" />
        Following
      </Button>
    );
  }

  if (state === "pending") {
    return (
      <Button
        variant="secondary"
        onClick={handleClick}
        disabled={isPending}
        className="gap-1.5"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        Requested
      </Button>
    );
  }

  // follow | request
  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className="gap-1.5"
    >
      <UserPlus className="h-4 w-4" aria-hidden="true" />
      {state === "request" ? "Request" : "Follow"}
    </Button>
  );
}
