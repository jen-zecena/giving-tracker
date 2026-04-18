-- DP-006: New tables for social, gamification, notifications, and nonprofits.
-- Covers: follows, follow_requests, likes, goals, notifications, nonprofits,
-- nonprofit_flags. RLS is intentionally NOT enabled here; DP-007 adds policies.

-- =============================================================
-- 1. Enum types
-- =============================================================

CREATE TYPE follow_request_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TYPE goal_type AS ENUM ('amount', 'count', 'organizations', 'causes');

CREATE TYPE goal_timeframe AS ENUM ('month', 'year', 'ongoing');

CREATE TYPE notification_type AS ENUM (
  'like',
  'follow',
  'follow_request',
  'badge',
  'milestone',
  'pending_donation'
);

CREATE TYPE nonprofit_flag_reason AS ENUM (
  'fraud',
  'outdated',
  'duplicate',
  'inappropriate',
  'other'
);

CREATE TYPE nonprofit_flag_status AS ENUM (
  'pending',
  'reviewed',
  'resolved',
  'dismissed'
);

-- =============================================================
-- 2. follows
-- =============================================================

CREATE TABLE follows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- =============================================================
-- 3. follow_requests
-- =============================================================

CREATE TABLE follow_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        follow_request_status NOT NULL DEFAULT 'pending',
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (from_user_id, to_user_id),
  CHECK (from_user_id <> to_user_id)
);

CREATE INDEX idx_follow_requests_to_user ON follow_requests(to_user_id, status);

-- =============================================================
-- 4. likes
-- =============================================================

CREATE TABLE likes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donation_id       uuid NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  donation_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, donation_id)
);

CREATE INDEX idx_likes_donation_id ON likes(donation_id);
CREATE INDEX idx_likes_donation_user ON likes(donation_user_id);

-- =============================================================
-- 5. goals
-- =============================================================

CREATE TABLE goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  type         goal_type NOT NULL,
  target       numeric(12,2) NOT NULL CHECK (target > 0),
  current      numeric(12,2) NOT NULL DEFAULT 0 CHECK (current >= 0),
  timeframe    goal_timeframe NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);

-- =============================================================
-- 6. notifications
-- =============================================================

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       text NOT NULL,
  message     text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  action_url  text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_read_date
  ON notifications(user_id, read, created_at DESC);

-- =============================================================
-- 7. nonprofits
-- =============================================================

CREATE TABLE nonprofits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ein           text NOT NULL UNIQUE,
  name          text NOT NULL,
  mission       text,
  category      text[] NOT NULL DEFAULT '{}',
  location      text,
  website       text,
  donation_url  text,
  verified      boolean NOT NULL DEFAULT false,
  logo_url      text,
  description   text,
  founded       integer,
  size          text,
  revenue       numeric(14,2),
  tags          text[] NOT NULL DEFAULT '{}',
  synced_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nonprofits_name ON nonprofits(name);
CREATE INDEX idx_nonprofits_category ON nonprofits USING GIN (category);
CREATE INDEX idx_nonprofits_tags ON nonprofits USING GIN (tags);

-- =============================================================
-- 8. nonprofit_flags
-- =============================================================

CREATE TABLE nonprofit_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonprofit_id  uuid NOT NULL REFERENCES nonprofits(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason        nonprofit_flag_reason NOT NULL,
  description   text,
  status        nonprofit_flag_status NOT NULL DEFAULT 'pending',
  admin_notes   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nonprofit_flags_status ON nonprofit_flags(status);
CREATE INDEX idx_nonprofit_flags_nonprofit ON nonprofit_flags(nonprofit_id);

-- =============================================================
-- 9. Extra donations index required by feed queries
-- =============================================================

CREATE INDEX idx_donations_user_date_desc
  ON donations(user_id, donation_date DESC);
