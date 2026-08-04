"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { follow } from "@/lib/actions/follows";

export type SuggestedPerson = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  /** "follow" for open givers, "request" for friends-only profiles. */
  action: "follow" | "request";
};

function firstInitial(name: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function SuggestedPeopleCard({ people }: { people: SuggestedPerson[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleFollow(person: SuggestedPerson) {
    setPendingId(person.id);
    startTransition(async () => {
      const res = await follow(person.id);
      if (res.error) {
        toast.error(res.error);
      } else if (res.data?.kind === "follow") {
        toast.success(`Following ${person.display_name || "user"}`);
        router.refresh();
      } else {
        toast.success(
          `Follow request sent to ${person.display_name || "user"}`
        );
        router.refresh();
      }
      setPendingId(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested people</CardTitle>
        <CardDescription>People you&apos;re not following yet</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3.5">
        {people.map((person) => {
          const name = person.display_name?.trim() || "Anonymous";
          const reason = person.bio?.trim().split("\n")[0] || null;
          return (
            <div key={person.id} className="flex items-center gap-2.5">
              <Link
                href={`/profile/${person.id}`}
                aria-label={`View ${name}'s profile`}
                className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Avatar>
                  {person.avatar_url && (
                    <AvatarImage src={person.avatar_url} alt="" />
                  )}
                  <AvatarFallback className="bg-brand-soft text-green-700 text-xs font-semibold">
                    {firstInitial(person.display_name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${person.id}`}
                  className="block truncate text-sm font-medium text-text-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
                >
                  {name}
                </Link>
                {reason && (
                  <p className="truncate text-xs text-text-faint">{reason}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleFollow(person)}
                disabled={pendingId === person.id}
              >
                {person.action === "follow" ? "Follow" : "Request"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
