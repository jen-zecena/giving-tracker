"use client";

import { useState } from "react";
import { Bell, Heart, UserPlus, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  type: "like" | "follow" | "badge" | "milestone";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// Mock notifications — DP-023 will wire to real data
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "follow",
    title: "New Follower",
    message: "Sarah Johnson started following you",
    time: "30m ago",
    read: false,
  },
  {
    id: "2",
    type: "like",
    title: "Someone liked your donation",
    message: "Alex Martinez liked your donation to Red Cross",
    time: "2h ago",
    read: false,
  },
  {
    id: "3",
    type: "badge",
    title: "New Badge Earned!",
    message: 'You earned the "Generous Giver" badge',
    time: "1d ago",
    read: true,
  },
];

const typeIcons: Record<Notification["type"], typeof Heart> = {
  like: Heart,
  follow: UserPlus,
  badge: Award,
  milestone: Bell,
};

const typeColors: Record<Notification["type"], string> = {
  like: "text-destructive",
  follow: "text-info",
  badge: "text-warning",
  milestone: "text-muted-foreground",
};

export function NotificationsDropdown() {
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="relative border-border"
          />
        }
      >
        <Bell className="w-5 h-5 text-foreground/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px]">
        <div className="flex items-center justify-between px-2 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs text-primary hover:text-primary/80"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            No notifications yet
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              const iconColor = typeColors[notification.type];

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`p-3 cursor-pointer ${!notification.read ? "bg-primary/5" : ""}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex gap-3 w-full">
                    <div className="flex-shrink-0 mt-1">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {notification.time}
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
