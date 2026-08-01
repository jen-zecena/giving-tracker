/**
 * Every.org API client (DP-063).
 *
 * Thin wrapper around https://partners.every.org/v0.2 for the Nonprofit
 * Directory. Exposes two public operations:
 *
 *   - searchEveryOrg(query, filters) — keyword search
 *   - getEveryOrgBySlug(slug)        — detail lookup
 *
 * Both return our in-app `Nonprofit` shape (src/lib/fixtures/nonprofits.ts)
 * so DP-064 can swap the directory's data source with a one-line change.
 *
 * Caching: we rely on Next.js's native fetch cache with a 1h revalidate
 * window and per-call tags so we can invalidate explicitly later. The
 * older `unstable_cache` is intentionally avoided — it is deprecated in
 * Next 16 and Next's fetch cache is the idiomatic replacement.
 *
 * Key handling: the Every.org publishable key (pk_live_*) is safe to
 * expose to clients per Every.org's design, but we read it from a
 * server-only env var so the option to swap providers or add a
 * per-origin rate-limiting proxy stays open.
 */
import type { Nonprofit, NonprofitCategory } from "@/lib/fixtures/nonprofits";

const EVERY_ORG_BASE = "https://partners.every.org/v0.2";
const REVALIDATE_SECONDS = 60 * 60; // 1 hour

// ── Errors ────────────────────────────────────────────────────────────

export class EveryOrgError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "EveryOrgError";
    this.status = status;
  }
}

export class EveryOrgNotFoundError extends EveryOrgError {
  constructor(message = "Not found") {
    super(message, 404);
    this.name = "EveryOrgNotFoundError";
  }
}

export class EveryOrgRateLimitError extends EveryOrgError {
  constructor(message = "Rate limited") {
    super(message, 429);
    this.name = "EveryOrgRateLimitError";
  }
}

export class EveryOrgConfigError extends Error {
  constructor(message = "EVERY_ORG_PUBLIC_KEY is not set") {
    super(message);
    this.name = "EveryOrgConfigError";
  }
}

// ── Raw response shapes (subset of what Every.org returns) ────────────

export type EveryOrgSearchResult = {
  ein: string;
  name: string;
  profileUrl: string;
  description: string;
  slug: string;
  matchedTerms?: string[];
  location?: string;
  hasAdmin?: boolean;
  tags?: string[];
  donationsEnabled?: boolean;
  websiteUrl?: string;
  logoUrl?: string;
  logoCloudinaryId?: string | null;
  coverImageUrl?: string;
  coverImageCloudinaryId?: string | null;
};

export type EveryOrgSearchResponse = {
  nonprofits: EveryOrgSearchResult[];
};

export type EveryOrgNonprofitTag = {
  id: string;
  tagName: string;
  causeCategory?: string;
  title: string;
  tagImageCloudinaryId?: string | null;
  tagUrl?: string;
  tagImageUrl?: string;
};

export type EveryOrgNonprofitDetail = {
  id: string;
  name: string;
  donationsEnabled?: boolean;
  locationAddress?: string | null;
  ein: string;
  description?: string | null;
  descriptionLong?: string | null;
  primarySlug: string;
  logoCloudinaryId?: string | null;
  coverImageCloudinaryId?: string | null;
  nteeCode?: string | null;
  nteeCodeMeaning?: {
    majorCode?: string;
    majorMeaning?: string;
    decileCode?: string;
    decileMeaning?: string;
  } | null;
  hasAdmin?: boolean;
  websiteUrl?: string | null;
  disbursementType?: string | null;
  profileUrl: string;
};

export type EveryOrgDetailResponse = {
  data: {
    nonprofit: EveryOrgNonprofitDetail;
    nonprofitTags?: EveryOrgNonprofitTag[];
  };
};

// ── Public API ────────────────────────────────────────────────────────

export type SearchFilters = {
  /** 1–50, default 10 per Every.org docs. */
  take?: number;
  /** Every.org `causes` param — see their browse/causes list. */
  causes?: string[];
};

export async function searchEveryOrg(
  query: string,
  filters: SearchFilters = {},
): Promise<Nonprofit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL(`${EVERY_ORG_BASE}/search/${encodeURIComponent(trimmed)}`);
  url.searchParams.set("apiKey", requireKey());
  url.searchParams.set("take", String(filters.take ?? 20));
  if (filters.causes && filters.causes.length > 0) {
    url.searchParams.set("causes", filters.causes.join(","));
  }

  const raw = await fetchJson<EveryOrgSearchResponse>(url, [
    `every-org:search`,
    `every-org:search:${trimmed.toLowerCase()}`,
  ]);

  return raw.nonprofits.map(mapSearchResultToNonprofit);
}

