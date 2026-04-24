/**
 * Static nonprofit fixture (Sprint 6).
 *
 * Both DP-060 (NonprofitDirectory) and DP-061 (NonprofitDetail) ship
 * against this fixture instead of the `nonprofits` table — see the
 * sprint plan: "fixture data first; DP-064 swaps to Every.org sync".
 *
 * The shape is a superset of the DB `Nonprofit` type. The extra
 * presentation-only fields (`ratings`, `verification_date`,
 * `subcategory`, `location_detail`) carry the rendering data the
 * Figma detail page expects but the DB schema doesn't yet store.
 * When DP-064 lands these become optional and may be empty until the
 * Every.org sync starts populating them.
 *
 * The fixture deliberately starts small (3 entries). DP-060 expands it
 * with the full Figma `MOCK_NONPROFITS` set when that PR ships.
 */

import type { Nonprofit } from "@/types";

export type NonprofitRatingSource = {
  source: string;
  rating: string;
  score: number;
  maxScore: number;
  /** ISO date — `YYYY-MM-DD`. */
  lastUpdated: string;
};

export type NonprofitWithDetails = Nonprofit & {
  /** Optional structured location for display; falls back to `location` text. */
  location_detail: {
    city: string;
    state: string;
    country: string;
  } | null;
  /** Optional finer-grained category for the focus-areas card. */
  subcategory: string | null;
  /** ISO date string when the IRS verification was last refreshed. */
  verification_date: string | null;
  /** Independent watchdog ratings (Charity Navigator, GuideStar, …). */
  ratings: NonprofitRatingSource[];
};

export const NONPROFITS_FIXTURE: NonprofitWithDetails[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    ein: "53-0196605",
    name: "American Red Cross",
    mission:
      "Prevent and alleviate human suffering in the face of emergencies.",
    description:
      "The American Red Cross provides emergency assistance, disaster relief, and disaster preparedness education in the United States. It is part of the International Red Cross and Red Crescent Movement, a global humanitarian network of 80 million people.",
    category: ["disaster_relief", "health"],
    location: "Washington, DC, USA",
    location_detail: {
      city: "Washington",
      state: "DC",
      country: "USA",
    },
    website: "https://www.redcross.org",
    donation_url: "https://www.redcross.org/donate/donation.html",
    verified: true,
    logo_url: null,
    founded: 1881,
    size: "10,000+ employees",
    revenue: 2900000000,
    tags: ["emergency", "blood-donation", "disaster-relief"],
    subcategory: "Emergency Response",
    verification_date: "2026-01-15",
    ratings: [
      {
        source: "Charity Navigator",
        rating: "Four Stars",
        score: 92,
        maxScore: 100,
        lastUpdated: "2026-01-10",
      },
      {
        source: "GuideStar",
        rating: "Platinum",
        score: 100,
        maxScore: 100,
        lastUpdated: "2025-11-22",
      },
    ],
    synced_at: "2026-01-15T00:00:00Z",
    created_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    ein: "13-1760110",
    name: "UNICEF USA",
    mission:
      "Save and protect the world's most vulnerable children through fundraising, advocacy, and education.",
    description:
      "UNICEF USA supports UNICEF's work and other efforts in support of the world's children through fundraising, advocacy, and education in the United States.",
    category: ["health", "education", "human_rights"],
    location: "New York, NY, USA",
    location_detail: {
      city: "New York",
      state: "NY",
      country: "USA",
    },
    website: "https://www.unicefusa.org",
    donation_url: "https://www.unicefusa.org/donate",
    verified: true,
    logo_url: null,
    founded: 1947,
    size: "1,000-5,000 employees",
    revenue: 700000000,
    tags: ["children", "global-health", "education"],
    subcategory: "Children's Welfare",
    verification_date: "2026-02-08",
    ratings: [
      {
        source: "Charity Navigator",
        rating: "Four Stars",
        score: 88,
        maxScore: 100,
        lastUpdated: "2026-01-30",
      },
    ],
    synced_at: "2026-02-08T00:00:00Z",
    created_at: "2026-02-08T00:00:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    ein: "94-3060756",
    name: "Local Food Bank Coalition",
    mission:
      "Distribute food to families experiencing hunger across the Bay Area.",
    description:
      "A community-driven food bank network that partners with local grocers, farms, and restaurants to recover surplus food and distribute it to neighbors in need. No fancy ratings — small ops, big impact.",
    category: ["poverty", "community"],
    location: "Oakland, CA, USA",
    location_detail: {
      city: "Oakland",
      state: "CA",
      country: "USA",
    },
    website: "https://example.org/food-coalition",
    donation_url: "https://example.org/food-coalition/donate",
    verified: true,
    logo_url: null,
    founded: 2008,
    size: "20-50 employees",
    revenue: 1200000,
    tags: ["food-security", "local"],
    subcategory: null,
    verification_date: "2026-03-12",
    // Empty ratings — exercises the "No ratings available yet" empty state.
    ratings: [],
    synced_at: "2026-03-12T00:00:00Z",
    created_at: "2026-03-12T00:00:00Z",
  },
];
