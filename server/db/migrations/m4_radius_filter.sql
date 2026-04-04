-- M4: Add radius filter function
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION events_within_radius(
  p_lat      FLOAT,
  p_lng      FLOAT,
  p_radius_km FLOAT
)
RETURNS SETOF events
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM events
  WHERE
    ST_DWithin(
      coordinates,
      ST_MakePoint(p_lng, p_lat)::geography,
      p_radius_km * 1000  -- convert km to meters
    )
    AND submission_status IN ('ingested', 'approved')
    AND is_active = TRUE
  ORDER BY
    ST_Distance(coordinates, ST_MakePoint(p_lng, p_lat)::geography) ASC;
$$;
