-- Fundraiser links + donation→nonprofit connection
--
-- 1. donations.fundraiser_url — optional link to the fundraiser the gift
--    went to (GoFundMe, JustGiving, …). Any https URL; checked here as a
--    belt against clients bypassing the app-layer validation.
-- 2. donations.nonprofit_id — optional link into the Every.org-synced
--    nonprofits directory so surfaces (feed, profile) can show rich org
--    info (logo, mission, verified). Set automatically at save time when
--    the organization name unambiguously matches a directory org;
--    nullable because free-text orgs and fundraisers have no directory
--    entry. ON DELETE SET NULL: a directory removal must never delete or
--    block a member's donation history.
--
-- RLS: both columns ride on the existing donations row policies; no
-- policy changes needed.

ALTER TABLE donations
  ADD COLUMN fundraiser_url text,
  ADD COLUMN nonprofit_id uuid REFERENCES nonprofits(id) ON DELETE SET NULL;

ALTER TABLE donations
  ADD CONSTRAINT donations_fundraiser_url_https
  CHECK (
    fundraiser_url IS NULL
    OR (fundraiser_url ~* '^https://' AND length(fundraiser_url) <= 2048)
  );

-- Feed/profile enrichment fans out over nonprofit_id; partial index keeps
-- it cheap without bloating the (mostly-null) column.
CREATE INDEX idx_donations_nonprofit
  ON donations(nonprofit_id)
  WHERE nonprofit_id IS NOT NULL;

COMMENT ON COLUMN donations.fundraiser_url IS
  'Optional https link to the fundraiser page (GoFundMe etc.) this gift went to.';
COMMENT ON COLUMN donations.nonprofit_id IS
  'Optional link to the synced nonprofits directory entry matched by organization name at save time.';
