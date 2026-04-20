import type { PrivacyTier } from "@/types";

export type PrivacyTierMeta = {
  label: string;
  description: string;
};

/**
 * Pure tier → display metadata. Client-safe — no server imports, no
 * Supabase. Server-side `src/lib/queries/profile.ts` re-exports this so
 * existing callers keep working.
 */
export function privacyTierMeta(tier: PrivacyTier): PrivacyTierMeta {
  switch (tier) {
    case "private":
      return { label: "Private", description: "Only you can see your giving" };
    case "friends_only":
      return {
        label: "Friends Only",
        description: "People you approve can see your activity",
      };
    case "open_giver":
      return {
        label: "Open Giver",
        description: "Publicly discoverable",
      };
  }
}
