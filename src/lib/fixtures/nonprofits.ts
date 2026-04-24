/**
 * In-memory `Nonprofit` shape shared between the Every.org client
 * (DP-063) and the nonprofit-sync action (DP-064).
 *
 * Originally this file held the DP-060 `MOCK_NONPROFITS` seed array.
 * DP-064 removed the seed once the directory started reading from the
 * `nonprofits` table — the type exports below are all that survive,
 * because both the client mappers and the sync action key off them.
 *
 * The path stays under `lib/fixtures/` to avoid churn in DP-063's
 * existing imports; future cleanup may move it to `lib/every-org/types`.
 */

export const NONPROFIT_CATEGORIES = [
  "Education",
  "Health",
  "Environment",
  "Hunger & Poverty",
  "Animal Welfare",
  "Human Rights",
  "Arts & Culture",
  "Disaster Relief",
  "Housing",
  "Community",
  "Research",
  "Youth",
] as const;

export type NonprofitCategory = (typeof NONPROFIT_CATEGORIES)[number];

export type NonprofitRating = {
  source: string;
  rating: string;
  score: number;
  maxScore: number;
  lastUpdated: string;
};

export type Nonprofit = {
  id: string;
  ein: string;
  name: string;
  mission: string;
  description: string;
  category: NonprofitCategory[];
  subcategory?: string;
  tags: string[];
  location: { city: string; state: string; country: string };
  website: string;
  donationUrl: string;
  /** Square logo URL ready to render in an `<img>`. Null when the source has none. */
  logoUrl?: string | null;
  verified: boolean;
  verificationDate?: string;
  flagged: boolean;
  flagCount: number;
  ratings: NonprofitRating[];
  founded?: number;
  size?: string;
  revenue?: number;
};

export type NonprofitSearchFilters = {
  category?: NonprofitCategory[];
  verified?: boolean;
  minRating?: number;
};
