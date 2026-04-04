-- ============================================================
-- Chicagoland Events Map — Database Schema
-- Run this in the Supabase SQL Editor (in order)
-- ============================================================

-- Extensions (Supabase enables postgis by default; pg_trgm needs enabling)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- 1. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source / provenance
  external_id           TEXT,
  source                TEXT NOT NULL,
    -- 'eventbrite' | 'ticketmaster' | 'choosechicago' | 'ical' | 'manual' | 'community'
  is_user_submitted     BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_by_user_id  UUID,           -- FK → users.id (set after users table exists)
  submission_status     TEXT NOT NULL DEFAULT 'ingested',
    -- 'ingested' | 'pending' | 'approved' | 'rejected' | 'flagged'
  verification_score    INTEGER,
  verification_details  JSONB,
  submission_notes      TEXT,           -- admin message shown to submitter
  contact_email         TEXT,           -- submitter email; NOT shown publicly

  -- Core content
  title                 TEXT NOT NULL,
  description           TEXT,
  category              TEXT[],
  tags                  TEXT[],
  image_url             TEXT,

  -- Time
  start_datetime        TIMESTAMPTZ NOT NULL,
  end_datetime          TIMESTAMPTZ,
  is_recurring          BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule       TEXT,           -- iCal RRULE string

  -- Location
  venue_name            TEXT,
  address               TEXT,
  city                  TEXT,
  neighborhood          TEXT,
  coordinates           GEOGRAPHY(POINT, 4326) NOT NULL,

  -- Cost
  is_free               BOOLEAN,
  price_min             DECIMAL(8,2),
  price_max             DECIMAL(8,2),
  price_notes           TEXT,

  -- Links
  official_url          TEXT,
  ticket_url            TEXT,

  -- Deduplication
  content_hash          TEXT,           -- MD5(title + start_datetime + address)

  -- Meta
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (source, external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS events_coordinates_idx    ON events USING GIST (coordinates);
CREATE INDEX IF NOT EXISTS events_status_active_idx  ON events (submission_status, is_active);
CREATE INDEX IF NOT EXISTS events_submitter_idx      ON events (submitted_by_user_id);
CREATE INDEX IF NOT EXISTS events_start_idx          ON events (start_datetime);
CREATE INDEX IF NOT EXISTS events_category_idx       ON events USING GIN (category);
CREATE INDEX IF NOT EXISTS events_title_trgm_idx     ON events USING GIN (title gin_trgm_ops);


-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY,   -- matches Supabase Auth user ID exactly
  display_name      TEXT NOT NULL,
  avatar_url        TEXT,
  email             TEXT NOT NULL,
  is_admin          BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned         BOOLEAN NOT NULL DEFAULT FALSE,
  submission_count  INTEGER NOT NULL DEFAULT 0,
  approved_count    INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now that users exists, add the FK
ALTER TABLE events
  ADD CONSTRAINT fk_events_submitted_by
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
  ON DELETE SET NULL;


-- ============================================================
-- 3. COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'general',
    -- 'general' | 'looking_to_join' | 'carpool_offer' | 'carpool_request' | 'question'
  reported_count  INTEGER NOT NULL DEFAULT 0,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comments_event_idx ON comments (event_id);


-- ============================================================
-- 4. EVENT SUBMISSION LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS event_submission_log (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action                  TEXT NOT NULL,
    -- 'submitted' | 'auto_approved' | 'auto_rejected' | 'admin_approved' | 'admin_rejected' | 'flagged' | 'edited'
  actor_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  note                    TEXT,
  verification_snapshot   JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS submission_log_event_idx ON event_submission_log (event_id);


-- ============================================================
-- 5. PostGIS helper function — events within bounding box
-- Called as: SELECT * FROM events_within_bounds(north, south, east, west)
-- ============================================================
CREATE OR REPLACE FUNCTION events_within_bounds(
  p_north FLOAT,
  p_south FLOAT,
  p_east  FLOAT,
  p_west  FLOAT
)
RETURNS SETOF events
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM events
  WHERE
    ST_Within(
      coordinates::geometry,
      ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
    )
    AND submission_status IN ('ingested', 'approved')
    AND is_active = TRUE
  ORDER BY start_datetime ASC;
$$;


-- ============================================================
-- 6. Auto-update updated_at on events + comments
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
