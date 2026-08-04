"use client";

import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings } from "@/lib/actions/profile";

type ProfilePaneProps = {
  initial: {
    display_name: string;
    bio: string;
    avatar_url: string | null;
  };
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/**
 * DS Settings → Profile pane. The upstream profile has no handle or
 * location fields, and no photo upload — the avatar comes from the
 * sign-in provider, so it renders without a "Change photo" action.
 */
export function ProfilePane({ initial }: ProfilePaneProps) {
  const [displayName, setDisplayName] = useState(initial.display_name);
  const [bio, setBio] = useState(initial.bio);
  const [isPending, startTransition] = useTransition();

  const dirty = displayName !== initial.display_name || bio !== initial.bio;

  function handleSave() {
    startTransition(async () => {
      const result = await updateSettings({
        display_name: displayName,
        bio: bio.trim() === "" ? null : bio,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile saved.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          How you appear to people who follow you.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Avatar size="lg" className="size-14">
          {initial.avatar_url ? (
            <AvatarImage src={initial.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-base">
            {initialsFor(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="grid gap-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How your name appears on the platform"
            maxLength={60}
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">
            Bio
            <span className="font-normal text-text-faint">Optional</span>
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short line about why you give"
            maxLength={280}
            rows={3}
            disabled={isPending}
          />
          <p className="font-mono text-xs text-text-faint">{bio.length}/280</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!dirty || isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
