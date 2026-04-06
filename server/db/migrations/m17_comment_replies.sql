-- M17: Add reply_to_name to comments
-- Run in Supabase SQL Editor

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS reply_to_name TEXT;
