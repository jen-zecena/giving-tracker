/**
 * Formats an ISO timestamp as a compact relative-time string:
 * "just now", "30m ago", "2h ago", "3d ago", "2w ago", or a short
 * date ("Mar 12") once the event is older than ~4 weeks.
 *
 * Both arguments are optional for testability — pass `now` to pin the
 * reference point in tests.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const deltaMs = now.getTime() - then.getTime();

  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    return "just now";
  }

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (deltaMs < minute) return "just now";
  if (deltaMs < hour) return `${Math.floor(deltaMs / minute)}m ago`;
  if (deltaMs < day) return `${Math.floor(deltaMs / hour)}h ago`;
  if (deltaMs < week) return `${Math.floor(deltaMs / day)}d ago`;
  if (deltaMs < 4 * week) return `${Math.floor(deltaMs / week)}w ago`;

  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
