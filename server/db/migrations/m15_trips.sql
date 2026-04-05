-- M15: Day Trip Planner
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS trips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'My Day Trip',
  date       DATE NOT NULL,
  is_public  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_events (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id  UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  note     TEXT,
  UNIQUE (trip_id, event_id)
);

CREATE INDEX ON trips (user_id);
CREATE INDEX ON trip_events (trip_id, position);
