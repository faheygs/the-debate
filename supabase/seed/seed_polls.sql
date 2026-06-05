-- Seed polls: 50 starter polls across all categories
-- Seed polls use 30-day expiry (not 48h) so they remain live during development.
-- Production polls submitted by users use the standard 48h expiry.

INSERT INTO polls (question, category, poll_type, option_a, option_b, status, is_evergreen, expires_at, promoted_at)
VALUES

-- ── POLITICS (10) ──────────────────────────────────────────────────────────
('Should the voting age be lowered to 16?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is universal basic income a good idea?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should college education be free?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should the Electoral College be abolished?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is capitalism the best economic system?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should there be term limits for Supreme Court justices?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should recreational marijuana be federally legal?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is the two-party system broken?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should the US have stricter gun laws?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should social media companies be regulated like utilities?',
 'politics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

-- ── CULTURE (10) ───────────────────────────────────────────────────────────
('Is pineapple acceptable on pizza?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is a hot dog a sandwich?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should tipping culture be abolished?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is remote work better than office work?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should phones be banned in schools?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is social media doing more harm than good?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should there be a 4-day work week?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is the internet better or worse than 20 years ago?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should violent video games be restricted?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is cancel culture a real problem?',
 'culture', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

-- ── ETHICS (10) ────────────────────────────────────────────────────────────
('Is it ever okay to lie to protect someone''s feelings?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should euthanasia be legal?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is eating meat ethical?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should wealthy people be required to give to charity?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is it ethical to have children in today''s world?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should there be a maximum wage?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is privacy more important than security?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should organ donation be opt-out rather than opt-in?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is graffiti art or vandalism?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should AI art be treated the same as human art?',
 'ethics', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

-- ── RELATIONSHIPS (10) ─────────────────────────────────────────────────────
('Is it ever okay to snoop through a partner''s phone?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should couples combine finances?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is jealousy a normal part of relationships?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should you tell a friend their partner is cheating?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is it okay to be friends with an ex?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should couples go to bed angry?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is social media bad for relationships?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should religion play a role in marriage?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Is it okay to keep secrets from your partner?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

('Should parents read their teenager''s texts?',
 'relationships', 'binary', NULL, NULL, 'live', false, NOW() + INTERVAL '30 days', NOW()),

-- ── HYPOTHETICAL (10) — evergreen, no expiry ───────────────────────────────
-- "Would you rather" polls use versus type with custom option labels.
-- Others use binary (agree = yes, disagree = no).

('Would you rather know when you die or how you die?',
 'hypothetical', 'versus', 'Know when I die', 'Know how I die', 'live', true, NULL, NOW()),

('If you could live forever, would you?',
 'hypothetical', 'binary', NULL, NULL, 'live', true, NULL, NOW()),

('Would you take a pill that eliminated the need for sleep?',
 'hypothetical', 'binary', NULL, NULL, 'live', true, NULL, NOW()),

('If you could be famous, would you want to be?',
 'hypothetical', 'binary', NULL, NULL, 'live', true, NULL, NOW()),

('Would you rather be the smartest or the happiest person alive?',
 'hypothetical', 'versus', 'Be the smartest', 'Be the happiest', 'live', true, NULL, NOW()),

('If you could know any one truth, what would you choose?',
 'hypothetical', 'binary', NULL, NULL, 'live', true, NULL, NOW()),

('Would you rather have more money or more time?',
 'hypothetical', 'versus', 'More money', 'More time', 'live', true, NULL, NOW()),

('If AI becomes conscious, should it have rights?',
 'hypothetical', 'binary', NULL, NULL, 'live', true, NULL, NOW()),

('Would you choose a guaranteed $1M today or a chance at $100M?',
 'hypothetical', 'versus', 'Guaranteed $1M', 'Chance at $100M', 'live', true, NULL, NOW()),

('Would you give up 5 years of your life to be perfectly healthy forever?',
 'hypothetical', 'binary', NULL, NULL, 'live', true, NULL, NOW());
