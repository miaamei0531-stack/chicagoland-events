-- M8: Increment user submission count atomically
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_submission_count(user_id UUID)
RETURNS void LANGUAGE sql AS $$
  UPDATE users SET submission_count = submission_count + 1 WHERE id = user_id;
$$;
