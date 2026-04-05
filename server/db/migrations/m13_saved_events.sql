-- M13: Saved events (collections)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS saved_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX ON saved_events (user_id);
CREATE INDEX ON saved_events (event_id);
