-- Add versus poll type: custom option labels for "Would you rather" style polls
ALTER TABLE polls ADD COLUMN option_a TEXT;
ALTER TABLE polls ADD COLUMN option_b TEXT;

-- Make demographic fields nullable so users can skip any onboarding question
ALTER TABLE users ALTER COLUMN age_range DROP NOT NULL;
ALTER TABLE users ALTER COLUMN region DROP NOT NULL;
