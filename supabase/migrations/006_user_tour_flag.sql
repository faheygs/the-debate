-- Add has_seen_tour flag to users table.
-- Replaces the previous AsyncStorage-based approach, which was lost on cache
-- clears and reinstalls. Defaults to FALSE so existing rows are unaffected.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS has_seen_tour BOOLEAN NOT NULL DEFAULT FALSE;
