"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Bell,
  Clock,
  Heart,
  Trophy,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/actions/notifications";
import { timeAgo } from "@/lib/time";
import type { NotificationType } from "@/types";

const TYPE_ICONS: Record<NotificationType, typeof Heart> = {
  like: Heart,
  follow: UserPlus,
  follow_request: UserCheck,
  badge: Award,
  milestone: Trophy,
  pending_donation: Clock,
};

const TYPE_ICON_COLORS: Record<NotificationType, string> = {
  like: "text-destructive",
  follow: "text-info",
  follow_request: "text-info",
  badge: "text-warning",
  milestone: "text-success",
  pending_donation: "text-muted-foreground",
};

export function NotificationsDropdown() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setItems(res.items);
      setUnreadCount(res.unread_count);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleOpenChange(open: boolean) {
    if (open) load();
  }

  function handleItemClick(n: NotificationItem) {
    // Optimistic: flip the unread dot immediately.
    if (!n.read) {
      setItems((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, read: true } : p))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      startTransition(async () => {
        const res = await markNotificationRead(n.id);
        if (res.error) {
          // Revert on failure.
          setItems((prev) =>
            prev.map((p) => (p.id === n.id ? { ...p, read: false } : p))
          );
          setUnreadCount((c) => c + 1);
        }
      });
    }

    if (n.action_url) {
      router.push(n.action_url);
    }
  }

  function handleMarkAll() {
    const prevItems = items;
    const prevCount = unreadCount;

    setItems((p) => p.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (res.error) {
        setItems(prevItems);
        setUnreadCount(prevCount);
      }
    });
  }

  const badgeLabel =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "relative border-border"
        )}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <Bell className="w-5 h-5 text-foreground/70" />
        {badgeLabel && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive font-mono text-xs font-semibold text-destructive-foreground">
            {badgeLabel}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px]">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            Notifications
          </span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              className="h-auto p-1 text-xs text-primary hover:text-primary/80"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {!loaded && loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {items.map((n) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              const iconColor =
                TYPE_ICON_COLORS[n.type] ?? "text-muted-foreground";

              return (
                <DropdownMenuItem
                  key={n.id}
                  className={`cursor-pointer p-3 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleItemClick(n)}
                >
                  <div className="flex w-full gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{n.title}</p>
                        {!n.read && (
                          <div
                            className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground/70">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
