PRAGMA foreign_keys=off;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users_new (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

INSERT INTO users_new (user_id, email, created_at)
SELECT
  user_id,
  email,
  CASE
    WHEN typeof(created_at) = 'integer' THEN created_at
    WHEN typeof(created_at) = 'text' THEN COALESCE(strftime('%s', created_at), CAST((julianday(created_at)-2440587.5)*86400 AS INTEGER))
    ELSE CAST(strftime('%s','now') AS INTEGER)
  END AS created_at_sec
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX IF NOT EXISTS idx_magic_tokens_expires_at ON magic_tokens(expires_at);

COMMIT;
PRAGMA foreign_keys=on;
