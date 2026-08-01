-- DP-064 follow-up — add cover_image_url to nonprofits.
--
-- The directory cards and detail page show the Every.org cover image
-- as a banner; smaller orgs that lack a logo usually still have a
-- cover, so this lifts the "no branding visible" hit rate
-- significantly. Nullable because Every.org returns null for the
-- field on a non-trivial fraction of orgs; the renderers fall back to
-- a gradient surface.
--
-- Idempotent (`if not exists`) so re-running locally on a partially
-- migrated database is safe.

alter table nonprofits
  add column if not exists cover_image_url text;
