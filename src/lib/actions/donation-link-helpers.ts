/**
 * Pure helpers for the fundraiser-link and donation→nonprofit features.
 * Kept side-effect free so they are unit-testable without Supabase.
 */

const MAX_URL_LENGTH = 2048;

export type FundraiserUrlResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

/**
 * Normalizes and validates an optional fundraiser link.
 *
 *  - empty / whitespace input → ok with null (field is optional)
 *  - must parse as a URL with an https: scheme (mirrors the DB CHECK)
 *  - a bare "www.gofundme.com/f/…" gets https:// prepended rather than
 *    rejected — people paste links without the scheme constantly
 */
export function validateFundraiserUrl(input: string | undefined | null): FundraiserUrlResult {
  const trimmed = input?.trim() ?? "";
  if (trimmed === "") return { ok: true, url: null };

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  if (candidate.length > MAX_URL_LENGTH) {
    return { ok: false, error: "Fundraiser link is too long." };
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "Fundraiser link must be a valid URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Fundraiser link must start with https://." };
  }
  if (!parsed.hostname.includes(".")) {
    return { ok: false, error: "Fundraiser link must be a valid URL." };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * Given the rows a case-insensitive name lookup returned, decide which
 * nonprofit (if any) a donation should link to. Only an unambiguous
 * single match links — two "Community Foundation"s means we link neither
 * rather than guess.
 */
export function resolveNonprofitMatch(
  rows: ReadonlyArray<{ id: string }>
): string | null {
  return rows.length === 1 ? rows[0].id : null;
}
