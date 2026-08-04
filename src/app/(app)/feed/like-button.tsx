"use client";

import { useOptimistic, useTransition } from "react";
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

/**
 * Cheer toggle (internally still "like" — action + DB names unchanged).
 * DS treatment: ♡/♥ glyphs, mono count, "Cheer"/"Cheered" label with a
 * berry tint when active.
 */
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

  const label = state.liked ? "Cheered" : "Cheer";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={isPending}
      aria-label={state.liked ? "Undo cheer" : "Cheer"}
      aria-pressed={state.liked}
      className={cn(
        "-ml-2.5 gap-1.5",
        state.liked
          ? "text-destructive hover:text-destructive"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span aria-hidden className="text-[15px] leading-none">
        {state.liked ? "♥" : "♡"}
      </span>
      <span className="font-mono tabular-nums">{state.count}</span>
      {label}
    </Button>
  );
}
