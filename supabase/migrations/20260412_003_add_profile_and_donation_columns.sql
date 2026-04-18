-- DP-005: Add missing profile + donation columns for Figma port
--
-- Profiles: is_admin, show_amounts_to_friends, show_percentage_publicly, email_notifications
-- Donations: hide_from_feed
--
-- Already present (skipped): bio, avatar_url (≡ profile_photo), custom_tag, notes,
-- is_tax_deductible (≡ tax_deductible)

-- =============================================================
-- 1. Profiles — new columns
-- =============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_amounts_to_friends boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_percentage_publicly boolean NOT NULL DEFAULT false;

-- email_notifications defaults to true (opt-out model)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;

-- =============================================================
-- 2. Donations — new columns
-- =============================================================

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS hide_from_feed boolean NOT NULL DEFAULT false;
