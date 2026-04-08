-- M18: User Preference System
-- Run in Supabase SQL Editor

-- Add preference and location columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS home_location GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS home_address TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- Add is_outdoor to events (used by weather + data quality agent)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS is_outdoor BOOLEAN;

-- Create saved_itineraries table for Plan a Day feature
CREATE TABLE IF NOT EXISTS saved_itineraries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  title         TEXT,
  itinerary_data JSONB NOT NULL,
  event_ids     UUID[],
  is_public     BOOLEAN DEFAULT FALSE,
  share_token   TEXT UNIQUE,
  reminder_time TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_itineraries_user_id ON saved_itineraries (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_itineraries_share_token ON saved_itineraries (share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_is_outdoor ON events (is_outdoor) WHERE is_outdoor IS NOT NULL;