export async function getEveryOrgBySlug(slug: string): Promise<Nonprofit> {
  const trimmed = slug.trim();
  if (!trimmed) throw new EveryOrgNotFoundError("slug is required");

  const url = new URL(`${EVERY_ORG_BASE}/nonprofit/${encodeURIComponent(trimmed)}`);
  url.searchParams.set("apiKey", requireKey());

  const raw = await fetchJson<EveryOrgDetailResponse>(url, [
    `every-org:nonprofit`,
    `every-org:nonprofit:${trimmed.toLowerCase()}`,
  ]);

  return mapDetailToNonprofit(raw);
}

// ── Mappers (exported for unit tests) ─────────────────────────────────

export function mapSearchResultToNonprofit(r: EveryOrgSearchResult): Nonprofit {
  return {
    id: r.slug,
    ein: formatEin(r.ein),
    name: r.name,
    mission: r.description ?? "",
    description: r.description ?? "",
    category: mapTagsToCategories(r.tags ?? []),
    tags: r.tags ?? [],
    location: parseLocation(r.location),
    website: r.websiteUrl ?? r.profileUrl,
    donationUrl: r.profileUrl,
    logoUrl: pickLogoUrl(r.logoUrl, r.logoCloudinaryId),
    coverImageUrl: pickCoverUrl(r.coverImageUrl, r.coverImageCloudinaryId),
    verified: true,
    flagged: false,
    flagCount: 0,
    ratings: [],
  };
}

export function mapDetailToNonprofit(raw: EveryOrgDetailResponse): Nonprofit {
  const n = raw.data.nonprofit;
  const tags = raw.data.nonprofitTags ?? [];

  const description = n.descriptionLong?.trim() || n.description?.trim() || "";
  const mission = n.description?.trim() || truncate(description, 280);

  return {
    id: n.primarySlug,
    ein: formatEin(n.ein),
    name: n.name,
    mission,
    description,
    category: mapCauseCategoriesToNonprofitCategories(
      tags.map((t) => t.causeCategory).filter((c): c is string => !!c),
    ),
    subcategory: n.nteeCodeMeaning?.decileMeaning ?? undefined,
    tags: tags.map((t) => t.tagName),
    location: parseLocation(n.locationAddress ?? undefined),
    website: n.websiteUrl ?? n.profileUrl,
    donationUrl: n.profileUrl,
    logoUrl: pickLogoUrl(undefined, n.logoCloudinaryId),
    coverImageUrl: pickCoverUrl(undefined, n.coverImageCloudinaryId),
    verified: true,
    flagged: false,
    flagCount: 0,
    ratings: [],
  };
}

/**
 * Cloudinary transform presets per image kind. Picked once here so
 * individual call-sites don't each invent their own (and end up with
 * mismatched sizing or aspect ratios).
 *
 * - `logo`  — square crop, 120px @ 2x for retina (240px source).
 * - `cover` — 16:9 crop, ~640px wide @ 2x. Banner-friendly.
 *
 * The transforms mirror what Every.org uses on their own profiles:
 * `c_lfill` (limit-fit-fill) preserves the subject without zooming
 * past native resolution; `q_auto,f_auto,fl_progressive` lets the CDN
 * pick the best codec (WebP/AVIF) for the requesting browser.
 */
const CLOUDINARY_TRANSFORMS = {
  logo: "c_lfill,w_120,h_120,dpr_2/c_crop,ar_1:1/q_auto,f_auto,fl_progressive",
  cover: "c_lfill,w_640,h_360,dpr_2/c_crop,ar_16:9/q_auto,f_auto,fl_progressive",
} as const;

export type EveryOrgImageKind = keyof typeof CLOUDINARY_TRANSFORMS;

/**
 * Resolve a usable image URL from Every.org's two representations:
 * either a fully-formed URL (search endpoint sometimes returns one for
 * logos / covers) or a Cloudinary id (detail endpoint always returns
 * the id form). Returns `null` when both are absent so the renderer
 * can fall back to a placeholder surface.
 */
export function buildEveryOrgImageUrl(
  explicitUrl: string | undefined,
  cloudinaryId: string | null | undefined,
  kind: EveryOrgImageKind,
): string | null {
  if (explicitUrl && explicitUrl.trim().length > 0) return explicitUrl;
  if (!cloudinaryId || cloudinaryId.trim().length === 0) return null;
  return `https://res.cloudinary.com/everydotorg/image/upload/${CLOUDINARY_TRANSFORMS[kind]}/${cloudinaryId}`;
}

/** Backwards-compatible alias for the logo case (kept for existing imports). */
export function pickLogoUrl(
  explicitUrl: string | undefined,
  cloudinaryId: string | null | undefined,
): string | null {
  return buildEveryOrgImageUrl(explicitUrl, cloudinaryId, "logo");
}

/** Cover-image counterpart, used by the directory cards + detail header banner. */
export function pickCoverUrl(
  explicitUrl: string | undefined,
  cloudinaryId: string | null | undefined,
): string | null {
  return buildEveryOrgImageUrl(explicitUrl, cloudinaryId, "cover");
}

// ── Internals ─────────────────────────────────────────────────────────

