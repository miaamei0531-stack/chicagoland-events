-- M6: Add updated_at to users table
-- Run in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
