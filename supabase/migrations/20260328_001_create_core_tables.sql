-- TASK-006: Core database tables for Giving Tracker
-- Creates: profiles, donations, recurring_schedules, privacy_overrides
-- Plus enum types, indexes, FK constraints, and auto-profile trigger

-- =============================================================
-- 1. Enum types
-- =============================================================

CREATE TYPE privacy_tier AS ENUM ('private', 'friends_only', 'open_giver');

CREATE TYPE donation_scope AS ENUM ('local', 'national', 'global');

CREATE TYPE donation_status AS ENUM ('confirmed', 'pending', 'skipped');

CREATE TYPE recurring_frequency AS ENUM ('weekly', 'monthly', 'quarterly', 'annually');

CREATE TYPE cause_tag AS ENUM (
  'education',
  'health',
  'environment',
  'poverty',
  'animal_welfare',
  'arts_culture',
  'disaster_relief',
  'human_rights',
  'community',
  'religious'
);

-- =============================================================
-- 2. Profiles table
-- =============================================================

CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  bio             text,
  avatar_url      text,
  salary_encrypted bytea,           -- encrypted via pgcrypto (see TASK-008)
  salary_range    text,             -- optional human-readable range
  privacy_tier    privacy_tier NOT NULL DEFAULT 'private',
  salary_updated_at timestamptz,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 3. Donations table
-- =============================================================

CREATE TABLE donations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name     text NOT NULL,
  amount                numeric(12,2) NOT NULL CHECK (amount > 0),
  currency              text NOT NULL DEFAULT 'USD',
  donation_date         date NOT NULL DEFAULT CURRENT_DATE,
  scope                 donation_scope NOT NULL,
  cause_tag             cause_tag,
  custom_tag            text,
  notes                 text,
  is_tax_deductible     boolean NOT NULL DEFAULT false,
  is_recurring          boolean NOT NULL DEFAULT false,
  recurring_schedule_id uuid,        -- FK added after recurring_schedules is created
  status                donation_status NOT NULL DEFAULT 'confirmed',
  is_private_override   boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_donation_date ON donations(donation_date);
CREATE INDEX idx_donations_user_date ON donations(user_id, donation_date);
CREATE INDEX idx_donations_status ON donations(user_id, status);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 4. Recurring schedules table
-- =============================================================

CREATE TABLE recurring_schedules (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name         text NOT NULL,
  amount                    numeric(12,2) NOT NULL CHECK (amount > 0),
  currency                  text NOT NULL DEFAULT 'USD',
  frequency                 recurring_frequency NOT NULL,
  cause_tag                 cause_tag,
  custom_tag                text,
  scope                     donation_scope NOT NULL,
  next_due_date             date NOT NULL,
  is_active                 boolean NOT NULL DEFAULT true,
  is_auto_confirm           boolean NOT NULL DEFAULT false,
  consecutive_confirmations integer NOT NULL DEFAULT 0,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_schedules_user_id ON recurring_schedules(user_id);
CREATE INDEX idx_recurring_schedules_next_due ON recurring_schedules(next_due_date)
  WHERE is_active = true;

ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules FORCE ROW LEVEL SECURITY;

-- Now add the FK from donations to recurring_schedules
ALTER TABLE donations
  ADD CONSTRAINT fk_donations_recurring_schedule
  FOREIGN KEY (recurring_schedule_id)
  REFERENCES recurring_schedules(id)
  ON DELETE SET NULL;

-- =============================================================
-- 5. Privacy overrides table
-- =============================================================

CREATE TABLE privacy_overrides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name  text NOT NULL,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, field_name)
);

CREATE INDEX idx_privacy_overrides_user_id ON privacy_overrides(user_id);

ALTER TABLE privacy_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_overrides FORCE ROW LEVEL SECURITY;

-- =============================================================
-- 6. Auto-create profile on new auth.user signup
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 7. Auto-update updated_at timestamps
-- =============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_donations
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at_recurring_schedules
  BEFORE UPDATE ON recurring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =============================================================
-- 8. Row Level Security policies
-- =============================================================

-- Profiles: users can read/update their own profile
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- Donations: users can CRUD their own donations
CREATE POLICY donations_select ON donations
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY donations_insert ON donations
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY donations_update ON donations
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY donations_delete ON donations
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Recurring schedules: users can CRUD their own schedules
CREATE POLICY recurring_schedules_select ON recurring_schedules
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY recurring_schedules_insert ON recurring_schedules
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY recurring_schedules_update ON recurring_schedules
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY recurring_schedules_delete ON recurring_schedules
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Privacy overrides: users can CRUD their own overrides
CREATE POLICY privacy_overrides_select ON privacy_overrides
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY privacy_overrides_insert ON privacy_overrides
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY privacy_overrides_update ON privacy_overrides
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY privacy_overrides_delete ON privacy_overrides
  FOR DELETE USING ((select auth.uid()) = user_id);