function requireKey(): string {
  const key = process.env.EVERY_ORG_PUBLIC_KEY;
  if (!key) throw new EveryOrgConfigError();
  return key;
}

async function fetchJson<T>(url: URL, tags: string[]): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS, tags },
    });
  } catch (err) {
    throw new EveryOrgError(
      `Network error contacting Every.org: ${(err as Error).message}`,
      0,
    );
  }

  if (res.status === 404) {
    throw new EveryOrgNotFoundError(await extractMessage(res));
  }
  if (res.status === 429) {
    throw new EveryOrgRateLimitError(await extractMessage(res));
  }
  if (!res.ok) {
    throw new EveryOrgError(
      `Every.org request failed (${res.status}): ${await extractMessage(res)}`,
      res.status,
    );
  }

  return (await res.json()) as T;
}

async function extractMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

// ── Field helpers (exported for tests) ────────────────────────────────

/** Format a raw EIN string into the US canonical NN-NNNNNNN form. */
export function formatEin(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length !== 9) return raw ?? "";
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/**
 * Parse an Every.org `locationAddress` string (eg. "ST LOUIS, MO" or
 * "NEW YORK, NY") into our structured shape. Country is always US —
 * Every.org's directory is 501(c)(3)-only. Missing/blank input degrades
 * to empty strings so the UI still renders something sensible.
 */
export function parseLocation(raw: string | undefined | null): Nonprofit["location"] {
  if (!raw) return { city: "", state: "", country: "United States" };
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const [city = "", state = ""] = parts;
  return {
    city: titleCase(city),
    state: state.toUpperCase(),
    country: "United States",
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Map Every.org tag names (eg. "education", "animals") to our
 * NONPROFIT_CATEGORIES vocabulary. Unrecognized tags are dropped; the
 * result is deduplicated and preserves insertion order. Used by the
 * search response mapper which only has flat tag strings, not
 * causeCategory codes.
 */
export function mapTagsToCategories(tags: string[]): NonprofitCategory[] {
  const out = new Set<NonprofitCategory>();
  for (const tag of tags) {
    const mapped = TAG_TO_CATEGORY[tag.toLowerCase()];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

/**
 * Map Every.org `causeCategory` codes (eg. "ENVIRONMENT", "HUMAN_SERVICES")
 * to our NONPROFIT_CATEGORIES. Used by the detail response mapper.
 */
export function mapCauseCategoriesToNonprofitCategories(
  causeCategories: string[],
): NonprofitCategory[] {
  const out = new Set<NonprofitCategory>();
  for (const code of causeCategories) {
    const mapped = CAUSE_CATEGORY_TO_CATEGORY[code.toUpperCase()];
    if (mapped) out.add(mapped);
  }
  return [...out];
}

// Lowercase tag name → our category. Keep this list conservative; an
// unmapped tag becomes a raw `tag` entry on the Nonprofit record, so
// nothing is lost.
const TAG_TO_CATEGORY: Record<string, NonprofitCategory> = {
  education: "Education",
  schools: "Education",
  literacy: "Education",
  health: "Health",
  "mental-health": "Health",
  disease: "Health",
  environment: "Environment",
  conservation: "Environment",
  climate: "Environment",
  agriculture: "Environment",
  wildlife: "Animal Welfare",
  animals: "Animal Welfare",
  "animal-welfare": "Animal Welfare",
  hunger: "Hunger & Poverty",
  poverty: "Hunger & Poverty",
  food: "Hunger & Poverty",
  "human-rights": "Human Rights",
  justice: "Human Rights",
  women: "Human Rights",
  lgbtq: "Human Rights",
  arts: "Arts & Culture",
  culture: "Arts & Culture",
  museums: "Arts & Culture",
  music: "Arts & Culture",
  disasters: "Disaster Relief",
  emergencies: "Disaster Relief",
  refugees: "Disaster Relief",
  housing: "Housing",
  homelessness: "Housing",
  shelter: "Housing",
  community: "Community",
  humans: "Community",
  "human-services": "Community",
  research: "Research",
  science: "Research",
  youth: "Youth",
  children: "Youth",
};

const CAUSE_CATEGORY_TO_CATEGORY: Record<string, NonprofitCategory> = {
  EDUCATION: "Education",
  HEALTH: "Health",
  ENVIRONMENT: "Environment",
  ANIMALS: "Animal Welfare",
  POVERTY: "Hunger & Poverty",
  FOOD: "Hunger & Poverty",
  HUMAN_RIGHTS: "Human Rights",
  HUMAN_SERVICES: "Community",
  COMMUNITY: "Community",
  ARTS: "Arts & Culture",
  CULTURE: "Arts & Culture",
  ARTS_AND_CULTURE: "Arts & Culture",
  DISASTERS: "Disaster Relief",
  EMERGENCIES: "Disaster Relief",
  HOUSING: "Housing",
  RESEARCH: "Research",
  SCIENCE: "Research",
  YOUTH: "Youth",
  CHILDREN: "Youth",
};
