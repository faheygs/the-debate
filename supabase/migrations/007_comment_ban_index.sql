-- Phase 6: indexes to support comment moderation and ban queries

CREATE INDEX IF NOT EXISTS idx_comment_flags_comment_id
  ON comment_flags(comment_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
  ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_ai_decision
  ON comments(ai_decision);
