-- Additional indexes for performance
-- (votes indexes are in 001_initial_schema.sql)

CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_category ON polls(category);
CREATE INDEX idx_polls_expires_at ON polls(expires_at) WHERE status = 'live';
CREATE INDEX idx_polls_created_at ON polls(created_at);
