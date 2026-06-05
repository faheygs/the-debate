-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash TEXT UNIQUE NOT NULL,
  age_range TEXT NOT NULL,
  gender TEXT,
  region TEXT NOT NULL,
  region_detail TEXT,
  political_lean INTEGER,
  income_bracket TEXT,
  education_level TEXT,
  comment_strikes INTEGER DEFAULT 0,
  comment_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- polls
-- Categories: 'politics', 'culture', 'food', 'ethics', 'sports',
--             'tech', 'relationships', 'hypothetical', 'news', 'entertainment'
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  poll_type TEXT DEFAULT 'binary',
  submitted_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  upvote_count INTEGER DEFAULT 0,
  is_evergreen BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  promoted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX idx_votes_poll_id ON votes(poll_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- vote_counts (materialized, async updated)
CREATE TABLE vote_counts (
  poll_id UUID PRIMARY KEY REFERENCES polls(id),
  yes_count INTEGER DEFAULT 0,
  no_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  content TEXT NOT NULL,
  ai_decision TEXT NOT NULL,
  ai_reason TEXT,
  ai_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX idx_comments_poll_id ON comments(poll_id);

-- comment_flags
CREATE TABLE comment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) NOT NULL,
  flagged_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, flagged_by)
);

-- poll_upvotes (for pending poll promotion)
CREATE TABLE poll_upvotes (
  poll_id UUID REFERENCES polls(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(poll_id, user_id)
);

-- user_insights (AI generated, async)
CREATE TABLE user_insights (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  worldview_summary TEXT,
  contrarian_score FLOAT,
  top_categories JSONB,
  political_actual FLOAT,
  demographic_match JSONB,
  insights_data JSONB,
  last_generated_at TIMESTAMPTZ,
  vote_count_at_generation INTEGER
);
