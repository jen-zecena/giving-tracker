"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Heart,
  Target,
  Building2,
  Check,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ChecklistStatus } from "@/lib/queries/welcome-checklist";

const STORAGE_KEY = "hasSeenWelcome";

interface ChecklistItem {
  key: keyof ChecklistStatus;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

const ITEMS: ChecklistItem[] = [
  {
    key: "profileCompleted",
    label: "Complete your profile",
    description: "Add your name to personalize your experience",
    href: "/profile",
    icon: <User className="h-4 w-4" />,
  },
  {
    key: "donationLogged",
    label: "Log your first donation",
    description: "Start tracking your charitable giving",
    href: "/donations/new",
    icon: <Heart className="h-4 w-4" />,
  },
  {
    key: "goalSet",
    label: "Set a giving goal",
    description: "Define a target to stay motivated",
    href: "/goals",
    icon: <Target className="h-4 w-4" />,
  },
  {
    key: "nonprofitExplored",
    label: "Explore nonprofits",
    description: "Discover organizations to support",
    href: "/nonprofits",
    icon: <Building2 className="h-4 w-4" />,
  },
];

interface WelcomeChecklistProps {
  status: ChecklistStatus;
}

export function WelcomeChecklist({ status }: WelcomeChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  if (dismissed) return null;

  const completedCount = ITEMS.filter((item) => status[item.key]).length;
  const allDone = completedCount === ITEMS.length;
  const progressPct = (completedCount / ITEMS.length) * 100;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  return (
    <Card className="bg-accent/30 border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base font-medium">
            {allDone ? "You're all set!" : "Getting started"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allDone
              ? "You've completed all the steps."
              : `${completedCount} of ${ITEMS.length} complete`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
          className="shrink-0 -mt-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress value={progressPct} className="h-2" />

        <ul className="space-y-2">
          {ITEMS.map((item) => {
            const done = status[item.key];
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-start gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-accent"
                >
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : "border-2 border-border bg-card"
                    }`}
                  >
                    {done && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        done
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {item.label}
                    </p>
                    {!done && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-0.5 shrink-0 text-muted-foreground">
                    {item.icon}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
