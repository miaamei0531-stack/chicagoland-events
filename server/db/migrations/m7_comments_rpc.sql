-- M7: Atomic increment for comment reported_count
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_reported_count(comment_id UUID)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE comments
  SET reported_count = reported_count + 1
  WHERE id = comment_id;
$$;
