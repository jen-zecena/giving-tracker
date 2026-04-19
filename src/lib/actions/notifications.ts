"use server";

import { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
};

export type NotificationsResult = {
  items: NotificationItem[];
  unread_count: number;
};

async function getAuthed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null };
  return { supabase, user };
}

/**
 * Returns the latest 20 notifications for the current user, plus the
 * total count of unread rows (which may be > items.length if the user
 * has more than 20 unread). Unauthenticated callers get an empty result
 * instead of an error — the dropdown lives in the shared header and
 * shouldn't throw for signed-out viewers.
 */
export async function getNotifications(): Promise<NotificationsResult> {
  const { supabase, user } = await getAuthed();
  if (!supabase || !user) return { items: [], unread_count: 0 };

  const [listRes, countRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, message, read, action_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
  ]);

  return {
    items: (listRes.data ?? []) as NotificationItem[],
    unread_count: countRes.count ?? 0,
  };
}

export type NotificationActionResult = { error?: string };

export async function markNotificationRead(
  id: string
): Promise<NotificationActionResult> {
  if (!id) return { error: "Missing notification id." };

  const { supabase, user } = await getAuthed();
  if (!supabase || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return { error: error.message };
  return {};
}

export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const { supabase, user } = await getAuthed();
  if (!supabase || !user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) return { error: error.message };
  return {};
}
