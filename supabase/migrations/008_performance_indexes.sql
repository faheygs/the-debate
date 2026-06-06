-- Performance indexes for feed, poll detail, and vote queries
CREATE INDEX IF NOT EXISTS idx_polls_status_promoted ON polls(status, promoted_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_user_polls ON votes(user_id, poll_id);
CREATE INDEX IF NOT EXISTS idx_comments_poll_decision ON comments(poll_id, ai_decision);
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
