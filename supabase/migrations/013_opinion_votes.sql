-- Add net_score to comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS net_score INTEGER NOT NULL DEFAULT 0;

-- Opinion votes table
CREATE TABLE IF NOT EXISTS opinion_votes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value      SMALLINT NOT NULL CHECK (value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE opinion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own opinion votes" ON opinion_votes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users read opinion votes" ON opinion_votes
  FOR SELECT USING (auth.role() = 'authenticated');
