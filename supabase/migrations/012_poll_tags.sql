-- Migration 012: Poll tags for granular filtering
-- Run: supabase db push

CREATE TABLE IF NOT EXISTS poll_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_tags_poll_id ON poll_tags(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_tags_tag ON poll_tags(tag);

GRANT SELECT, INSERT ON public.poll_tags TO authenticated;
GRANT SELECT, INSERT ON public.poll_tags TO service_role;

-- ── Seed tags for existing polls ──────────────────────────────────────────────

-- Politics
INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('voting'),('democracy'),('youth'),('politics')) AS t(tag)
WHERE p.question = 'Should the voting age be lowered to 16?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('ubi'),('economy'),('poverty'),('politics')) AS t(tag)
WHERE p.question = 'Is universal basic income a good idea?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('education'),('college'),('debt'),('politics')) AS t(tag)
WHERE p.question = 'Should college education be free?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('electoral-college'),('elections'),('democracy'),('politics')) AS t(tag)
WHERE p.question = 'Should the Electoral College be abolished?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('capitalism'),('economy'),('politics')) AS t(tag)
WHERE p.question = 'Is capitalism the best economic system?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('supreme-court'),('term-limits'),('law'),('politics')) AS t(tag)
WHERE p.question = 'Should there be term limits for Supreme Court justices?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('marijuana'),('drugs'),('legalization'),('politics')) AS t(tag)
WHERE p.question = 'Should recreational marijuana be federally legal?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('two-party'),('democracy'),('elections'),('politics')) AS t(tag)
WHERE p.question = 'Is the two-party system broken?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('guns'),('gun-control'),('safety'),('politics')) AS t(tag)
WHERE p.question = 'Should the US have stricter gun laws?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('social-media'),('tech'),('regulation'),('politics')) AS t(tag)
WHERE p.question = 'Should social media companies be regulated like utilities?';

-- Culture
INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('food'),('pizza'),('controversial')) AS t(tag)
WHERE p.question = 'Is pineapple acceptable on pizza?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('food'),('hotdog'),('sandwich'),('controversial')) AS t(tag)
WHERE p.question = 'Is a hot dog a sandwich?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('tipping'),('money'),('culture'),('work')) AS t(tag)
WHERE p.question = 'Should tipping culture be abolished?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('remote-work'),('work'),('productivity'),('culture')) AS t(tag)
WHERE p.question = 'Is remote work better than office work?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('phones'),('schools'),('kids'),('education')) AS t(tag)
WHERE p.question = 'Should phones be banned in schools?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('social-media'),('mental-health'),('culture'),('tech')) AS t(tag)
WHERE p.question = 'Is social media doing more harm than good?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('work-week'),('work'),('productivity'),('culture')) AS t(tag)
WHERE p.question = 'Should there be a 4-day work week?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('internet'),('tech'),('culture')) AS t(tag)
WHERE p.question = 'Is the internet better or worse than 20 years ago?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('video-games'),('violence'),('censorship'),('culture')) AS t(tag)
WHERE p.question = 'Should violent video games be restricted?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('cancel-culture'),('free-speech'),('culture')) AS t(tag)
WHERE p.question = 'Is cancel culture a real problem?';

-- Ethics
INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('honesty'),('lying'),('ethics'),('relationships')) AS t(tag)
WHERE p.question = 'Is it ever okay to lie to protect someone''s feelings?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('euthanasia'),('death'),('ethics'),('law')) AS t(tag)
WHERE p.question = 'Should euthanasia be legal?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('veganism'),('meat'),('animal-rights'),('ethics')) AS t(tag)
WHERE p.question = 'Is eating meat ethical?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('charity'),('wealth'),('inequality'),('ethics')) AS t(tag)
WHERE p.question = 'Should wealthy people be required to give to charity?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('kids'),('parenting'),('climate'),('ethics')) AS t(tag)
WHERE p.question = 'Is it ethical to have children in today''s world?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('wealth'),('maximum-wage'),('inequality'),('ethics')) AS t(tag)
WHERE p.question = 'Should there be a maximum wage?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('privacy'),('security'),('surveillance'),('ethics')) AS t(tag)
WHERE p.question = 'Is privacy more important than security?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('organ-donation'),('health'),('ethics'),('law')) AS t(tag)
WHERE p.question = 'Should organ donation be opt-out rather than opt-in?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('art'),('graffiti'),('culture'),('ethics')) AS t(tag)
WHERE p.question = 'Is graffiti art or vandalism?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('ai'),('art'),('creativity'),('ethics')) AS t(tag)
WHERE p.question = 'Should AI art be treated the same as human art?';

-- Relationships
INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('privacy'),('trust'),('relationships')) AS t(tag)
WHERE p.question = 'Is it ever okay to snoop through a partner''s phone?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('money'),('finances'),('relationships')) AS t(tag)
WHERE p.question = 'Should couples combine finances?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('jealousy'),('relationships'),('emotions')) AS t(tag)
WHERE p.question = 'Is jealousy a normal part of relationships?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('cheating'),('loyalty'),('friends'),('relationships')) AS t(tag)
WHERE p.question = 'Should you tell a friend their partner is cheating?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('exes'),('friendship'),('relationships')) AS t(tag)
WHERE p.question = 'Is it okay to be friends with an ex?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('arguments'),('conflict'),('relationships')) AS t(tag)
WHERE p.question = 'Should couples go to bed angry?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('social-media'),('relationships'),('dating')) AS t(tag)
WHERE p.question = 'Is social media bad for relationships?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('religion'),('marriage'),('relationships')) AS t(tag)
WHERE p.question = 'Should religion play a role in marriage?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('secrets'),('honesty'),('relationships')) AS t(tag)
WHERE p.question = 'Is it okay to keep secrets from your partner?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('parenting'),('teens'),('privacy'),('relationships')) AS t(tag)
WHERE p.question = 'Should parents read their teenager''s texts?';

-- Hypothetical
INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('death'),('mortality'),('hypothetical')) AS t(tag)
WHERE p.question = 'Would you rather know when you die or how you die?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('immortality'),('life'),('hypothetical')) AS t(tag)
WHERE p.question = 'If you could live forever, would you?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('sleep'),('productivity'),('health'),('hypothetical')) AS t(tag)
WHERE p.question = 'Would you take a pill that eliminated the need for sleep?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('fame'),('celebrity'),('hypothetical')) AS t(tag)
WHERE p.question = 'If you could be famous, would you want to be?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('intelligence'),('happiness'),('hypothetical')) AS t(tag)
WHERE p.question = 'Would you rather be the smartest or the happiest person alive?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('money'),('time'),('hypothetical')) AS t(tag)
WHERE p.question = 'Would you rather have more money or more time?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('ai'),('consciousness'),('rights'),('hypothetical')) AS t(tag)
WHERE p.question = 'If AI becomes conscious, should it have rights?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('money'),('gambling'),('risk'),('hypothetical')) AS t(tag)
WHERE p.question = 'Would you choose a guaranteed $1M today or a chance at $100M?';

INSERT INTO poll_tags (poll_id, tag)
SELECT p.id, t.tag FROM polls p
CROSS JOIN (VALUES ('health'),('longevity'),('hypothetical')) AS t(tag)
WHERE p.question = 'Would you give up 5 years of your life to be perfectly healthy forever?';
