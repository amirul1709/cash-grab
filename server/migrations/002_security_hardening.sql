-- Token-family tracking for refresh-token reuse detection.
-- A "family" is a chain of refresh tokens issued from a single login.
-- When a token that was already redeemed (used_at IS NOT NULL) is presented
-- again, we assume token theft and delete every token in that family,
-- forcing the user to log in again.

-- gen_random_uuid() lives in pgcrypto on Postgres < 13; harmless on newer versions.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS family_id UUID,
  ADD COLUMN IF NOT EXISTS used_at   TIMESTAMPTZ;

-- Backfill: existing rows each become their own one-token family.
UPDATE refresh_tokens
SET family_id = gen_random_uuid()
WHERE family_id IS NULL;

ALTER TABLE refresh_tokens
  ALTER COLUMN family_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
