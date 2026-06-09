-- Phase 9: Full-text search index on polls.question (live only)
CREATE INDEX IF NOT EXISTS idx_polls_fts_live
  ON polls USING gin(to_tsvector('english', question))
  WHERE status = 'live';
