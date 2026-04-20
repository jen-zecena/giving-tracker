"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleLike } from "@/lib/actions/likes";
import { cn } from "@/lib/utils";

type LikeState = { liked: boolean; count: number };

type Props = {
  donationId: string;
  initialLiked: boolean;
  initialCount: number;
};

export function LikeButton({ donationId, initialLiked, initialCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [state, applyOptimistic] = useOptimistic<LikeState, LikeState>(
    { liked: initialLiked, count: initialCount },
    (_prev, next) => next
  );

  function onClick() {
    // Flip optimistically so the heart + count respond instantly.
    const nextLiked = !state.liked;
    const nextCount = Math.max(0, state.count + (nextLiked ? 1 : -1));

    startTransition(async () => {
      applyOptimistic({ liked: nextLiked, count: nextCount });
      const res = await toggleLike(donationId);
      if (res.error) {
        toast.error(res.error);
        // Rollback: revert to the server-confirmed counts by re-reading
        // the original state. useOptimistic will clear on its own when
        // the transition ends, so no manual state restore is needed —
        // we just surface the error toast.
      }
    });
  }

  const label = state.liked ? "Unlike" : "Like";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      aria-label={label}
      aria-pressed={state.liked}
      className={cn(
        "gap-2",
        state.liked
          ? "text-primary hover:text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-transform",
          state.liked && "fill-current"
        )}
      />
      <span className="font-mono tabular-nums">{state.count}</span>
    </Button>
  );
}
