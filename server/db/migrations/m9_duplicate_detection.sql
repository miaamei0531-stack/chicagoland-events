-- M9: Fuzzy duplicate detection using pg_trgm
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION find_duplicate_events(p_title TEXT, p_date TEXT)
RETURNS TABLE(id UUID, title TEXT, start_datetime TIMESTAMPTZ)
LANGUAGE sql STABLE
AS $$
  SELECT id, title, start_datetime
  FROM events
  WHERE
    similarity(title, p_title) > 0.6
    AND start_datetime::date = p_date::date
    AND submission_status IN ('ingested', 'approved', 'pending')
  ORDER BY similarity(title, p_title) DESC
  LIMIT 3;
$$;
