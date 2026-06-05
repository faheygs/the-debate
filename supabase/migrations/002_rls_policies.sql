-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Users: read/write own row only
CREATE POLICY "users read own" ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users insert own" ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users update own" ON users FOR UPDATE
  USING (auth.uid() = id);

-- Votes: insert own, no individual reads (only aggregates via vote_counts)
CREATE POLICY "users insert own votes" ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users read own votes" ON votes FOR SELECT
  USING (auth.uid() = user_id);

-- Comments: insert own, read all approved (no user_id exposed to client)
CREATE POLICY "users insert own comments" ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read approved comments" ON comments FOR SELECT
  USING (ai_decision = 'approved');
