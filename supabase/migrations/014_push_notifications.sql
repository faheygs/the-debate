-- Add push notification token storage
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Index for batch lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_users_expo_push_token
  ON users(expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- Grant update access for authenticated users to update their own token
-- (RLS policy: users can only update their own row, already enforced by existing policies)
